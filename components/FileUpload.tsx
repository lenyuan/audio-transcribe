import React, { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
}

const ALLOWED_MIME_TYPES = ['audio/mp4', 'audio/m4a', 'audio/x-m4a'];

const isValidFile = (file: File): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_MIME_TYPES.includes(file.type) || fileExtension === 'm4a';
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = (file: File | undefined) => {
    if (file && isValidFile(file)) {
      setFileName(file.name);
      onFileSelect(file);
    } else if (file) {
      setFileName('Invalid file type. Please select an M4A file.');
      onFileSelect(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileValidation(e.target.files?.[0]);
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if(disabled) return;
    
    const file = e.dataTransfer.files?.[0];
    handleFileValidation(file);
     
    if(fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files;
    }
  }, [disabled, onFileSelect, handleFileValidation]);

  const baseClasses = "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300";
  const idleClasses = "bg-slate-700/50 border-slate-600 hover:bg-slate-700";
  const draggingClasses = "bg-sky-900/50 border-sky-500";
  const disabledClasses = "bg-slate-800 border-slate-700 cursor-not-allowed opacity-50";

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="dropzone-file"
        className={`${baseClasses} ${disabled ? disabledClasses : isDragging ? draggingClasses : idleClasses}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-10 h-10 mb-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
          </svg>
          <p className="mb-2 text-sm text-slate-400">
            <span className="font-semibold text-sky-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500">M4A audio files only</p>
          {fileName && <p className="mt-4 text-sm font-medium text-slate-300">{fileName}</p>}
        </div>
        <input ref={fileInputRef} id="dropzone-file" type="file" className="hidden" accept=".m4a,audio/mp4,audio/m4a,audio/x-m4a" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};