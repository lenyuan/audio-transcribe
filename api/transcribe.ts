import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptSegment } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 300,
};

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

    console.time('totalRequestTime');

    try {
        const { blobUrl } = req.body;
        if (!blobUrl) {
            return res.status(400).json({ error: 'blobUrl is required.' });
        }
        
        console.log(`Fetching audio from blob URL: ${blobUrl}`);
        console.time('blobDownloadTime');
        const audioResponse = await fetch(blobUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to download file from blob storage. Status: ${audioResponse.status}`);
        }
        const fileBuffer = Buffer.from(await audioResponse.arrayBuffer());
        console.timeEnd('blobDownloadTime');
        
        const mimeType = audioResponse.headers.get('content-type') || 'audio/m4a';

        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert audio transcription service. For each distinct speaker, assign a label like 'Speaker 1', 'Speaker 2', etc. Provide a precise timestamp in the format MM:SS for the beginning of each speech segment. Ensure the final output strictly adheres to the provided JSON schema. If the audio is silent or contains no discernible speech, return an empty array.`;
        const userPrompt = "Transcribe the following audio file.";
        const schema = {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, timestamp: { type: Type.STRING }, transcript: { type: Type.STRING } }, required: ["speaker", "timestamp", "transcript"] }
        };

        const base64Audio = fileBuffer.toString('base64');
        const audioPart = {
            inlineData: { mimeType, data: base64Audio },
        };
        const textPart = { text: userPrompt };

        console.time('geminiTranscriptionTime');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
        });
        console.timeEnd('geminiTranscriptionTime');

        const jsonText = response.text?.trim();
        if (!jsonText) {
          throw new Error("Received an empty response from the transcription service.");
        }
        const parsedJson = JSON.parse(jsonText) as TranscriptSegment[];

        if (!parsedJson || (Array.isArray(parsedJson) && parsedJson.length === 0)) {
           throw new Error("Transcription successful, but the audio appears to be silent or contains no discernible speech.");
        }
        
        console.timeEnd('totalRequestTime');
        return res.status(200).json(parsedJson);

    } catch (error) {
        console.timeEnd('totalRequestTime');
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: "Failed to transcribe audio.", details: errorMessage });
    }
}