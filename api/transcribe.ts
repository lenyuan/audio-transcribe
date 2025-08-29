import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Self-contained type definition for the API response.
interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  transcript: string;
}

// Function to set CORS headers
const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(204).end();
    }
    setCorsHeaders(res);

    if (req.method !== 'POST') {
        console.log(`[transcribe] Method Not Allowed: Received ${req.method}`);
        return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("[transcribe] CRITICAL: API_KEY environment variable is not set.");
        return res.status(500).json({ error: "Server configuration error: API_KEY is missing." });
    }

    console.time('[transcribe] Total execution time');

    try {
        const { blobUrl } = req.body;
        if (!blobUrl) {
            console.log("[transcribe] Bad Request: blobUrl is missing from the request body.");
            return res.status(400).json({ error: 'blobUrl is required in the request body.' });
        }
        
        console.log(`[transcribe] Starting transcription for blob URL: ${blobUrl}`);
        
        console.time('[transcribe] Blob download time');
        const audioResponse = await fetch(blobUrl);
        if (!audioResponse.ok) {
            const errorText = await audioResponse.text();
            console.error(`[transcribe] Failed to download file from blob. Status: ${audioResponse.status}, Body: ${errorText}`);
            throw new Error(`Failed to download file from blob storage. Status: ${audioResponse.status}`);
        }
        const fileBuffer = Buffer.from(await audioResponse.arrayBuffer());
        console.timeEnd('[transcribe] Blob download time');
        
        const mimeType = audioResponse.headers.get('content-type') || 'audio/m4a';
        console.log(`[transcribe] Audio file downloaded. Size: ${fileBuffer.length} bytes, MIME type: ${mimeType}`);

        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert audio transcription service. For each distinct speaker, assign a label like 'Speaker 1', 'Speaker 2', etc. Provide a precise timestamp in the format MM:SS for the beginning of each speech segment. Ensure the final output strictly adheres to the provided JSON schema. If the audio is silent or contains no discernible speech, return an empty array.`;
        const userPrompt = "Transcribe the following audio file.";
        const schema = {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, timestamp: { type: Type.STRING }, transcript: { type: Type.STRING } }, required: ["speaker", "timestamp", "transcript"] }
        };

        const base64Audio = fileBuffer.toString('base64');
        const audioPart = { inlineData: { mimeType, data: base64Audio } };
        const textPart = { text: userPrompt };

        console.log('[transcribe] Sending request to Gemini API...');
        console.time('[transcribe] Gemini transcription time');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
        });
        console.timeEnd('[transcribe] Gemini transcription time');

        const jsonText = response.text.trim();
        if (!jsonText) {
          console.warn("[transcribe] Gemini API returned an empty response.");
          throw new Error("Received an empty response from the transcription service.");
        }
        
        console.log("[transcribe] Received response from Gemini. Parsing JSON.");
        const parsedJson = JSON.parse(jsonText) as TranscriptSegment[];
        
        if (!parsedJson) {
           console.warn("[transcribe] Transcription result was null after parsing.");
           throw new Error("Transcription failed to produce a valid result.");
        }
        
        console.log(`[transcribe] Transcription successful. Found ${parsedJson.length} segments.`);
        console.timeEnd('[transcribe] Total execution time');
        return res.status(200).json(parsedJson);

    } catch (error) {
        console.timeEnd('[transcribe] Total execution time');
        console.error("[transcribe] An error occurred in the handler:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: "Failed to transcribe audio.", details: errorMessage });
    }
}
