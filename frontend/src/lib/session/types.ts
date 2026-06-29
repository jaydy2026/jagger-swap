/**
 * Session Types
 * 
 * Defines the data structures for session management,
 * including portrait identity and session state.
 */

import { BoundingBox, Point2D, Point3D } from '@/lib/motion';

// ============================================
// Portrait / Identity
// ============================================

export interface PortraitIdentity {
  id: string;
  imageData: string;          // Base64 or blob URL
  originalDimensions: {
    width: number;
    height: number;
  };
  aspectRatio: number;
  detectedFeatures?: {
    faceRegion?: BoundingBox;
    bodyRegion?: BoundingBox;
    landmarks?: Point2D[];
  };
  metadata: {
    uploadedAt: number;
    filename: string;
    format: 'png' | 'jpeg' | 'jpg';
    fileSize: number;
  };
}

// ============================================
// Animation Parameters
// ============================================

export interface AnimationParameters {
  // Frame info
  frameId: number;
  timestamp: number;
  
  // Head motion
  headRotation: Point3D;      // pitch, yaw, roll
  headPosition: Point2D;     // x, y offset
  
  // Blend shapes (normalized 0-1)
  blendShapes: BlendShapes;
  
  // Body
  bodyPose: {
    shoulders: Point2D[];
    spine: number;            // curvature
    pose: 'standing' | 'sitting' | 'walking' | 'leaning' | 'unknown';
  };
  
  // Hands
  leftHand: {
    position: Point2D;
    rotation: Point3D;
    gesture: string;
    fingers: number[];        // extension per finger
  } | null;
  
  rightHand: {
    position: Point2D;
    rotation: Point3D;
    gesture: string;
    fingers: number[];
  } | null;
  
  // Quality
  confidence: number;
}

export interface BlendShapes {
  // Eye shapes
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeLookUp: number;
  eyeLookDown: number;
  eyeLookLeft: number;
  eyeLookRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;
  
  // Jaw/Mouth shapes
  jawOpen: number;
  jawForward: number;
  jawLeft: number;
  jawRight: number;
  
  // Mouth shapes
  mouthClose: number;
  mouthFunnel: number;
  mouthPucker: number;
  mouthLeft: number;
  mouthRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  mouthStretchLeft: number;
  mouthStretchRight: number;
  mouthRollLower: number;
  mouthRollUpper: number;
  mouthShrugLower: number;
  mouthShrugUpper: number;
  mouthPressLeft: number;
  mouthPressRight: number;
  
  // Cheek shapes
  cheekPuffLeft: number;
  cheekPuffRight: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
  
  // Brow shapes
  browDownLeft: number;
  browDownRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;
  
  // Tongue
  tongueOut: number;
}

// ============================================
// Session State
// ============================================

export interface SessionState {
  // Session ID
  sessionId: string;
  
  // Portrait/Identity
  portrait: PortraitIdentity | null;
  
  // Motion
  isMotionActive: boolean;
  motionFps: number;
  motionLatency: number;
  
  // Animation
  isAnimationActive: boolean;
  animationFps: number;
  animationLatency: number;
  
  // Status
  status: SessionStatus;
  error: string | null;
}

export type SessionStatus = 
  | 'idle'                    // Initial state
  | 'camera_requested'        // Waiting for camera permission
  | 'camera_active'           // Camera is running
  | 'portrait_uploaded'       // Portrait uploaded, ready to animate
  | 'animating'               // Animation in progress
  | 'paused'                  // Animation paused
  | 'error'                   // Error state
  | 'stopped';                // Session ended

// ============================================
// Default Values
// ============================================

export const DEFAULT_BLEND_SHAPES: BlendShapes = {
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  eyeLookUp: 0,
  eyeLookDown: 0,
  eyeLookLeft: 0,
  eyeLookRight: 0,
  eyeSquintLeft: 0,
  eyeSquintRight: 0,
  jawOpen: 0,
  jawForward: 0,
  jawLeft: 0,
  jawRight: 0,
  mouthClose: 1,
  mouthFunnel: 0,
  mouthPucker: 0,
  mouthLeft: 0,
  mouthRight: 0,
  mouthSmileLeft: 0,
  mouthSmileRight: 0,
  mouthFrownLeft: 0,
  mouthFrownRight: 0,
  mouthStretchLeft: 0,
  mouthStretchRight: 0,
  mouthRollLower: 0,
  mouthRollUpper: 0,
  mouthShrugLower: 0,
  mouthShrugUpper: 0,
  mouthPressLeft: 0,
  mouthPressRight: 0,
  cheekPuffLeft: 0,
  cheekPuffRight: 0,
  cheekSquintLeft: 0,
  cheekSquintRight: 0,
  browDownLeft: 0,
  browDownRight: 0,
  browInnerUp: 0,
  browOuterUpLeft: 0,
  browOuterUpRight: 0,
  tongueOut: 0,
};

export function createDefaultAnimationParameters(): AnimationParameters {
  return {
    frameId: 0,
    timestamp: 0,
    headRotation: { x: 0, y: 0, z: 0 },
    headPosition: { x: 0, y: 0 },
    blendShapes: { ...DEFAULT_BLEND_SHAPES },
    bodyPose: {
      shoulders: [],
      spine: 0,
      pose: 'standing',
    },
    leftHand: null,
    rightHand: null,
    confidence: 0,
  };
}
