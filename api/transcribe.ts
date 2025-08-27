import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptSegment } from '../types';

// This is a serverless function that acts as a secure proxy to the Gemini API.
// It's designed to be deployed on platforms like Vercel or Netlify.

// Helper to configure the response headers for CORS
const setCorsHeaders = (response: Response) => {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
};

export default async (req: Request) => {
  // Handle preflight CORS request
  if (req.method === 'OPTIONS') {
    return setCorsHeaders(new Response(null, { status: 204 }));
  }
  
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return setCorsHeaders(new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    ));
  }
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      return setCorsHeaders(new Response(
          JSON.stringify({ error: "API_KEY environment variable is not set." }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return setCorsHeaders(new Response(
        JSON.stringify({ error: 'No file provided in the request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Convert file to Base64
    const buffer = await file.arrayBuffer();
    // FIX: The `Buffer` object is a Node.js API and is not available in all serverless runtimes (e.g., Vercel Edge).
    // Replaced with a web-standard method to convert an ArrayBuffer to a Base64 string.
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const base64Audio = btoa(binary);
    
    // --- Gemini API Call Logic ---
    const ai = new GoogleGenAI({ apiKey });

    const audioPart = {
      inlineData: {
        mimeType: file.type || 'audio/m4a',
        data: base64Audio,
      },
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
    
    return setCorsHeaders(new Response(
        JSON.stringify(parsedJson),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error("Error in serverless function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return setCorsHeaders(new Response(
        JSON.stringify({ error: "Failed to transcribe audio.", details: errorMessage }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
};