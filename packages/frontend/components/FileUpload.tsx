import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, FileAudio, XCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
  file: File | null;
}

const ALLOWED_MIME_TYPES = ['audio/mp4', 'audio/m4a', 'audio/x-m4a'];

const isValidFile = (file: File): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_MIME_TYPES.includes(file.type) || fileExtension === 'm4a';
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, file }) => {
  const [dragError, setDragError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file === null) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [file]);

  const handleFileValidation = (selectedFile: File | undefined) => {
    setDragError(null);
    if (selectedFile && isValidFile(selectedFile)) {
      onFileSelect(selectedFile);
    } else if (selectedFile) {
      setDragError('Invalid file type. Please select an M4A audio file.');
      onFileSelect(null);
    } else {
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
    
    const droppedFile = e.dataTransfer.files?.[0];
    handleFileValidation(droppedFile);
     
    if(droppedFile && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      fileInputRef.current.files = dataTransfer.files;
    }
  }, [disabled, onFileSelect]);

  const baseClasses = "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 relative";
  const idleClasses = "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-sky-500";
  const draggingClasses = "bg-sky-900/50 border-sky-500";
  const disabledClasses = "bg-slate-800 border-slate-700 cursor-not-allowed opacity-50";
  const errorClasses = "bg-red-900/30 border-red-700";

  const getContainerClasses = () => {
    if (disabled) return disabledClasses;
    if (dragError) return errorClasses;
    if (isDragging) return draggingClasses;
    return idleClasses;
  }
  
  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="dropzone-file"
        className={`${baseClasses} ${getContainerClasses()}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
          {!file && !dragError && (
            <>
              <UploadCloud className="w-10 h-10 mb-4 text-slate-400" aria-hidden="true" />
              <p className="mb-2 text-sm text-slate-400">
                <span className="font-semibold text-sky-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-500">M4A audio files only</p>
            </>
          )}
          {file && (
            <div className="flex flex-col items-center justify-center text-center">
              <FileAudio className="w-10 h-10 mb-4 text-green-400" />
              <p className="text-sm font-medium text-slate-300 break-all">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">File selected. Ready to transcribe.</p>
            </div>
          )}
          {dragError && (
            <div className="flex flex-col items-center justify-center text-center">
                <XCircle className="w-10 h-10 mb-4 text-red-400" />
                <p className="text-sm font-medium text-red-300">{dragError}</p>
                <p className="text-xs text-slate-400 mt-1">Please try again.</p>
            </div>
          )}
        </div>
        <input ref={fileInputRef} id="dropzone-file" type="file" className="hidden" accept=".m4a,audio/mp4,audio/m4a,audio/x-m4a" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};