
import React, { useState } from 'react';
import { type TranscriptSegment } from '../types';
import { Copy, Check } from 'lucide-react';

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ segments }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <ol className="space-y-4" aria-label="Transcription segments">
      {segments.map((segment, index) => (
        <li key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800/60 rounded-lg border border-slate-700 shadow-md transition-all duration-300 hover:border-sky-700 hover:shadow-sky-900/30 relative group">
          <div className="flex-shrink-0 sm:w-36 text-left">
             <span className="font-bold text-sm bg-sky-900/50 text-sky-300 px-2.5 py-1 rounded-full">{segment.speaker}</span>
            <div className="text-sm text-slate-400 font-mono mt-2">{segment.timestamp}</div>
          </div>
          <div className="flex-1 text-slate-300 leading-relaxed">
            <p>{segment.transcript}</p>
          </div>
           <button 
            type="button"
            onClick={() => handleCopy(`${segment.speaker} (${segment.timestamp}): ${segment.transcript}`, index)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-700/50 text-slate-400 opacity-50 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 hover:bg-slate-600 hover:text-sky-300"
            aria-label="Copy segment"
          >
            {copiedIndex === index ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </li>
      ))}
    </ol>
  );
};

export const SkeletonLoader: React.FC = () => {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800/60 rounded-lg border border-slate-700 shadow-md">
                    <div className="flex-shrink-0 sm:w-36">
                        <div className="h-6 w-24 bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-4 w-16 bg-slate-700 rounded mt-2 animate-pulse"></div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-4 w-5/6 bg-slate-700 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};