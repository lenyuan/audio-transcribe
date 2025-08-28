import { handleUpload, type HandleUploadBody } from '@vercel/blob/server';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('blob upload completed', blob, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error handling upload:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
}