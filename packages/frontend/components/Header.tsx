
import React from 'react';
import { Mic } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <Mic className="h-7 w-7 text-sky-400 mr-3" />
        <h1 className="text-xl font-bold text-white tracking-wider">
          課程部語音轉錄神器
        </h1>
      </div>
    </header>
  );
};
