import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptSegment } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    maxDuration: 60,
    runtime: 'nodejs',
};

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};


export default async (req: VercelRequest, res: VercelResponse) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(204).end();
    }
    setCorsHeaders(res);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { fileUrl } = req.body;
    if (!fileUrl) {
        return res.status(400).json({ error: 'Missing fileUrl in request body' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API_KEY environment variable is not set." });
    }

    try {
        // Step 1: Pre-emptive size check to avoid timeouts.
        const headResponse = await fetch(fileUrl, { method: 'HEAD' });
        if (!headResponse.ok) {
            throw new Error(`Failed to get file metadata: ${headResponse.statusText}`);
        }
        
        const contentLength = headResponse.headers.get('content-length');
        if (!contentLength || parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
             return res.status(413).json({ 
                error: 'File is too large to process.', 
                details: `The file size exceeds the server limit of ${MAX_FILE_SIZE_MB}MB.` 
            });
        }
        
        // Step 2: Fetch the audio file from the Vercel Blob URL.
        const audioResponse = await fetch(fileUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to download audio file from storage: ${audioResponse.statusText}`);
        }

        // Step 3: Convert the audio file to a Base64 string.
        const audioArrayBuffer = await audioResponse.arrayBuffer();
        const audioBase64 = arrayBufferToBase64(audioArrayBuffer);
        
        // Step 4: Send the Base64 data to Gemini using `inlineData`.
        const ai = new GoogleGenAI({ apiKey });
        const audioPart = {
            inlineData: {
                mimeType: 'audio/m4a',
                data: audioBase64
            }
        };

        const textPart = {
            text: `You are an expert audio transcription service.
      Transcribe the following audio file.
      For each distinct speaker, assign a label like 'Speaker 1', 'Speaker 2', etc.
      Provide a precise timestamp in the format MM:SS for the beginning of each speech segment.
      Ensure the final output strictly adheres to the provided JSON schema.
      If the audio is silent or contains no discernible speech, return an empty array.`,
        };

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

        // Step 5: Call Gemini API.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText) as TranscriptSegment[];
        
        return res.status(200).json(parsedJson);

    } catch (error) {
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: "Failed to transcribe audio.", details: errorMessage });
    }
};