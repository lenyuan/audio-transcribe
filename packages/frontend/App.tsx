
import React, { useState, useCallback, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { TranscriptDisplay, SkeletonLoader } from './components/TranscriptDisplay';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { transcribeAudio } from './services/geminiService';
import { generateSrtContent } from './utils/srt';
import { type TranscriptSegment } from './types';
import { RefreshCw, Download, AlertTriangle } from 'lucide-react';


type Status = 'initial' | 'fileSelected' | 'loading' | 'success' | 'error';
const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('initial');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setError(`File is too large. The maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
        setStatus('error');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setStatus('fileSelected');
      setTranscript(null);
      setError(null);
    } else {
      setFile(null);
      setStatus('initial');
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('initial');
    setTranscript(null);
    setError(null);
    setLoadingMessage('');
  }

  const handleTranscribe = useCallback(async () => {
    if (!file) {
      setError('Please select an M4A file first.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setLoadingMessage('Preparing audio file...');
    setError(null);
    setTranscript(null);

    try {
      const result = await transcribeAudio(file, (message) => setLoadingMessage(message));
      
      if (result && result.length > 0) {
        setTranscript(result);
        setStatus('success');
      } else {
        setError("Transcription failed or returned no content. The audio might be silent or unclear.");
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during transcription.');
      setStatus('error');
    } finally {
      setLoadingMessage('');
    }
  }, [file]);

  const srtContent = useMemo(() => {
    if (!transcript) return '';
    return generateSrtContent(transcript);
  }, [transcript]);

  const handleDownloadSrt = useCallback(() => {
    if (!srtContent || !file) return;

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const srtFilename = (file.name.substring(0, file.name.lastIndexOf('.')) || file.name) + '.srt';
    
    link.href = url;
    link.download = srtFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  }, [srtContent, file]);
  
  const showResetButton = status === 'success' || status === 'error' || status === 'fileSelected';

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-3xl bg-slate-800/50 rounded-2xl shadow-2xl shadow-sky-900/20 p-6 md:p-10 border border-slate-700 relative">
          
          {showResetButton && (
            <button 
              onClick={handleReset} 
              className="absolute top-4 right-4 text-slate-400 hover:text-sky-400 transition-colors p-2 rounded-full"
              aria-label="Start over"
              type="button"
            >
              <RefreshCw size={20} />
            </button>
          )}

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-sky-400">Upload Your Audio</h2>
            <p className="text-slate-400 mt-2">Select an M4A file (up to {MAX_FILE_SIZE_MB}MB) to transcribe with speaker identification.</p>
          </div>
          
          <FileUpload onFileSelect={handleFileSelect} disabled={status === 'loading'} file={file} />
          
          {status === 'fileSelected' && (
            <div className="mt-8 text-center animate-fade-in">
              <button
                onClick={handleTranscribe}
                className="px-8 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-500/50"
                type="button"
              >
                Generate Transcript
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="mt-8 text-center animate-fade-in">
              <p className="text-sky-400 mb-6 animate-pulse">{loadingMessage}</p>
              <SkeletonLoader />
            </div>
          )}

          {status === 'error' && (
            <div className="mt-8 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center animate-fade-in">
              <div className="flex justify-center items-center gap-2">
                <AlertTriangle size={20}/>
                <p className="font-semibold">Operation Failed</p>
              </div>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          )}

          {status === 'success' && transcript && (
             <div className="mt-10 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b-2 border-slate-700 pb-2">
                  <div>
                    <h3 className="text-2xl font-bold text-sky-400">Transcription Result</h3>
                    <p className="text-sm text-slate-400 mt-1">{`Analysis complete. ${transcript.length} segments identified.`}</p>
                  </div>
                  <button
                    onClick={handleDownloadSrt}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-slate-700 text-sky-300 font-semibold rounded-lg hover:bg-slate-600/70 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    type="button"
                  >
                    <Download size={16} />
                    Download SRT
                  </button>
                </div>
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