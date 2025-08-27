
import { type TranscriptSegment } from '../types';

export const transcribeAudio = async (
    file: File, 
    updateLoadingMessage: (message: string) => void
): Promise<TranscriptSegment[]> => {
    // --- Real API call logic via our backend proxy ---
    try {
        updateLoadingMessage('Uploading audio file securely...');
        const formData = new FormData();
        formData.append('file', file);

        // We call our own backend endpoint, not Google's API directly.
        // This endpoint is the serverless function deployed on Vercel.
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
        });

        updateLoadingMessage('Processing transcription...');
        
        if (!response.ok) {
            // Try to parse the error response from the backend for a more specific message.
            const errorData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
            throw new Error(errorData.details || errorData.error || `Request failed with status ${response.status}`);
        }

        const result = await response.json();
        
        // This handles cases where the API successfully processes the audio 
        // but finds no speech, returning an empty array as instructed in the prompt.
        if (!result || (Array.isArray(result) && result.length === 0)) {
            throw new Error("Transcription successful, but the audio appears to be silent or contains no discernible speech.");
        }
        
        return result as TranscriptSegment[];

    } catch (error) {
        console.error("Error calling backend proxy:", error);
        // Re-throw the error to be caught by the UI component.
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while communicating with the transcription service.");
    }
};
