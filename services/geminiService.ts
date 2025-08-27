import { type TranscriptSegment } from '../types';
import { upload } from '@vercel/blob/client';

export const transcribeAudio = async (
  file: File,
  updateLoadingMessage: (message: string) => void
): Promise<TranscriptSegment[]> => {
  try {
    // Step 1 & 2: Use the Vercel Blob client helper to handle the upload process.
    // It automatically requests the secure URL and uploads the file.
    updateLoadingMessage('Uploading file to secure storage (this may take a moment)...');
    
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload-url',
    });

    // Step 3: Send the URL of the stored file to our transcription endpoint.
    updateLoadingMessage('File uploaded. Sending to AI for transcription...');
    const transcribeResponse = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: blob.url }),
    });

    if (!transcribeResponse.ok) {
      const errorData = await transcribeResponse.json();
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