import { NextRequest, NextResponse } from 'next/server';
import { renderMedia } from '@remotion/renderer';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { videoPath, detections } = await request.json();

    if (!videoPath || !detections) {
      return NextResponse.json(
        { error: 'Video path and detections are required' },
        { status: 400 }
      );
    }

    // 一時的に動画生成機能を無効化し、詳細な説明を返す
    console.log('Video render request received:', { videoPath, detections: detections.length });
    
    return NextResponse.json({
      error: 'Video generation feature is currently under development. The Remotion backend requires webpack bundle setup which is not yet completed.',
      details: {
        issue: 'Missing webpack bundle configuration',
        detectedFaces: detections.length,
        nextSteps: [
          'Setup Remotion webpack bundle',
          'Configure proper serve URL',
          'Implement video composition logic'
        ]
      }
    }, { status: 501 }); // 501 = Not Implemented

    // TODO: Implement proper Remotion rendering once webpack bundle is configured
    /*
    const remotionRoot = path.join(process.cwd(), '..', 'remotion-backend');
    const outputPath = path.join(process.cwd(), 'public', 'output', `analysis_${Date.now()}.mp4`);

    await renderMedia({
      composition: {
        id: 'VideoAnalysis',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: detections.length > 0 ? Math.max(...detections.map((d: any) => d.timestamp)) * 30 + 300 : 3000,
      },
      serveUrl: remotionRoot,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        videoSrc: videoPath,
        detections: detections,
      },
    });

    const outputFileName = path.basename(outputPath);
    
    return NextResponse.json({
      success: true,
      videoUrl: `/output/${outputFileName}`
    });
    */

  } catch (error) {
    console.error('Rendering request failed:', error);
    return NextResponse.json(
      { 
        error: 'Video generation service temporarily unavailable',
        technical_details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}