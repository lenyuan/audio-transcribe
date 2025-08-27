import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptSegment } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    maxDuration: 60,
    runtime: 'nodejs',
};

const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
        // Step 1: Download the audio file from the provided URL (from Vercel Blob)
        const audioResponse = await fetch(fileUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to download audio file from blob storage. Status: ${audioResponse.statusText}`);
        }
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        const base64Audio = audioBuffer.toString('base64');
        const mimeType = audioResponse.headers.get('content-type') || 'audio/m4a';

        // Step 2: Call the Gemini API with the file data
        const ai = new GoogleGenAI({ apiKey });
        const audioPart = { inlineData: { mimeType, data: base64Audio } };
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