import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptSegment } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
  runtime: 'nodejs',
};

const MAX_INLINE_MB = 100;
const MAX_INLINE_BYTES = MAX_INLINE_MB * 1024 * 1024;

const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(204).end();
    }
    setCorsHeaders(res);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API_KEY environment variable is not set." });
    }

    try {
        const form = formidable({ 
            multiples: false, 
            maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
            keepExtensions: true,
        });

        const files = await new Promise<formidable.Files>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });

        const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!uploadedFile) {
            return res.status(400).json({ error: 'No file provided in the request.' });
        }

        const filePath = uploadedFile.filepath;
        const mimeType = uploadedFile.mimetype || 'audio/m4a';
        const fileSizeBytes = uploadedFile.size;

        if (!filePath || !fileSizeBytes) {
            return res.status(400).json({ error: 'File path or size is missing after upload.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        // FIX: Refactored prompt to use systemInstruction and a separate user prompt for better practice.
        const systemInstruction = `You are an expert audio transcription service.
      For each distinct speaker, assign a label like 'Speaker 1', 'Speaker 2', etc.
      Provide a precise timestamp in the format MM:SS for the beginning of each speech segment.
      Ensure the final output strictly adheres to the provided JSON schema.
      If the audio is silent or contains no discernible speech, return an empty array.`;

        const userPrompt = "Transcribe the following audio file.";

        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    transcript: { type: Type.STRING }
                },
                required: ["speaker", "timestamp", "transcript"]
            }
        };

        const genAIConfig = {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: schema,
        };
        
        let response;
        
        if (fileSizeBytes < MAX_INLINE_BYTES) {
            // Small file path (< 100MB): use inlineData
            const fileBuffer = fs.readFileSync(filePath);
            const base64Audio = fileBuffer.toString('base64');
            const audioPart = {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Audio,
                },
            };
            const textPart = { text: userPrompt };

            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [audioPart, textPart] },
                config: genAIConfig,
            });
        } else {
            // Large file path (>= 100MB): use Files API
            console.log(`Uploading large file (${(fileSizeBytes / (1024*1024)).toFixed(2)} MB) to Gemini Files API...`);
            
            // FIX: Moved `displayName` into the `config` object to match `UploadFileParameters` type.
            const uploadResult = await ai.files.upload({
                file: filePath,
                config: {
                    mimeType: mimeType,
                    displayName: path.basename(filePath),
                },
            });

            if (!uploadResult?.uri) {
                throw new Error("File upload to Gemini API failed: No URI returned.");
            }
            
            console.log(`File uploaded. URI: ${uploadResult.uri}. Transcribing...`);
            
            const audioPart = {
                fileData: {
                    mimeType: mimeType,
                    fileUri: uploadResult.uri,
                },
            };
            const textPart = { text: userPrompt };

            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [audioPart, textPart] },
                config: genAIConfig,
            });
        }
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText) as TranscriptSegment[];

        if (!parsedJson || (Array.isArray(parsedJson) && parsedJson.length === 0)) {
           throw new Error("Transcription successful, but the audio appears to be silent or contains no discernible speech.");
        }
        
        return res.status(200).json(parsedJson);

    } catch (error) {
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: "Failed to transcribe audio.", details: errorMessage });
    }
}