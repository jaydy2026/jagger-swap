'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { MotionEngine, FaceTrackingData, BodyPoseData, HandTrackingData } from '@/lib/motion';

export default function DebugPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MotionEngine | null>(null);
  
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motionData, setMotionData] = useState<{
    faces: FaceTrackingData[];
    bodies: BodyPoseData[];
    hands: HandTrackingData[];
    fps: number;
    timestamp: number;
  } | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Initialize motion engine
        const engine = new MotionEngine({
          enableFaceTracking: true,
          enableBodyTracking: true,
          enableHandTracking: true,
          targetFps: 30,
          smoothingLevel: 'medium',
          showDebugOverlay: true,
        });
        
        engineRef.current = engine;
        
        // Subscribe to motion data
        engine.subscribe({
          id: 'debug-page',
          onMotion: (frame) => {
            setMotionData({
              faces: frame.faces,
              bodies: frame.bodies,
              hands: frame.hands,
              fps: frame.fps,
              timestamp: frame.timestamp,
            });
          },
          onEvent: (event) => {
            if (event.type === 'error') {
              console.error('[Debug] Motion error:', event.data);
            }
          },
        });
        
        // Initialize and start
        await engine.initialize();
        engine.setVideoElement(videoRef.current);
        engine.setDebugCanvas(canvasRef.current!);
        await engine.start();
        
        setIsTracking(true);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start camera');
      console.error('Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.dispose();
      engineRef.current = null;
    }
    
    setIsTracking(false);
    setMotionData(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">JAGGER SWAP - Tracking Debug Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Webcam with debug overlay */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Live Camera with Tracking</h2>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              {!isTracking && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>
            
            {isTracking && (
              <button
                onClick={stopCamera}
                className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
              >
                Stop Camera
              </button>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
          
          {/* Right: Motion data */}
          <div>
            <h2 className="text-xl font-semibold mb-3">MotionFrame Data</h2>
            <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-[500px]">
              {motionData ? (
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify({
                    timestamp: motionData.timestamp.toFixed(2),
                    fps: motionData.fps.toFixed(1),
                    faces: motionData.faces.length,
                    bodies: motionData.bodies.length,
                    hands: motionData.hands.length,
                    faceDetails: motionData.faces[0] ? {
                      id: motionData.faces[0].id,
                      confidence: motionData.faces[0].confidence.toFixed(2),
                      headPose: {
                        yaw: motionData.faces[0].headPose.yaw.toFixed(1),
                        pitch: motionData.faces[0].headPose.pitch.toFixed(1),
                        roll: motionData.faces[0].headPose.roll.toFixed(1),
                      },
                      leftEye: {
                        openness: motionData.faces[0].leftEye.openness.toFixed(2),
                        isBlinking: motionData.faces[0].leftEye.isBlinking,
                      },
                      rightEye: {
                        openness: motionData.faces[0].rightEye.openness.toFixed(2),
                        isBlinking: motionData.faces[0].rightEye.isBlinking,
                      },
                      mouth: {
                        openness: motionData.faces[0].mouth.openness.toFixed(2),
                        smile: motionData.faces[0].mouth.smile.toFixed(2),
                      },
                      expressions: motionData.faces[0].expressions,
                    } : null,
                    bodyDetails: motionData.bodies[0] ? {
                      id: motionData.bodies[0].id,
                      confidence: motionData.bodies[0].confidence.toFixed(2),
                      pose: motionData.bodies[0].pose,
                      shoulders: motionData.bodies[0].upperBody?.shoulders ? {
                        left: {
                          x: motionData.bodies[0].upperBody!.shoulders.left.x.toFixed(0),
                          y: motionData.bodies[0].upperBody!.shoulders.left.y.toFixed(0),
                        },
                        right: {
                          x: motionData.bodies[0].upperBody!.shoulders.right.x.toFixed(0),
                          y: motionData.bodies[0].upperBody!.shoulders.right.y.toFixed(0),
                        },
                        roll: motionData.bodies[0].upperBody!.shoulders.roll.toFixed(1),
                      } : null,
                    } : null,
                    handDetails: motionData.hands.map(h => ({
                      id: h.id,
                      handedness: h.handedness,
                      gesture: h.gesture,
                      confidence: h.confidence.toFixed(2),
                    })),
                  }, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-400">No tracking data yet. Start camera to see data.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Face Detected"
            value={motionData?.faces.length ? 'YES' : 'NO'}
            active={!!motionData?.faces.length}
          />
          <StatusCard
            title="Body Detected"
            value={motionData?.bodies.length ? 'YES' : 'NO'}
            active={!!motionData?.bodies.length}
          />
          <StatusCard
            title="Hands Detected"
            value={(motionData?.hands?.length || 0).toString()}
            active={!!motionData?.hands?.length}
          />
          <StatusCard
            title="FPS"
            value={motionData?.fps.toFixed(0) || '0'}
            active={true}
          />
        </div>
        
        {/* Face landmark count */}
        {motionData?.faces[0] && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Face Landmarks ({motionData.faces[0].landmarks.points.length})</h2>
            <p className="text-gray-400 text-sm">
              Each face has 468 landmarks. The debug overlay shows a subset for visualization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ title, value, active }: { title: string; value: string; active: boolean }) {
  return (
    <div className={`p-4 rounded-lg ${active ? 'bg-green-900/30 border border-green-700' : 'bg-gray-800 border border-gray-700'}`}>
      <p className="text-sm text-gray-400">{title}</p>
      <p className={`text-2xl font-bold ${active ? 'text-green-400' : 'text-gray-500'}`}>{value}</p>
    </div>
  );
}
