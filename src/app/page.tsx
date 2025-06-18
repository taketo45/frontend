'use client';

import { useState } from 'react';
import VideoUpload from '@/components/VideoUpload';
import FaceUpload from '@/components/FaceUpload';
import ResultDisplay from '@/components/ResultDisplay';

interface DetectionResult {
  timestamp: number;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface AnalysisSummary {
  totalFrames: number;
  totalDetections: number;
  totalFacesFound?: number;
  maxSimilarity?: number;
  message?: string;
}

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleAnalyze = async () => {
    if (!videoFile || !faceFile) {
      alert('動画ファイルと顔写真の両方をアップロードしてください');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('動画と顔写真をアップロード中...');
    
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('face', faceFile);

    try {
      console.log('Starting analysis request...');
      setProcessingStatus('サーバーで解析を開始しています...');
      
      // タイムアウトを5分に設定
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5分
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('Analysis response received');
        setProcessingStatus('結果を処理中...');
        
        const data = await response.json();
        console.log('Analysis results:', data);
        setResults(data.detections || []);
        setSummary(data.summary || null);
        
        if (data.summary) {
          console.log(`処理完了: ${data.summary.totalFrames}フレーム、${data.summary.totalDetections}件検出`);
          setProcessingStatus(data.summary.message || `処理完了: ${data.summary.totalDetections}件検出されました`);
        } else {
          setProcessingStatus('処理完了');
        }
      } else {
        const errorText = await response.text();
        console.error('Analysis failed:', response.status, errorText);
        alert(`解析に失敗しました: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.name === 'AbortError') {
        alert('処理がタイムアウトしました（5分以上）。より短い動画をお試しください。');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    } finally {
      setIsProcessing(false);
      if (!isProcessing) {
        setProcessingStatus('');
      }
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        動画内人物検出システム
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <VideoUpload onFileSelect={setVideoFile} />
        <FaceUpload onFileSelect={setFaceFile} />
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleAnalyze}
          disabled={!videoFile || !faceFile || isProcessing}
          className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
        >
          {isProcessing ? '解析中...' : '解析開始'}
        </button>
        
        {isProcessing && processingStatus && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-700 font-medium">進行状況</p>
            <p className="text-blue-600">{processingStatus}</p>
            <div className="mt-2 text-sm text-blue-500">
              長時間の動画の場合、処理に数分かかることがあります...
            </div>
          </div>
        )}
      </div>

      {(results.length > 0 || summary) && <ResultDisplay results={results} summary={summary} />}
    </div>
  );
}
