import { handleUpload, type HandleUploadBody } from '@vercel/blob/server';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PutBlobResult } from '@vercel/blob';

// Function to set CORS headers
const setCorsHeaders = (res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-vercel-blob-client-version, authorization");
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS request for CORS preflight, which is crucial for the browser client.
  if (req.method === 'OPTIONS') {
      console.log('[upload] Handling OPTIONS preflight request.');
      setCorsHeaders(res);
      return res.status(204).end();
  }
  
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    console.log(`[upload] Method Not Allowed: Received ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  // The BLOB_READ_WRITE_TOKEN is read automatically by `handleUpload` from environment variables.
  // A 500 error here usually means the variable is missing or invalid in the Vercel project settings.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[upload] CRITICAL: BLOB_READ_WRITE_TOKEN environment variable is not set.");
      return res.status(500).json({ error: 'Server configuration error: Storage token is missing.' });
  }

  try {
    const body = req.body as HandleUploadBody;
    console.log('[upload] Received upload request. Body size:', req.headers['content-length']);

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname: string) => {
        console.log(`[upload] Generating token for pathname: ${pathname}`);
        return {
          allowedContentTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
          tokenPayload: JSON.stringify({
             pathname,
          }),
          // The `clientPayload` can be used here if you need to pass data to `onUploadCompleted`
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult, tokenPayload: string | null | undefined }) => {
        console.log('[upload] Blob upload completed successfully:', { 
            url: blob.url, 
            pathname: blob.pathname,
            contentType: blob.contentType,
            contentDisposition: blob.contentDisposition
        });
        
        try {
            // You can add logic here that runs after the upload is complete.
            // For example, writing metadata to a database.
            if(tokenPayload) {
                console.log('[upload] Decoded token payload:', JSON.parse(tokenPayload));
            }
        } catch (e) {
            console.error('[upload] Error in onUploadCompleted callback:', e)
        }
      },
    });

    console.log('[upload] Sending back successful JSON response to client.');
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[upload] An unexpected error occurred during upload:', error);
    // Vercel Blob may throw specific errors, which can be logged for more insight.
    return res.status(500).json({ error: (error as Error).message || 'An unknown error occurred.' });
  }
}
