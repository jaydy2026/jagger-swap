/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Image as ImageIcon, Sparkles, RefreshCw, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { useSession } from '@/lib/session';
import { PortraitIdentity } from '@/lib/session/types';

interface AnimatedPortraitPanelProps {
  onUploadClick: () => void;
  videoElement?: HTMLVideoElement | null;
  onAnimationReady?: (canvas: HTMLCanvasElement) => void;
}

export function AnimatedPortraitPanel({
  onUploadClick,
  videoElement,
  onAnimationReady,
}: AnimatedPortraitPanelProps) {
  const { state } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [showAnimated, setShowAnimated] = useState(false);
  const [animationFps, setAnimationFps] = useState(0);
  const [animationError, setAnimationError] = useState<string | null>(null);

  const portrait = state.portrait;
  const isAnimating = state.isAnimationActive;

  // Expose canvas when portrait and video are ready
  useEffect(() => {
    if (portrait && videoElement && canvasRef.current && onAnimationReady) {
      onAnimationReady(canvasRef.current);
    }
  }, [portrait, videoElement, onAnimationReady]);

  // Auto-show animated view when animation starts
  useEffect(() => {
    if (isAnimating && portrait) {
      setShowAnimated(true);
    }
  }, [isAnimating, portrait]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Animated Portrait</span>
          {portrait && (
            <span className="ml-2 flex items-center gap-1 text-xs text-green-500">
              <Lock className="h-3 w-3" />
              IDENTITY LOCKED
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="video-container relative flex flex-col items-center justify-center">
          {portrait ? (
            <>
              {/* Show animated canvas or static portrait */}
              <div className="relative h-full w-full">
                {showAnimated ? (
                  <>
                    <canvas
                      ref={canvasRef}
                      className="h-full w-full rounded-lg object-contain"
                      style={{ display: portrait ? 'block' : 'none' }}
                    />
                    {/* Fallback image while canvas loads */}
                    <img
                      ref={imageRef}
                      src={portrait.imageData}
                      alt="Portrait"
                      className="h-full w-full rounded-lg object-contain"
                      style={{ display: 'none' }}
                      onError={() => {
                        setAnimationError('Failed to render animation');
                        setShowAnimated(false);
                      }}
                    />
                  </>
                ) : (
                  <img
                    src={portrait.imageData}
                    alt="Uploaded portrait"
                    className="h-full w-full rounded-lg object-contain"
                  />
                )}
              </div>

              {/* Overlay with replace button */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <button
                  onClick={onUploadClick}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Replace Image
                </button>
              </div>

              {/* Animation status badge */}
              {isAnimating && (
                <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-green-500/90 px-3 py-1 text-xs text-white shadow-lg">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  <span>ANIMATING</span>
                  <span className="font-mono">{animationFps.toFixed(0)} FPS</span>
                </div>
              )}

              {/* Error display */}
              {animationError && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-lg bg-red-500/90 px-3 py-2 text-xs text-white">
                  <AlertCircle className="h-4 w-4" />
                  <span>{animationError}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="placeholder-pulse mb-4 flex h-32 w-32 items-center justify-center rounded-lg">
                <ImageIcon className="h-16 w-16" />
              </div>
              <p className="mb-4 text-center text-sm">
                Upload a portrait to animate
              </p>
              <button
                onClick={onUploadClick}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ImageIcon className="h-4 w-4" />
                Upload Portrait
              </button>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${
              portrait 
                ? (isAnimating ? 'animate-pulse bg-green-500' : 'bg-yellow-500') 
                : 'bg-gray-500'
            }`} />
            <span className="text-muted-foreground">
              {portrait
                ? isAnimating
                  ? 'Portrait animated with your movements'
                  : 'Portrait loaded - start camera to animate'
                : 'Upload a portrait to begin'}
            </span>
          </div>

          {/* Identity lock indicator */}
          {portrait && (
            <div className="flex items-center justify-center gap-2 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              <span>Identity preserved throughout session</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
