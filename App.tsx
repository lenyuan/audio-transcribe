
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Spinner } from './components/Spinner';
import { transcribeAudio } from './services/geminiService';
import { type TranscriptSegment } from './types';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setTranscript(null);
    setError(null);
  };

  const handleTranscribe = useCallback(async () => {
    if (!file) {
      setError('Please select an M4A file first.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Preparing audio file...');
    setError(null);
    setTranscript(null);

    try {
      setLoadingMessage('Sending to AI for transcription...');
      const result = await transcribeAudio(file, (message) => setLoadingMessage(message));
      
      if (result && result.length > 0) {
        setTranscript(result);
      } else {
        setError("Transcription failed or returned no content. The audio might be silent or unclear.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during transcription.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [file]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-3xl bg-slate-800/50 rounded-2xl shadow-2xl shadow-sky-900/20 p-6 md:p-10 border border-slate-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-sky-400">Upload Your Audio</h2>
            <p className="text-slate-400 mt-2">Select an M4A file to transcribe with speaker identification.</p>
          </div>
          
          <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
          
          <div className="mt-8 text-center">
            <button
              onClick={handleTranscribe}
              disabled={!file || isLoading}
              className="px-8 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-500/50"
            >
              {isLoading ? 'Transcribing...' : 'Generate Transcript'}
            </button>
          </div>

          {isLoading && (
            <div className="mt-8 text-center">
              <Spinner />
              <p className="text-sky-400 mt-4 animate-pulse">{loadingMessage}</p>
            </div>
          )}

          {error && (
            <div className="mt-8 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {transcript && !isLoading && (
             <div className="mt-10">
                <h3 className="text-2xl font-bold text-sky-400 mb-6 border-b-2 border-slate-700 pb-2">Transcription Result</h3>
                <TranscriptDisplay segments={transcript} />
             </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
