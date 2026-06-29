'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Video, VideoOff, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { MotionEngine, MotionEngineConfig, FaceTrackingData, BodyPoseData, HandTrackingData, TrackingQuality } from '@/lib/motion';

interface WebcamPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  error: string | null;
  showDebugOverlay?: boolean;
  debugCanvasRef?: React.RefObject<HTMLCanvasElement>;
  onTrackingData?: (data: {
    faces: FaceTrackingData[];
    bodies: BodyPoseData[];
    hands: HandTrackingData[];
    fps: number;
    trackingQuality: TrackingQuality | null;
  }) => void;
  motionConfig?: Partial<MotionEngineConfig>;
}

export function WebcamPanel({
  videoRef,
  isActive,
  error,
  showDebugOverlay = false,
  debugCanvasRef,
  onTrackingData,
  motionConfig,
}: WebcamPanelProps) {
  const engineRef = useRef<MotionEngine | null>(null);
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality | null>(null);
  const [faces, setFaces] = useState<FaceTrackingData[]>([]);
  const [bodies, setBodies] = useState<BodyPoseData[]>([]);
  const [hands, setHands] = useState<HandTrackingData[]>([]);

  // Initialize motion engine
  useEffect(() => {
    const config: MotionEngineConfig = {
      enableFaceTracking: motionConfig?.enableFaceTracking ?? true,
      enableBodyTracking: motionConfig?.enableBodyTracking ?? true,
      enableHandTracking: motionConfig?.enableHandTracking ?? true,
      targetFps: motionConfig?.targetFps ?? 30,
      maxFaces: motionConfig?.maxFaces ?? 1,
      smoothingLevel: motionConfig?.smoothingLevel ?? 'medium',
      showDebugOverlay,
      debugCanvasId: 'webcam-debug-canvas',
      temporalSmoothing: 0.5,
      landmarkSmoothing: 0.5,
      velocityFilter: 0.3,
      minFaceConfidence: 0.5,
      minBodyConfidence: 0.4,
      minHandConfidence: 0.5,
    };

    const engine = new MotionEngine(config);
    engineRef.current = engine;

    // Subscribe to motion data
    engine.subscribe({
      id: 'webcam-panel',
      onMotion: (frame) => {
        setFaces(frame.faces);
        setBodies(frame.bodies);
        setHands(frame.hands);
        setFps(frame.fps);
        setTrackingQuality(frame.trackingQuality);

        // Notify parent
        onTrackingData?.({
          faces: frame.faces,
          bodies: frame.bodies,
          hands: frame.hands,
          fps: frame.fps,
          trackingQuality: frame.trackingQuality,
        });

        // Render debug overlay if enabled
        if (showDebugOverlay && (debugCanvasRef?.current || localCanvasRef.current)) {
          engine.renderDebugOverlay(debugCanvasRef?.current || localCanvasRef.current!);
        }
      },
      onEvent: (event) => {
        if (event.type === 'error') {
          console.error('[WebcamPanel] Motion error:', event.data);
        }
      },
    });

    return () => {
      engine.stop();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Set video element and start tracking when camera becomes active
  useEffect(() => {
    if (isActive && videoRef.current && engineRef.current) {
      engineRef.current.setVideoElement(videoRef.current);
      
      // Set debug canvas
      if (debugCanvasRef?.current) {
        engineRef.current.setDebugCanvas(debugCanvasRef.current);
      } else if (localCanvasRef.current) {
        engineRef.current.setDebugCanvas(localCanvasRef.current);
      }

      // Initialize and start
      engineRef.current.initialize().then(() => {
        engineRef.current?.start();
        setIsTracking(true);
      });
    } else if (!isActive && engineRef.current) {
      engineRef.current.stop();
      setIsTracking(false);
    }
  }, [isActive, videoRef.current, debugCanvasRef?.current]);

  // Update debug mode
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDebugMode(showDebugOverlay);
    }
  }, [showDebugOverlay]);

  // Determine which canvas to use
  const canvasElement = debugCanvasRef?.current || localCanvasRef.current;
  const showCanvas = showDebugOverlay && isActive;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActive ? (
            <>
              <Video className="h-5 w-5 text-green-500" />
              <span>Live Camera</span>
              {isTracking && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Tracking {fps.toFixed(0)} FPS
                </span>
              )}
            </>
          ) : (
            <>
              <VideoOff className="h-5 w-5 text-muted-foreground" />
              <span>Camera Off</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="video-container relative flex items-center justify-center">
          {isActive ? (
            <>
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                autoPlay
                playsInline
                muted
                className="h-full w-full rounded-lg object-cover"
              />
              {/* Debug overlay canvas */}
              {showCanvas && (
                <canvas
                  ref={localCanvasRef}
                  className="absolute inset-0 h-full w-full rounded-lg"
                />
              )}
              {/* Debug status indicators */}
              {showDebugOverlay && trackingQuality && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <span className={`h-2 w-2 rounded-full ${trackingQuality.faceDetected ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className={`h-2 w-2 rounded-full ${trackingQuality.bodyDetected ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className={`h-2 w-2 rounded-full ${trackingQuality.handsDetected?.left ? 'bg-yellow-500' : 'bg-gray-600'}`} />
                  <span className={`h-2 w-2 rounded-full ${trackingQuality.handsDetected?.right ? 'bg-blue-500' : 'bg-gray-600'}`} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              {error ? (
                <>
                  <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                  <p className="text-center text-sm">{error}</p>
                </>
              ) : (
                <>
                  <VideoOff className="mb-4 h-12 w-12" />
                  <p className="text-center text-sm">
                    Click &quot;Start Camera&quot; to begin
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
