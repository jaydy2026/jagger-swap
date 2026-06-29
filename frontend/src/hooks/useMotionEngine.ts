'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MotionEngine,
  MotionEngineConfig,
  MotionFrame,
  MotionSubscriber,
  TrackingStats,
  FaceTrackingData,
  BodyPoseData,
  HandTrackingData,
  TrackingQuality,
} from '@/lib/motion';

/**
 * Motion Engine State
 */
export interface MotionEngineState {
  isInitialized: boolean;
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  fps: number;
  trackingQuality: TrackingQuality | null;
  faces: FaceTrackingData[];
  bodies: BodyPoseData[];
  hands: HandTrackingData[];
  stats: TrackingStats | null;
}

/**
 * Motion Engine Hook
 * 
 * Provides a React interface to the MotionEngine for use in components.
 * Handles lifecycle management and provides state updates.
 */
export function useMotionEngine(
  videoElement: HTMLVideoElement | null,
  config: Partial<MotionEngineConfig> = {}
) {
  const engineRef = useRef<MotionEngine | null>(null);
  const subscriberIdRef = useRef<string>(`hook-${Date.now()}`);
  
  const [state, setState] = useState<MotionEngineState>({
    isInitialized: false,
    isRunning: false,
    isLoading: false,
    error: null,
    fps: 0,
    trackingQuality: null,
    faces: [],
    bodies: [],
    hands: [],
    stats: null,
  });

  // Initialize engine
  useEffect(() => {
    if (engineRef.current) return;

    const engine = new MotionEngine(config);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Set video element when available
  useEffect(() => {
    if (videoElement && engineRef.current) {
      engineRef.current.setVideoElement(videoElement);
    }
  }, [videoElement]);

  // Create motion callback
  const handleMotion = useCallback((frame: MotionFrame) => {
    setState((prev) => ({
      ...prev,
      faces: frame.faces,
      bodies: frame.bodies,
      hands: frame.hands,
      fps: frame.fps,
      trackingQuality: frame.trackingQuality,
    }));
  }, []);

  // Create event callback
  const handleEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'error':
        setState((prev) => ({
          ...prev,
          error: event.data as string,
        }));
        break;
      case 'ready':
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
        }));
        break;
      case 'stopped':
        setState((prev) => ({
          ...prev,
          isRunning: false,
        }));
        break;
    }
  }, []);

  // Subscribe to motion engine
  useEffect(() => {
    if (!engineRef.current) return;

    const subscriber: MotionSubscriber = {
      id: subscriberIdRef.current,
      onMotion: handleMotion,
      onEvent: handleEvent,
    };

    const unsubscribe = engineRef.current.subscribe(subscriber);

    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (engineRef.current) {
        setState((prev) => ({
          ...prev,
          stats: engineRef.current!.getTrackingStats(),
        }));
      }
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, [handleMotion, handleEvent]);

  // Initialize method
  const initialize = useCallback(async () => {
    if (!engineRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await engineRef.current.initialize(config);
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      }));
    }
  }, [config]);

  // Start method
  const start = useCallback(async () => {
    if (!engineRef.current || !videoElement) {
      setState((prev) => ({
        ...prev,
        error: 'Engine or video not ready',
      }));
      return;
    }

    try {
      if (!state.isInitialized) {
        await initialize();
      }
      await engineRef.current.start();
      setState((prev) => ({ ...prev, isRunning: true, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start',
      }));
    }
  }, [videoElement, state.isInitialized, initialize]);

  // Stop method
  const stop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setState((prev) => ({ ...prev, isRunning: false }));
    }
  }, []);

  // Set debug mode
  const setDebugMode = useCallback((enabled: boolean) => {
    if (engineRef.current) {
      engineRef.current.setDebugMode(enabled);
    }
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<MotionEngineConfig>) => {
    if (engineRef.current) {
      engineRef.current.updateConfig(newConfig);
    }
  }, []);

  // Set debug canvas
  const setDebugCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (engineRef.current && canvas) {
      engineRef.current.setDebugCanvas(canvas);
    }
  }, []);

  return {
    // State
    ...state,
    
    // Methods
    initialize,
    start,
    stop,
    setDebugMode,
    updateConfig,
    setDebugCanvas,
    
    // Direct access to engine (for advanced usage)
    engine: engineRef.current,
  };
}

export default useMotionEngine;
