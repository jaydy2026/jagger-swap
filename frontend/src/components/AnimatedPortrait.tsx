/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Image as ImageIcon, Clock, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { UploadState } from '@/types';

interface AnimatedPortraitPanelProps {
  uploadedImage: UploadState;
  onUploadClick: () => void;
}

export function AnimatedPortraitPanel({
  uploadedImage,
  onUploadClick,
}: AnimatedPortraitPanelProps) {
  const hasImage = uploadedImage.preview !== null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Animated Portrait</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="video-container relative flex flex-col items-center justify-center">
          {hasImage ? (
            <>
              <img
                src={uploadedImage.preview!}
                alt="Uploaded portrait that will be animated"
                className="h-full w-full rounded-lg object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <button
                  onClick={onUploadClick}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Replace Image
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="placeholder-pulse mb-4 flex h-32 w-32 items-center justify-center rounded-lg">
                <ImageIcon className="h-16 w-16" />
              </div>
              <p className="mb-4 text-center text-sm">
                Upload a portrait to see the magic
              </p>
              <button
                onClick={onUploadClick}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Upload Image
              </button>
            </div>
          )}

          {/* Coming Soon Badge */}
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            <span>Coming Soon</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-muted-foreground">
            {hasImage
              ? 'Animation will appear here'
              : 'Upload an image to continue'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
