'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { PortraitAnimationEngine } from '@/lib/animation/portrait-animation-engine';
import { PortraitIdentity } from '@/lib/session';
import { AnimationResult, AnimationState } from '@/lib/animation/types';

/**
 * Portrait Animation State
 */
export interface PortraitAnimationState {
  isInitialized: boolean;
  isAnimating: boolean;
  isLoading: boolean;
  error: string | null;
  fps: number;
  renderTime: number;
  currentFrame: string | null;
  issues: string[];
}

/**
 * usePortraitAnimation Hook
 * 
 * Provides a React interface for portrait animation.
 */
export function usePortraitAnimation(videoElement: HTMLVideoElement | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PortraitAnimationEngine | null>(null);
  
  const [state, setState] = useState<PortraitAnimationState>({
    isInitialized: false,
    isAnimating: false,
    isLoading: false,
    error: null,
    fps: 0,
    renderTime: 0,
    currentFrame: null,
    issues: [],
  });
  
  // Initialize animation engine
  const initialize = useCallback(async (portrait: PortraitIdentity, canvas: HTMLCanvasElement) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Create engine
      const engine = new PortraitAnimationEngine(canvas);
      engineRef.current = engine;
      
      // Initialize with portrait
      await engine.initialize(portrait);
      
      // Subscribe to frames
      engine.subscribe({
        id: 'react-hook',
        onFrame: (result: AnimationResult) => {
          setState(prev => ({
            ...prev,
            fps: result.fps,
            renderTime: result.renderTime,
            currentFrame: result.frame,
            issues: result.quality.issues,
          }));
        },
        onEvent: (event) => {
          if (event.type === 'error') {
            setState(prev => ({
              ...prev,
              error: event.data as string,
            }));
          }
        },
      });
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      }));
    }
  }, []);
  
  // Start animation
  const start = useCallback(async () => {
    if (!engineRef.current || !videoElement) {
      setState(prev => ({ ...prev, error: 'Engine or video not ready' }));
      return;
    }
    
    try {
      // Set video source
      engineRef.current.setVideoSource(videoElement);
      
      // Start
      engineRef.current.start();
      
      setState(prev => ({
        ...prev,
        isAnimating: true,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start',
      }));
    }
  }, [videoElement]);
  
  // Stop animation
  const stop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setState(prev => ({ ...prev, isAnimating: false }));
    }
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);
  
  return {
    // State
    ...state,
    
    // Refs
    canvasRef,
    
    // Methods
    initialize,
    start,
    stop,
    
    // Direct access to engine (for advanced usage)
    engine: engineRef.current,
  };
}

export default usePortraitAnimation;
