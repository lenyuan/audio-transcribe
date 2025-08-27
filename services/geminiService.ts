import { type TranscriptSegment } from '../types';

export const transcribeAudio = async (
  file: File,
  updateLoadingMessage: (message: string) => void
): Promise<TranscriptSegment[]> => {
  try {
    updateLoadingMessage('Uploading and processing your audio file...');

    const formData = new FormData();
    formData.append('file', file);
    
    // Send the file directly to our transcription endpoint.
    // The browser will automatically set the correct 'Content-Type' for multipart/form-data.
    const transcribeResponse = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
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
