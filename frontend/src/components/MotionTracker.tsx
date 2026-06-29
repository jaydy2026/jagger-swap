'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useMotionEngine, MotionEngineState } from '@/hooks';
import { DebugOverlay } from './DebugOverlay';

/**
 * MotionTracker Props
 */
export interface MotionTrackerProps {
  videoElement: HTMLVideoElement | null;
  onStateChange?: (state: MotionEngineState) => void;
  showDebug?: boolean;
  config?: {
    enableFaceTracking?: boolean;
    enableBodyTracking?: boolean;
    enableHandTracking?: boolean;
    smoothingLevel?: 'low' | 'medium' | 'high';
  };
}

/**
 * MotionTracker Component
 * 
 * Provides real-time motion capture with face, body, and hand tracking.
 * Wraps the motion engine with React state management.
 */
export function MotionTracker({
  videoElement,
  onStateChange,
  showDebug = false,
  config = {},
}: MotionTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDebugVisible, setIsDebugVisible] = React.useState(showDebug);

  // Initialize motion engine
  const {
    isInitialized,
    isRunning,
    isLoading,
    error,
    fps,
    trackingQuality,
    faces,
    bodies,
    hands,
    stats,
    initialize,
    start,
    stop,
    setDebugMode,
    updateConfig,
    setDebugCanvas,
  } = useMotionEngine(videoElement, {
    enableFaceTracking: config.enableFaceTracking ?? true,
    enableBodyTracking: config.enableBodyTracking ?? true,
    enableHandTracking: config.enableHandTracking ?? true,
    smoothingLevel: config.smoothingLevel ?? 'medium',
    showDebugOverlay: isDebugVisible,
  });

  // Set debug canvas when available
  useEffect(() => {
    if (canvasRef.current) {
      setDebugCanvas(canvasRef.current);
    }
  }, [setDebugCanvas]);

  // Update debug mode when changed
  useEffect(() => {
    setDebugMode(isDebugVisible);
  }, [isDebugVisible, setDebugMode]);

  // Update config when changed
  useEffect(() => {
    if (Object.keys(config).length > 0) {
      updateConfig(config);
    }
  }, [config, updateConfig]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({
      isInitialized,
      isRunning,
      isLoading,
      error,
      fps,
      trackingQuality,
      faces,
      bodies,
      hands,
      stats,
    });
  }, [
    isInitialized,
    isRunning,
    isLoading,
    error,
    fps,
    trackingQuality,
    faces,
    bodies,
    hands,
    stats,
    onStateChange,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    // State
    isInitialized,
    isRunning,
    isLoading,
    error,
    fps,
    trackingQuality,
    faces,
    bodies,
    hands,
    stats,
    
    // Methods
    initialize,
    start,
    stop,
    setDebugMode: setIsDebugVisible,
    updateConfig,
    
    // Debug
    debugCanvas: canvasRef,
    DebugOverlay: (
      <DebugOverlay
        videoElement={videoElement}
        faces={faces}
        bodies={bodies}
        hands={hands}
        fps={fps}
        trackingQuality={trackingQuality}
        processingTime={stats?.averageProcessingTime}
        isVisible={isDebugVisible}
        canvasRef={canvasRef}
      />
    ),
  };
}

export default MotionTracker;
