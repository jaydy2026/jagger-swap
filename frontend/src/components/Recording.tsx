'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Video, VideoOff, Camera, Download, Trash2, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface RecordingProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  maxDuration?: number; // seconds
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordings: Recording[];
}

interface Recording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
}

/**
 * Recording Component
 * 
 * Allows users to record animated output and capture screenshots.
 */
export function Recording({
  canvasRef,
  isActive,
  maxDuration = 300, // 5 minutes default
}: RecordingProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    recordings: [],
  });

  // Cleanup recordings on unmount
  useEffect(() => {
    return () => {
      state.recordings.forEach(rec => URL.revokeObjectURL(rec.url));
    };
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const stream = canvas.captureStream(30); // 30 FPS

    // Create MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);

      const recording: Recording = {
        id: `rec_${Date.now()}`,
        blob,
        url,
        duration: state.duration,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        recordings: [...prev.recordings, recording],
        isRecording: false,
        isPaused: false,
        duration: 0,
      }));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Collect data every 100ms

    // Start timer
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.duration >= maxDuration) {
          stopRecording();
          return prev;
        }
        return { ...prev, duration: prev.duration + 1 };
      });
    }, 1000);

    setState(prev => ({
      ...prev,
      isRecording: true,
      isPaused: false,
      duration: 0,
    }));
  }, [canvasRef, maxDuration, state.duration]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
    }));
  }, []);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();

      timerRef.current = setInterval(() => {
        setState(prev => {
          if (prev.duration >= maxDuration) {
            stopRecording();
            return prev;
          }
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);

      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [maxDuration, stopRecording]);

  /**
   * Capture screenshot
   */
  const captureScreenshot = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `jagger-swap-${Date.now()}.png`;
    link.click();
  }, [canvasRef]);

  /**
   * Delete recording
   */
  const deleteRecording = useCallback((id: string) => {
    setState(prev => {
      const recording = prev.recordings.find(r => r.id === id);
      if (recording) {
        URL.revokeObjectURL(recording.url);
      }
      return {
        ...prev,
        recordings: prev.recordings.filter(r => r.id !== id),
      };
    });
  }, []);

  /**
   * Download recording
   */
  const downloadRecording = useCallback((recording: Recording) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = `jagger-swap-${Date.now()}.webm`;
    link.click();
  }, []);

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording controls */}
        <div className="flex flex-col gap-2">
          {!state.isRecording ? (
            <>
              <Button
                onClick={startRecording}
                disabled={!isActive}
                variant="primary"
                className="w-full"
              >
                <Video className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
              <Button
                onClick={captureScreenshot}
                disabled={!isActive}
                variant="secondary"
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Screenshot
              </Button>
            </>
          ) : (
            <>
              {/* Recording indicator */}
              <div className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 p-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-sm font-medium text-red-500">
                  REC {formatDuration(state.duration)} / {formatDuration(maxDuration)}
                </span>
              </div>

              <div className="flex gap-2">
                {state.isPaused ? (
                  <Button
                    onClick={resumeRecording}
                    variant="primary"
                    className="flex-1"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={pauseRecording}
                    variant="secondary"
                    className="flex-1"
                  >
                    <VideoOff className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <VideoOff className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Recordings list */}
        {state.recordings.length > 0 && (
          <div className="space-y-2">
            <div className="border-t pt-4">
              <h4 className="mb-2 text-sm font-medium">Saved Recordings</h4>
              <div className="space-y-2">
                {state.recordings.map(recording => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">
                        {formatDuration(recording.duration)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {recording.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => downloadRecording(recording)}
                        className="rounded p-1 hover:bg-muted"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteRecording(recording.id)}
                        className="rounded p-1 hover:bg-muted text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Max duration info */}
        <p className="text-xs text-muted-foreground">
          Max recording: {formatDuration(maxDuration)} ({Math.round(maxDuration / 60)} min)
        </p>
      </CardContent>
    </Card>
  );
}

export default Recording;
