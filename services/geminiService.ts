import { type TranscriptSegment } from '../types';

export const transcribeAudio = async (
  file: File,
  updateLoadingMessage: (message: string) => void
): Promise<TranscriptSegment[]> => {
  try {
    // Step 1: Request a secure upload URL from our new backend endpoint.
    updateLoadingMessage('Requesting secure upload link...');
    const uploadUrlResponse = await fetch(`/api/upload-url?filename=${encodeURIComponent(file.name)}`);
    if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL.');
    }
    const { url: uploadUrl } = await uploadUrlResponse.json();

    // Step 2: Upload the file directly to Vercel Blob storage using the secure URL.
    updateLoadingMessage('Uploading file to secure storage (this may take a moment)...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'x-ms-blob-type': 'BlockBlob',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to storage. Status: ${uploadResponse.statusText}`);
    }

    // The 'uploadUrl' contains query parameters. We only need the base URL for the 'fileUrl' to send to our transcription service.
    const fileUrl = uploadUrl.split('?')[0];

    // Step 3: Send the URL of the stored file to our transcription endpoint.
    updateLoadingMessage('File uploaded. Sending to AI for transcription...');
    const transcribeResponse = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
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