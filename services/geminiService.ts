import { type TranscriptSegment } from '../types';
import { upload } from '@vercel/blob/client';

export const transcribeAudio = async (
  file: File,
  updateLoadingMessage: (message: string) => void
): Promise<TranscriptSegment[]> => {
  try {
    updateLoadingMessage('Uploading your audio file securely...');

    const newBlob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
    });

    if (!newBlob || !newBlob.url) {
      throw new Error('File upload to Vercel Blob failed.');
    }
    
    updateLoadingMessage('File uploaded. Starting transcription...');
    
    const transcribeResponse = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl: newBlob.url }),
    });

    if (!transcribeResponse.ok) {
      const errorData = await transcribeResponse.json().catch(() => ({ 
        error: 'Server returned an invalid error response.', 
        details: `Request failed with status ${transcribeResponse.status}` 
      }));
      throw new Error(errorData.details || errorData.error || `Request failed with status ${transcribeResponse.status}`);
    }
    
    const result = await transcribeResponse.json();

    if (!result || (Array.isArray(result) && result.length === 0)) {
      throw new Error("Transcription successful, but the audio appears to be silent or contains no discernible speech.");
    }

    return result as TranscriptSegment[];
  } catch (error) {
    console.error("Error during transcription process:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred during the transcription process.");
  }
};