/**
 * Animation Engine Types
 * 
 * Defines interfaces for the animation engine that applies
 * motion data to uploaded portrait images.
 */

import { MotionFrame } from '@/lib/motion';
import { PortraitIdentity, AnimationParameters, BlendShapes } from '@/lib/session';

// ============================================
// Animation Engine
// ============================================

export interface AnimationEngineConfig {
  // Rendering
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  
  // Quality
  maxFPS: number;
  interpolationFrames: number;
  
  // Effects
  enableSmoothing: boolean;
  enableTemporalSmoothing: boolean;
  smoothingFactor: number;
  
  // Debug
  showDebugOverlay: boolean;
  debugFaceLandmarks: boolean;
  debugBodySkeleton: boolean;
}

// ============================================
// Animation Result
// ============================================

export interface AnimationResult {
  // Rendered frame as data URL
  frame: string;
  
  // Performance
  fps: number;
  renderTime: number;
  
  // Quality
  quality: AnimationQuality;
}

export interface AnimationQuality {
  // Overall quality score (0-1)
  score: number;
  
  // Identity preservation
  identityPreserved: boolean;
  
  // Motion accuracy
  motionAccuracy: number;
  
  // Smoothness
  smoothness: number;
  
  // Issues
  issues: string[];
}

// ============================================
// Animation Events
// ============================================

export type AnimationEventType =
  | 'frame'
  | 'started'
  | 'stopped'
  | 'error'
  | 'portrait_loaded'
  | 'portrait_detected';

export interface AnimationEvent {
  type: AnimationEventType;
  timestamp: number;
  data?: AnimationResult | string | Error;
}

// ============================================
// Subscriber Interface
// ============================================

export interface AnimationSubscriber {
  id: string;
  onFrame: (result: AnimationResult) => void;
  onEvent: (event: AnimationEvent) => void;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_ANIMATION_CONFIG: AnimationEngineConfig = {
  canvasWidth: 512,
  canvasHeight: 512,
  backgroundColor: 'transparent',
  maxFPS: 30,
  interpolationFrames: 2,
  enableSmoothing: true,
  enableTemporalSmoothing: true,
  smoothingFactor: 0.5,
  showDebugOverlay: false,
  debugFaceLandmarks: false,
  debugBodySkeleton: false,
};

// ============================================
// Animation Method Types
// ============================================

export type AnimationMethod =
  | 'blend_shapes'    // Apply blend shapes to 2D/3D model
  | 'landmark_warp'   // Warp image based on landmarks
  | 'neural_network' // Deep learning based (future)
  | 'parametric'     // Parametric model animation
  | 'hybrid';        // Combination of methods

// ============================================
// Portrait Detection Result
// ============================================

export interface PortraitDetectionResult {
  // Detected features
  faceBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  faceLandmarks: Array<{ x: number; y: number; z?: number }>;
  
  bodyBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Detection confidence
  confidence: number;
  
  // Image quality
  imageQuality: {
    sharpness: number;
    brightness: number;
    contrast: number;
  };
}

// ============================================
// Frame Interpolation
// ============================================

export interface InterpolatedFrame {
  previousParams: AnimationParameters;
  nextParams: AnimationParameters;
  alpha: number;
  interpolatedParams: AnimationParameters;
}

// ============================================
// Status
// ============================================

export type AnimationStatus =
  | 'idle'
  | 'loading_portrait'
  | 'detecting'
  | 'ready'
  | 'animating'
  | 'paused'
  | 'error';

export interface AnimationState {
  status: AnimationStatus;
  currentFPS: number;
  totalFrames: number;
  error: string | null;
  portraitLoaded: boolean;
  portraitDetected: boolean;
}
