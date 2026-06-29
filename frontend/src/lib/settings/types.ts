/**
 * Settings Types
 * 
 * Defines all settings for JAGGER SWAP.
 */

/**
 * Animation Quality Settings
 */
export interface QualitySettings {
  resolution: 'low' | 'medium' | 'high';
  targetFps: number;
  smoothingLevel: 'low' | 'medium' | 'high';
  enableInterpolation: boolean;
  enableMotionPrediction: boolean;
  qualityMode: 'performance' | 'balanced' | 'quality';
}

/**
 * Camera Settings
 */
export interface CameraSettings {
  deviceId: string;
  resolution: 'low' | 'medium' | 'high';
  facingMode: 'user' | 'environment';
}

/**
 * Recording Settings
 */
export interface RecordingSettings {
  format: 'webm' | 'mp4';
  quality: 'low' | 'medium' | 'high';
  includeAudio: boolean;
  maxDuration: number; // seconds
}

/**
 * Debug Settings
 */
export interface DebugSettings {
  showDebugOverlay: boolean;
  showFaceLandmarks: boolean;
  showBodySkeleton: boolean;
  showHandLandmarks: boolean;
  showPerformanceMetrics: boolean;
  logTrackingData: boolean;
}

/**
 * All Settings
 */
export interface AppSettings {
  quality: QualitySettings;
  camera: CameraSettings;
  recording: RecordingSettings;
  debug: DebugSettings;
}

/**
 * Default Settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  quality: {
    resolution: 'high',
    targetFps: 30,
    smoothingLevel: 'medium',
    enableInterpolation: true,
    enableMotionPrediction: true,
    qualityMode: 'balanced',
  },
  camera: {
    deviceId: '',
    resolution: 'high',
    facingMode: 'user',
  },
  recording: {
    format: 'webm',
    quality: 'medium',
    includeAudio: false,
    maxDuration: 300, // 5 minutes
  },
  debug: {
    showDebugOverlay: false,
    showFaceLandmarks: false,
    showBodySkeleton: false,
    showHandLandmarks: false,
    showPerformanceMetrics: false,
    logTrackingData: false,
  },
};

/**
 * Resolution mapping
 */
export const RESOLUTION_MAP = {
  low: { width: 640, height: 480 },
  medium: { width: 1280, height: 720 },
  high: { width: 1920, height: 1080 },
} as const;

/**
 * FPS limits
 */
export const FPS_LIMITS = [15, 24, 30, 60] as const;

/**
 * Recording quality mapping
 */
export const RECORDING_QUALITY_MAP = {
  low: { videoBitsPerSecond: 1000000, width: 640, height: 480 },
  medium: { videoBitsPerSecond: 2500000, width: 1280, height: 720 },
  high: { videoBitsPerSecond: 5000000, width: 1920, height: 1080 },
} as const;
