'use client';

import { useState } from 'react';

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

interface ResultDisplayProps {
  results: DetectionResult[];
  summary?: AnalysisSummary;
}

export default function ResultDisplay({ results, summary }: ResultDisplayProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detections: results,
          videoPath: '/path/to/video'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVideoUrl(data.videoUrl);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Video generation failed:', errorData);
        alert(`動画生成に失敗しました: ${errorData.error || 'サーバーエラー'}（現在開発中の機能です）`);
      }
    } catch (error) {
      console.error('Error generating video:', error);
      alert('エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">検出結果</h2>
      
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          検出された時間帯: {results.length}箇所
        </p>
        
        {results.length > 0 && (
          <div className="text-right">
            <button
              onClick={generateVideo}
              disabled={isGenerating}
              className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded text-sm"
            >
              {isGenerating ? '生成中...' : '解析動画を生成'}
            </button>
            <div className="text-xs text-gray-500 mt-1">
              ※ 現在、動画生成機能は開発中です
            </div>
          </div>
        )}
      </div>

      {videoUrl && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">生成された解析動画</h3>
          <video controls className="w-full max-w-md">
            <source src={videoUrl} type="video/mp4" />
          </video>
        </div>
      )}

      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                {formatTime(result.timestamp)}
              </div>
              <div className="text-sm text-gray-600">
                信頼度: {(result.confidence * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-xs text-gray-500">
              位置: ({Math.round(result.bbox.x)}, {Math.round(result.bbox.y)}) 
              サイズ: {Math.round(result.bbox.width)}×{Math.round(result.bbox.height)}
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-yellow-800">検出結果なし</h3>
          </div>
          
          {summary?.message && (
            <p className="text-yellow-700 mb-4">{summary.message}</p>
          )}
          
          {summary && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded">
                  <span className="text-gray-600">解析フレーム数:</span>
                  <span className="font-semibold ml-2">{summary.totalFrames}フレーム</span>
                </div>
                <div className="bg-white p-3 rounded">
                  <span className="text-gray-600">検出された顔:</span>
                  <span className="font-semibold ml-2">{summary.totalFacesFound || 0}個</span>
                </div>
              </div>
              
              {summary.maxSimilarity !== undefined && summary.maxSimilarity > 0 && (
                <div className="bg-white p-3 rounded">
                  <span className="text-gray-600">最高一致率:</span>
                  <span className="font-semibold ml-2">{(summary.maxSimilarity * 100).toFixed(1)}%</span>
                  <span className="text-xs text-gray-500 ml-2">(40%以上で一致と判定)</span>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-800 mb-2">改善提案</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• より鮮明で正面向きの顔写真を使用してください</li>
              <li>• 動画内の人物がはっきりと映っているシーンがあるか確認してください</li>
              <li>• 照明条件や角度の影響で一致率が下がる可能性があります</li>
              {summary?.totalFacesFound === 0 && (
                <li>• 動画内に顔が検出されていません。人物が映っているか確認してください</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}