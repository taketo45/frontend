import { NextRequest, NextResponse } from 'next/server';
import * as faceapi from 'face-api.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createCanvas, loadImage, Canvas, Image } from 'canvas';

// Node.js環境でcanvasをセットアップ
faceapi.env.monkeyPatch({
  Canvas: Canvas,
  Image: Image,
  ImageData: (global as any).ImageData || class ImageData {
    constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
  },
  createCanvasElement: () => createCanvas(1, 1),
  createImageElement: () => new Image(),
  fetch: (global as any).fetch
});

const MODELS_PATH = path.join(process.cwd(), 'public', 'models');

async function loadModels() {
  try {
    console.log('Loading face-api models from:', MODELS_PATH);
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    console.log('All models loaded successfully');
  } catch (error) {
    console.error('Failed to load face-api models:', error);
    throw error;
  }
}

// 画像をbase64からcanvasに変換するヘルパー関数
async function imageBufferToCanvas(buffer: Buffer): Promise<any> {
  const base64 = buffer.toString('base64');
  const img = await loadImage(`data:image/jpeg;base64,${base64}`);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return canvas;
}

function extractFrames(videoPath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // より少ないフレーム数で高速化: 3秒に1回の頻度
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', 'fps=1/3',  // 3秒に1フレーム
      '-y',
      `${outputDir}/frame_%04d.jpg`
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data}`);
    });
  });
}

async function detectFaces(imagePath: string, referenceFace: Float32Array) {
  try {
    // Node.js環境でローカル画像を読み込む
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    console.log(`Frame image loaded: ${img.width}x${img.height}`);
    
    const detections = await faceapi
      .detectAllFaces(canvas)
      .withFaceLandmarks()
      .withFaceDescriptors();

    console.log(`  Detected ${detections.length} faces in frame`);

    const matches = [];
    const allSimilarities = []; // デバッグ用
    
    for (let i = 0; i < detections.length; i++) {
      const detection = detections[i];
      if (detection.descriptor) {
        const distance = faceapi.euclideanDistance(referenceFace, detection.descriptor);
        const similarity = 1 - distance;
        
        allSimilarities.push(similarity);
        console.log(`    Face ${i + 1}: similarity = ${(similarity * 100).toFixed(1)}%`);
        
        // 閾値を0.4（40%）に下げて検出しやすくする
        if (similarity > 0.4) {
          matches.push({
            confidence: similarity,
            bbox: {
              x: detection.detection.box.x,
              y: detection.detection.box.y,
              width: detection.detection.box.width,
              height: detection.detection.box.height,
            }
          });
        }
      }
    }
    
    if (matches.length === 0 && allSimilarities.length > 0) {
      const maxSimilarity = Math.max(...allSimilarities);
      console.log(`  No matches above 40% threshold. Best similarity: ${(maxSimilarity * 100).toFixed(1)}%`);
    }
    
    return { matches, totalFaces: detections.length, bestSimilarity: allSimilarities.length > 0 ? Math.max(...allSimilarities) : 0 };
  } catch (error) {
    console.error('Face detection failed:', error);
    return { matches: [], totalFaces: 0, bestSimilarity: 0 };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting analysis...');
    await loadModels();
    
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const faceFile = formData.get('face') as File;

    if (!videoFile || !faceFile) {
      return NextResponse.json(
        { error: 'Video and face files are required' },
        { status: 400 }
      );
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
    const facePath = path.join(tempDir, `face_${Date.now()}.jpg`);
    const framesDir = path.join(tempDir, `frames_${Date.now()}`);

    fs.mkdirSync(framesDir);

    const videoBuffer = await videoFile.arrayBuffer();
    const faceBuffer = await faceFile.arrayBuffer();
    
    fs.writeFileSync(videoPath, Buffer.from(videoBuffer));
    fs.writeFileSync(facePath, Buffer.from(faceBuffer));

    // base64からcanvasに変換
    const faceCanvas = await imageBufferToCanvas(Buffer.from(faceBuffer));
    console.log(`Face canvas created: ${faceCanvas.width}x${faceCanvas.height}`);
    
    let faceDetection;
    try {
      console.log('Attempting face detection on reference image...');
      faceDetection = await faceapi
        .detectSingleFace(faceCanvas)
        .withFaceLandmarks()
        .withFaceDescriptor();
      console.log('Face detection completed:', !!faceDetection);
    } catch (detectionError) {
      console.error('Face detection error:', detectionError);
      return NextResponse.json(
        { error: 'Face detection failed: ' + detectionError.message },
        { status: 500 }
      );
    }

    if (!faceDetection || !faceDetection.descriptor) {
      console.log('No face detected in reference image');
      return NextResponse.json(
        { error: 'No face detected in reference image' },
        { status: 400 }
      );
    }

    await extractFrames(videoPath, framesDir);

    const frameFiles = fs.readdirSync(framesDir)
      .filter(file => file.endsWith('.jpg'))
      .sort();

    const detections = [];
    let totalFacesFound = 0;
    let maxSimilarity = 0;
    
    console.log(`Processing ${frameFiles.length} frames...`);
    
    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = path.join(framesDir, frameFiles[i]);
      const result = await detectFaces(framePath, faceDetection.descriptor);
      const { matches, totalFaces, bestSimilarity } = result;
      
      totalFacesFound += totalFaces;
      maxSimilarity = Math.max(maxSimilarity, bestSimilarity);
      
      console.log(`Frame ${i + 1}/${frameFiles.length}: Found ${matches.length} matches (${totalFaces} faces detected)`);
      
      for (const match of matches) {
        detections.push({
          timestamp: i * 3, // 3秒間隔なので
          ...match
        });
      }
    }

    console.log(`Analysis complete! Total detections: ${detections.length}`);
    console.log(`Total faces found across all frames: ${totalFacesFound}`);
    console.log(`Best similarity score: ${(maxSimilarity * 100).toFixed(1)}%`);
    
    // 一時ファイルのクリーンアップ
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('Sending response to client...');
    return NextResponse.json({ 
      detections,
      summary: {
        totalFrames: frameFiles.length,
        totalDetections: detections.length,
        totalFacesFound,
        maxSimilarity,
        message: detections.length === 0 ? 
          (totalFacesFound === 0 ? 
            '動画内に顔が検出されませんでした。' : 
            `${totalFacesFound}個の顔が検出されましたが、参照画像と一致しませんでした（最高一致率: ${(maxSimilarity * 100).toFixed(1)}%）。`) :
          `${detections.length}件の一致が見つかりました。`
      }
    });

  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}