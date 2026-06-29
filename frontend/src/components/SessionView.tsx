'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import { useSession } from '@/lib/session';
import { PortraitAnimationEngine } from '@/lib/animation';
import { Header } from './Header';
import { WebcamPanel } from './WebcamPanel';
import { AnimatedPortraitPanel } from './AnimatedPortrait';
import { ImageUpload } from './ImageUpload';
import { ControlPanel } from './ControlPanel';
import { Card } from './ui/Card';

interface SessionViewProps {
  onExit: () => void;
}

export function SessionView({ onExit }: SessionViewProps) {
  const webcam = useWebcam();
  const { state: sessionState, setPortrait, setAnimationStatus, clearPortrait } = useSession();
  
  const animationEngineRef = useRef<PortraitAnimationEngine | null>(null);
  const animationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [showDebug, setShowDebug] = useState(false);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle portrait upload
  const handleFileSelect = useCallback(
    async (file: File) => {
      try {
        // Create object URL for preview
        const preview = URL.createObjectURL(file);
        
        // Create portrait identity
        const img = new Image();
        img.onload = () => {
          setPortrait({
            id: `portrait_${Date.now()}`,
            imageData: preview,
            originalDimensions: { width: img.width, height: img.height },
            aspectRatio: img.width / img.height,
            metadata: {
              uploadedAt: Date.now(),
              filename: file.name,
              format: file.type.split('/')[1] as 'png' | 'jpeg' | 'jpg',
              fileSize: file.size,
            },
          });
        };
        img.src = preview;
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    },
    [setPortrait]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReplaceImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  }, []);

  const handleToggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
  }, []);

  // Handle animation canvas ready
  const handleAnimationCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    animationCanvasRef.current = canvas;
    
    // If we have both portrait and video, initialize animation
    if (sessionState.portrait && webcam.videoRef.current) {
      initializeAnimation(canvas);
    }
  }, [sessionState.portrait, webcam.videoRef.current]);

  // Initialize animation engine
  const initializeAnimation = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!sessionState.portrait || !webcam.videoRef.current) return;
    
    try {
      // Create animation engine
      const engine = new PortraitAnimationEngine(canvas);
      animationEngineRef.current = engine;
      
      // Initialize with portrait
      await engine.initialize(sessionState.portrait);
      
      // Set video source
      engine.setVideoSource(webcam.videoRef.current);
      
      // Subscribe to frames for FPS/latency updates
      engine.subscribe({
        id: 'session-view',
        onFrame: (result) => {
          setFps(result.fps);
          setLatency(result.renderTime);
        },
        onEvent: (event) => {
          if (event.type === 'error') {
            console.error('Animation error:', event.data);
          }
        },
      });
      
      // Start animation
      engine.start();
      setAnimationStatus(true, fps, latency);
    } catch (error) {
      console.error('Failed to initialize animation:', error);
    }
  }, [sessionState.portrait, webcam.videoRef.current, setAnimationStatus, fps, latency]);

  // Start animation when both portrait and webcam are ready
  useEffect(() => {
    if (sessionState.portrait && webcam.state.isActive && webcam.videoRef.current && animationCanvasRef.current) {
      if (!animationEngineRef.current) {
        initializeAnimation(animationCanvasRef.current);
      }
    }
  }, [sessionState.portrait, webcam.state.isActive, webcam.videoRef.current, initializeAnimation]);

  // Stop animation when camera stops
  useEffect(() => {
    if (!webcam.state.isActive && animationEngineRef.current) {
      animationEngineRef.current.stop();
      setAnimationStatus(false);
    }
  }, [webcam.state.isActive, setAnimationStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationEngineRef.current) {
        animationEngineRef.current.dispose();
        animationEngineRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Back button */}
        <button
          onClick={onExit}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
          {/* Left Panel - Main Content Area */}
          <div className="space-y-6">
            {/* Two-panel layout */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left: Webcam (Motion Source) */}
              <WebcamPanel
                videoRef={webcam.videoRef}
                isActive={webcam.state.isActive}
                error={webcam.state.error || webcam.error}
                showDebugOverlay={showDebug}
              />

              {/* Right: Animated Portrait (Identity Display) */}
              <AnimatedPortraitPanel
                onUploadClick={handleUploadClick}
                videoElement={webcam.videoRef.current}
                onAnimationReady={handleAnimationCanvasReady}
              />
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />
          </div>

          {/* Right Panel - Controls */}
          <div className="space-y-4">
            <ControlPanel
              isCameraActive={webcam.state.isActive}
              hasImage={sessionState.portrait !== null}
              onStartCamera={() => webcam.startCamera()}
              onStopCamera={webcam.stopCamera}
              onUploadClick={handleUploadClick}
              onReplaceImage={handleReplaceImage}
              onFullscreen={handleFullscreen}
              fps={fps}
              latency={latency}
              onToggleDebug={handleToggleDebug}
              showDebug={showDebug}
            />

            {/* Image Upload Section (Mobile) */}
            <Card className="lg:hidden">
              <div className="p-4">
                <h3 className="mb-4 text-lg font-semibold">Upload Image</h3>
                <ImageUpload
                  state={{ preview: sessionState.portrait?.imageData || null, file: null, error: null }}
                  onFileSelect={handleFileSelect}
                  onClear={clearPortrait}
                  onReplace={handleReplaceImage}
                />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
