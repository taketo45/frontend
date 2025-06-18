'use client';

import { useRef } from 'react';

interface VideoUploadProps {
  onFileSelect: (file: File | null) => void;
}

export default function VideoUpload({ onFileSelect }: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">動画ファイル</h2>
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={handleClick}
      >
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zM5.02 9.26c-.5.6-.02 1.74.52 1.74h12.92c.54 0 1.02-1.14.52-1.74L13 3.5a2 2 0 00-2 0l-5.98 5.76z" />
          </svg>
          <p className="text-sm">
            動画ファイルをドラッグ&ドロップまたはクリックして選択
          </p>
          <p className="text-xs text-gray-400 mt-2">
            MP4, MOV, AVI形式対応
          </p>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="動画ファイルを選択"
      />
    </div>
  );
}