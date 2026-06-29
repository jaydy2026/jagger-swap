/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Image as ImageIcon, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { useSession } from '@/lib/session';
import { PortraitIdentity } from '@/lib/session/types';

interface AnimatedPortraitPanelProps {
  onUploadClick: () => void;
  renderFrame?: string | null;
  isAnimating?: boolean;
}

export function AnimatedPortraitPanel({
  onUploadClick,
  renderFrame,
  isAnimating = false,
}: AnimatedPortraitPanelProps) {
  const { state } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const portrait = state.portrait;

  // Render the animated frame when it changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = renderFrame;
  }, [renderFrame]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Animated Portrait</span>
          {isAnimating && (
            <span className="ml-2 flex items-center gap-1 text-xs text-green-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              LIVE
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="video-container relative flex flex-col items-center justify-center">
          {portrait ? (
            <>
              {/* Show animated frame or original portrait */}
              {renderFrame ? (
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={512}
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <img
                  src={portrait.imageData}
                  alt="Uploaded portrait"
                  className="h-full w-full rounded-lg object-contain"
                  onLoad={() => setImageLoaded(true)}
                />
              )}

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

              {/* Animation status */}
              {isAnimating && (
                <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-green-500/80 px-2 py-1 text-xs text-white">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Animating</span>
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
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <div className={`h-2 w-2 rounded-full ${portrait ? (isAnimating ? 'animate-pulse bg-green-500' : 'bg-yellow-500') : 'bg-gray-500'}`} />
          <span className="text-muted-foreground">
            {portrait
              ? isAnimating
                ? 'Portrait animated with your movements'
                : 'Portrait loaded - start camera to animate'
              : 'Upload a portrait to begin'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
