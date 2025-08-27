
import React from 'react';
import { type TranscriptSegment } from '../types';

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ segments }) => {
  return (
    <div className="space-y-6">
      {segments.map((segment, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800/60 rounded-lg border border-slate-700 shadow-md transition-all duration-300 hover:border-sky-700 hover:shadow-sky-900/30">
          <div className="flex-shrink-0 sm:w-32">
            <div className="font-bold text-sky-400">{segment.speaker}</div>
            <div className="text-sm text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded inline-block mt-1">{segment.timestamp}</div>
          </div>
          <div className="flex-1 text-slate-300 leading-relaxed">
            <p>{segment.transcript}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
