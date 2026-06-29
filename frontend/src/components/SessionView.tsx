'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Header } from './Header';
import { WebcamPanel } from './WebcamPanel';
import { AnimatedPortraitPanel } from './AnimatedPortrait';
import { ImageUpload } from './ImageUpload';
import { ControlPanel } from './ControlPanel';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface SessionViewProps {
  onExit: () => void;
}

export function SessionView({ onExit }: SessionViewProps) {
  const webcam = useWebcam();
  const imageUpload = useImageUpload();
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = useCallback(
    (file: File) => {
      imageUpload.handleFileSelect(file);
    },
    [imageUpload]
  );

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
              {/* Left: Webcam */}
              <WebcamPanel
                videoRef={webcam.videoRef}
                isActive={webcam.state.isActive}
                error={webcam.state.error || webcam.error}
              />

              {/* Right: Animated Portrait */}
              <AnimatedPortraitPanel
                uploadedImage={imageUpload.state}
                onUploadClick={handleUploadClick}
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
              hasImage={imageUpload.state.preview !== null}
              onStartCamera={() => webcam.startCamera()}
              onStopCamera={webcam.stopCamera}
              onUploadClick={handleUploadClick}
              onReplaceImage={handleReplaceImage}
              onFullscreen={handleFullscreen}
              fps={fps}
              latency={latency}
            />

            {/* Image Upload Section (Mobile) */}
            <Card className="lg:hidden">
              <div className="p-4">
                <h3 className="mb-4 text-lg font-semibold">Upload Image</h3>
                <ImageUpload
                  state={imageUpload.state}
                  onFileSelect={handleFileSelect}
                  onClear={imageUpload.clearUpload}
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
