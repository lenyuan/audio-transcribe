import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptSegment } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';

// 告知 Vercel 如何設定此函式：
// 1. 禁用其預設的 body parser，以便 formidable 可以正確處理請求流
// 2. 將最大執行時間設定為 60 秒，以處理較長的音訊檔
// 3. 強制使用 Node.js 環境
export const config = {
    api: {
        bodyParser: false,
    },
    maxDuration: 60,
    runtime: 'nodejs18.x',
};

// 設定 CORS 標頭的輔助函式
const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async (req: VercelRequest, res: VercelResponse) => {
    // 處理預檢 CORS 請求
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(204).end();
    }
    
    // 為實際請求設定 CORS 標頭
    setCorsHeaders(res);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API_KEY environment variable is not set." });
    }

    try {
        // 使用 formidable 解析傳入的表單數據 (包含檔案)
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        
        const fileArray = files.file;
        if (!fileArray || fileArray.length === 0) {
            return res.status(400).json({ error: 'No file provided in the request' });
        }
        
        const file = fileArray[0];

        if (!file.filepath) {
            return res.status(400).json({ error: 'File path is missing after upload' });
        }

        // 將 formidable 暫存的檔案讀取為 Buffer，然後轉為 Base64
        const fileBuffer = fs.readFileSync(file.filepath);
        const base64Audio = fileBuffer.toString('base64');
        const mimeType = file.mimetype || 'audio/m4a';
        
        // --- Gemini API 呼叫邏輯 ---
        const ai = new GoogleGenAI({ apiKey });

        const audioPart = {
            inlineData: {
                mimeType: mimeType,
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
        
        return res.status(200).json(parsedJson);

    } catch (error) {
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: "Failed to transcribe audio.", details: errorMessage });
    }
};