'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { FaceTrackingData, BodyPoseData, HandTrackingData, TrackingQuality } from '@/lib/motion';

interface DebugOverlayProps {
  videoElement: HTMLVideoElement | null;
  faces: FaceTrackingData[];
  bodies: BodyPoseData[];
  hands: HandTrackingData[];
  fps: number;
  trackingQuality: TrackingQuality | null;
  processingTime?: number;
  isVisible: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * DebugOverlay Component
 * 
 * Renders visualization of motion tracking data including:
 * - Webcam feed with face landmarks
 * - Body skeleton
 * - Hand landmarks and gestures
 * - FPS and tracking confidence
 */
export function DebugOverlay({
  videoElement,
  faces,
  bodies,
  hands,
  fps,
  trackingQuality,
  processingTime = 0,
  isVisible,
  canvasRef,
}: DebugOverlayProps) {
  const animationFrameRef = useRef<number | null>(null);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mirrored video
    if (videoElement) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw face landmarks
    for (const face of faces) {
      drawFaceDebug(ctx, face);
    }

    // Draw body skeleton
    for (const body of bodies) {
      drawBodyDebug(ctx, body);
    }

    // Draw hand landmarks
    for (const hand of hands) {
      drawHandDebug(ctx, hand);
    }

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(render);
  }, [videoElement, faces, bodies, hands, isVisible, canvasRef]);

  // Start/stop render loop
  useEffect(() => {
    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(render);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, render]);

  // Update canvas size when video changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoElement;
    if (!canvas || !video) return;

    const updateSize = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };

    updateSize();
    video.addEventListener('loadedmetadata', updateSize);
    return () => video.removeEventListener('loadedmetadata', updateSize);
  }, [videoElement, canvasRef]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className="w-full h-full"
      />
      <InfoOverlay
        fps={fps}
        trackingQuality={trackingQuality}
        processingTime={processingTime}
      />
    </div>
  );
}

/**
 * Info overlay showing FPS and tracking stats
 */
function InfoOverlay({
  fps,
  trackingQuality,
  processingTime,
}: {
  fps: number;
  trackingQuality: TrackingQuality | null;
  processingTime: number;
}) {
  return (
    <div className="absolute top-4 left-4 bg-black/80 rounded-lg p-3 text-white font-mono text-xs space-y-1">
      <div className="text-lg font-bold text-green-400">
        {fps.toFixed(1)} FPS
      </div>
      <div className="text-gray-400">
        Process: {processingTime.toFixed(1)}ms
      </div>
      <div className="border-t border-gray-700 pt-1 mt-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${trackingQuality?.faceDetected ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span>Face</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${trackingQuality?.bodyDetected ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span>Body</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${trackingQuality?.handsDetected?.left ? 'bg-yellow-500' : 'bg-gray-500'}`} />
          <span>L-Hand</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${trackingQuality?.handsDetected?.right ? 'bg-blue-500' : 'bg-gray-500'}`} />
          <span>R-Hand</span>
        </div>
      </div>
      {trackingQuality && (
        <div className="text-gray-500">
          Quality: {(trackingQuality.qualityScore * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

/**
 * Draw face debug visualization
 */
function drawFaceDebug(ctx: CanvasRenderingContext2D, face: FaceTrackingData) {
  ctx.save();
  ctx.strokeStyle = '#00ff00';
  ctx.fillStyle = '#00ff00';
  ctx.lineWidth = 1;

  // Draw bounding box
  ctx.strokeRect(face.bbox.x, face.bbox.y, face.bbox.width, face.bbox.height);

  // Draw key face points (subset)
  const keyIndices = [
    1, // nose tip
    33, 263, // eye corners
    61, 291, // mouth corners
    199, 369, // temple
  ];

  for (const idx of keyIndices) {
    if (face.landmarks.points[idx]) {
      const point = face.landmarks.points[idx];
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw face mesh outline
  const outlineIndices = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 215, 162, 127, 234, 107, 109,
    67, 10,
  ];

  ctx.beginPath();
  let started = false;
  for (const idx of outlineIndices) {
    if (face.landmarks.points[idx]) {
      const point = face.landmarks.points[idx];
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
  ctx.stroke();

  // Draw head pose
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px monospace';
  const poseX = face.bbox.x;
  const poseY = face.bbox.y - 35;
  
  ctx.fillText(
    `P: ${face.headPose.pitch.toFixed(0)}° R: ${face.headPose.roll.toFixed(0)}° Y: ${face.headPose.yaw.toFixed(0)}°`,
    poseX,
    poseY
  );

  // Draw expressions
  const expressions = face.expressions;
  ctx.font = '10px monospace';
  ctx.fillText(
    `Smile: ${(expressions.smile * 100).toFixed(0)}%`,
    face.bbox.x,
    face.bbox.y + face.bbox.height + 15
  );

  ctx.restore();
}

/**
 * Draw body debug visualization
 */
function drawBodyDebug(ctx: CanvasRenderingContext2D, body: BodyPoseData) {
  ctx.save();
  ctx.strokeStyle = '#ff00ff';
  ctx.fillStyle = '#ff00ff';
  ctx.lineWidth = 2;

  // Define skeleton connections
  const connections = [
    // Shoulders
    [11, 12],
    // Left arm
    [11, 13], [13, 15],
    // Right arm
    [12, 14], [14, 16],
    // Torso
    [11, 23], [12, 24],
    [23, 24],
    // Left leg
    [23, 25], [25, 27], [27, 29], [29, 31],
    // Right leg
    [24, 26], [26, 28], [28, 30], [30, 32],
  ];

  const getLandmark = (idx: number) => body.landmarks.find((l, i) => i === idx);

  for (const [startIdx, endIdx] of connections) {
    const start = getLandmark(startIdx);
    const end = getLandmark(endIdx);

    if (start && end && start.confidence > 0.4 && end.confidence > 0.4) {
      ctx.beginPath();
      ctx.moveTo(start.point.x, start.point.y);
      ctx.lineTo(end.point.x, end.point.y);
      ctx.stroke();
    }
  }

  // Draw joint points
  for (const landmark of body.landmarks) {
    if (landmark.confidence > 0.4) {
      ctx.beginPath();
      ctx.arc(landmark.point.x, landmark.point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw pose label
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px monospace';
  const hips = body.landmarks.find((l, i) => i === 23);
  if (hips) {
    ctx.fillText(`Pose: ${body.pose}`, hips.point.x, hips.point.y - 20);
  }

  ctx.restore();
}

/**
 * Draw hand debug visualization
 */
function drawHandDebug(ctx: CanvasRenderingContext2D, hand: HandTrackingData) {
  ctx.save();
  const color = hand.handedness === 'left' ? '#ffaa00' : '#00aaff';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  // Draw finger connections
  const connections = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
  ];

  for (const [start, end] of connections) {
    const startPoint = hand.landmarks[start]?.point;
    const endPoint = hand.landmarks[end]?.point;

    if (startPoint && endPoint) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    }
  }

  // Draw landmark points
  for (const landmark of hand.landmarks) {
    ctx.beginPath();
    ctx.arc(landmark.point.x, landmark.point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw gesture label
  const wrist = hand.landmarks[0]?.point;
  if (wrist) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(
      `${hand.handedness === 'left' ? 'L' : 'R'}: ${hand.gesture}`,
      wrist.x,
      wrist.y - 15
    );
  }

  ctx.restore();
}

export default DebugOverlay;
