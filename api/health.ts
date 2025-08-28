// api/health.ts
// This file exists solely to ensure Vercel's bundler includes the @vercel/blob packages.
import '@vercel/blob';
import '@vercel/blob/server';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  res.status(200).json({ status: 'ok' });
}