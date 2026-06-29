import React from 'react';
import { Video, VideoOff, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface WebcamPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  error: string | null;
}

export function WebcamPanel({ videoRef, isActive, error }: WebcamPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActive ? (
            <>
              <Video className="h-5 w-5 text-green-500" />
              <span>Live Camera</span>
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
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="h-full w-full rounded-lg object-cover"
            />
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
