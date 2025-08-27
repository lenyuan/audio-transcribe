import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This function generates a secure URL for uploading files to Vercel Blob.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // The filename is passed as a query parameter from the frontend.
  const filename = req.query.filename as string | undefined;

  if (!filename) {
    return res.status(400).json({ error: 'Missing filename query parameter' });
  }

  try {
    // The `put` function from `@vercel/blob` generates the presigned URL.
    // We pass `undefined` as the body because we are only generating the URL, not uploading data here.
    const blob = await put(filename, undefined as any, {
      access: 'public',
      // The token is automatically read from the BLOB_READ_WRITE_TOKEN environment variable on Vercel.
    });
    
    // Return the secure URL to the frontend using the standard Vercel response object.
    return res.status(200).json(blob);

  } catch (error) {
    console.error('Error generating upload URL:', error);
    const message = error instanceof Error ? error.message : 'Unknown error.';
    return res.status(500).json({ error: 'Failed to generate upload URL', details: message });
  }
}