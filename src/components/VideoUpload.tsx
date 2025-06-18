'use client';

import { useRef, useState } from 'react';

interface VideoUploadProps {
  onFileSelect: (file: File | null) => void;
}

export default function VideoUpload({ onFileSelect }: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => (
    <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  const getUploadIcon = () => (
    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">動画ファイル</h2>
      
      {selectedFile ? (
        // ファイル選択済みの表示
        <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getFileIcon()}
              <div>
                <h3 className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">
                  ✓ ファイル選択完了
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleClick}
                className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded transition-colors"
              >
                変更
              </button>
              <button
                onClick={handleRemoveFile}
                className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ファイル未選択時の表示
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
          onClick={handleClick}
        >
          <div className="text-gray-500">
            {getUploadIcon()}
            <p className="text-sm font-medium">
              動画ファイルをドラッグ&ドロップまたはクリックして選択
            </p>
            <p className="text-xs text-gray-400 mt-2">
              MP4, MOV, AVI形式対応 (最大100MB推奨)
            </p>
          </div>
        </div>
      )}
      
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