// api/upload.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/server';
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Fix: Replaced incorrect type 'BlobResult' with 'PutBlobResult' as it is the correct type exported from '@vercel/blob'.
import type { PutBlobResult } from '@vercel/blob';

const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-vercel-blob-client-version, authorization");
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      return res.status(204).end();
  }
  
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname: string) => {
        return {
          allowedContentTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
          tokenPayload: JSON.stringify({
             pathname,
          }),
        };
      },
      // Fix: Updated the type of 'blob' to use the correct 'PutBlobResult' type.
      onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult, tokenPayload: string | null | undefined }) => {
        console.log('blob upload completed', blob, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error handling upload:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
