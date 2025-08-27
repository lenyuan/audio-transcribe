import { handleUpload } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // The Vercel Blob client helper (`upload` function on the frontend)
  // sends a POST request with a JSON body.
  const body = req.body;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // This callback is called before the token is generated.
        // It allows you to add claims to the token, such as a user ID.
        return {
          allowedContentTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
          pathname,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback is called after the file has been uploaded.
        // You can use it to, for example, store the blob URL in your database.
        console.log('Blob upload completed', blob, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error in upload handler:', error);
    const message = error instanceof Error ? error.message : 'Unknown error.';
    return res.status(500).json({ error: 'Failed to handle upload', details: message });
  }
}