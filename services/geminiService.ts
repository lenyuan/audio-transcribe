
import { type TranscriptSegment } from '../types';

// Mock data for preview/testing without an API key
const mockTranscript: TranscriptSegment[] = [
  {
    speaker: "Speaker 1",
    timestamp: "00:02",
    transcript: "Hello, this is a simulated transcript for testing purposes. Is this thing working?",
  },
  {
    speaker: "Speaker 2",
    timestamp: "00:06",
    transcript: "Loud and clear! The mock service is functioning correctly. This allows us to test the UI flow without making a real API call.",
  },
  {
    speaker: "Speaker 1",
    timestamp: "00:12",
    transcript: "Excellent. So the user can upload a file, see the loading state, and then this transcript will appear.",
  },
];

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const transcribeAudio = async (
    file: File, 
    updateLoadingMessage: (message: string) => void
): Promise<TranscriptSegment[]> => {
    // If NEXT_PUBLIC_API_KEY is not set (typical in local/preview), run in mock mode.
    // In a real deployed app, the backend checks for its own API_KEY.
    const isMockMode = !process.env.API_KEY && !process.env.NEXT_PUBLIC_API_KEY;

    if (isMockMode) {
        console.warn("⚠️ Running in mock mode. No API key found. A simulated transcript will be returned.");
        updateLoadingMessage('Preparing audio file... (Mock Mode)');
        await simulateDelay(1500);
        updateLoadingMessage('Simulating transcription... (Mock Mode)');
        await simulateDelay(3000);
        updateLoadingMessage('Processing results... (Mock Mode)');
        await simulateDelay(1000);
        return Promise.resolve(mockTranscript);
    }

    // --- Real API call logic via our backend proxy ---
    try {
        updateLoadingMessage('Uploading audio file securely...');
        const formData = new FormData();
        formData.append('file', file);

        // We call our own backend endpoint, not Google's API directly.
        // This endpoint should be the serverless function we created.
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
        });

        updateLoadingMessage('Processing transcription...');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const result = await response.json();
        return result as TranscriptSegment[];

    } catch (error) {
        console.error("Error calling backend proxy:", error);
        throw new Error("Failed to transcribe audio. Please check the console for details.");
    }
};
