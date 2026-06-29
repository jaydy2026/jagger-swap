/**
 * Motion Engine Type Definitions
 * 
 * These types define the unified motion data stream API.
 * Animation modules can subscribe to this API without knowing
 * the underlying tracking implementation.
 */

// ============================================
// Core Motion Data Structures
// ============================================

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Confidence {
  value: number;
  isTracked: boolean;
}

// ============================================
// Face Tracking
// ============================================

export interface FaceLandmarks {
  points: Point2D[];
  confidence: number;
}

export interface EyeData {
  openness: number;
  isBlinking: boolean;
  pupil: Point2D;
}

export interface MouthData {
  openness: number;
  smile: number;
  shape: MouthShape;
}

export type MouthShape = 
  | 'neutral'
  | 'smile'
  | 'open'
  | 'surprise'
  | 'pout'
  | 'grimace';

export interface EyebrowData {
  left: {
    raised: number;
    furrowed: number;
  };
  right: {
    raised: number;
    furrowed: number;
  };
}

export interface JawData {
  openness: number;
  leftShift: number;
  rightShift: number;
}

export interface FaceExpression {
  smile: number;
  frown: number;
  surprise: number;
  anger: number;
  disgust: number;
  fear: number;
  neutral: number;
}

export interface FaceTrackingData {
  id: string;
  bbox: BoundingBox;
  landmarks: FaceLandmarks;
  confidence: number;
  isTracked: boolean;
  headPose: HeadPose;
  leftEye: EyeData;
  rightEye: EyeData;
  eyebrows: EyebrowData;
  mouth: MouthData;
  jaw: JawData;
  expressions: FaceExpression;
  blinkRate: number;
  lastBlinkTime: number;
}

export interface HeadPose {
  pitch: number;
  roll: number;
  yaw: number;
  pitchConfidence: number;
  rollConfidence: number;
  yawConfidence: number;
}

// ============================================
// Body Pose Tracking
// ============================================

export interface BodyLandmark {
  name: string;
  point: Point2D;
  confidence: number;
  visibility?: number;
}

export interface BodyPoseData {
  id: string;
  isTracked: boolean;
  confidence: number;
  landmarks: BodyLandmark[];
  upperBody: UpperBodyData;
  lowerBody: LowerBodyData;
  pose: PoseType;
}

export type PoseType = 
  | 'standing'
  | 'sitting'
  | 'walking'
  | 'leaning'
  | 'unknown';

export interface UpperBodyData {
  neck: {
    point: Point2D;
    tilt: number;
    forward: number;
  };
  shoulders: {
    left: Point2D;
    right: Point2D;
    roll: number;
  };
  chest: Point2D;
  spine: {
    top: Point2D;
    middle: Point2D;
    bottom: Point2D;
    curvature: number;
  };
}

export interface LowerBodyData {
  hips: {
    left: Point2D;
    right: Point2D;
    center: Point2D;
  };
  knees: {
    left: Point2D;
    right: Point2D;
  };
  ankles: {
    left: Point2D;
    right: Point2D;
  };
}

// ============================================
// Hand Tracking
// ============================================

export interface HandLandmark {
  name: string;
  point: Point2D;
  depth?: number;
  confidence: number;
}

export type Handedness = 'left' | 'right';
export type GestureType = 
  | 'open'
  | 'closed_fist'
  | 'pointing'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'peace'
  | 'rock'
  | 'ok_sign'
  | 'unknown';

export interface FingerData {
  isExtended: boolean;
  extension: number;
  curled: number;
  landmarks: {
    tip: Point2D;
    middle: Point2D;
    base: Point2D;
  };
}

export interface HandTrackingData {
  id: string;
  handedness: Handedness;
  isTracked: boolean;
  confidence: number;
  landmarks: HandLandmark[];
  thumb: FingerData;
  index: FingerData;
  middle: FingerData;
  ring: FingerData;
  pinky: FingerData;
  gesture: GestureType;
  gestureConfidence: number;
  palmNormal: Point3D;
  palmDirection: Point3D;
}

// ============================================
// Unified Motion Stream
// ============================================

export interface MotionFrame {
  timestamp: number;
  frameId: number;
  faces: FaceTrackingData[];
  bodies: BodyPoseData[];
  hands: HandTrackingData[];
  overallConfidence: number;
  trackingQuality: TrackingQuality;
  fps: number;
  processingTime: number;
}

export interface TrackingQuality {
  faceDetected: boolean;
  bodyDetected: boolean;
  handsDetected: {
    left: boolean;
    right: boolean;
  };
  qualityScore: number;
}

// ============================================
// Motion Engine Configuration
// ============================================

export interface MotionEngineConfig {
  enableFaceTracking: boolean;
  enableBodyTracking: boolean;
  enableHandTracking: boolean;
  targetFps: number;
  maxFaces: number;
  smoothingLevel: 'low' | 'medium' | 'high';
  showDebugOverlay: boolean;
  debugCanvasId: string;
  temporalSmoothing: number;
  landmarkSmoothing: number;
  velocityFilter: number;
  minFaceConfidence: number;
  minBodyConfidence: number;
  minHandConfidence: number;
}

// ============================================
// Motion Engine Events
// ============================================

export type MotionEventType = 
  | 'frame'
  | 'face_detected'
  | 'face_lost'
  | 'body_detected'
  | 'body_lost'
  | 'hand_detected'
  | 'hand_lost'
  | 'gesture_detected'
  | 'error'
  | 'ready'
  | 'stopped';

export interface MotionEvent {
  type: MotionEventType;
  timestamp: number;
  data?: MotionFrame | FaceTrackingData | HandTrackingData | BodyPoseData | string;
}

// ============================================
// Motion Engine API
// ============================================

export interface MotionSubscriber {
  id: string;
  onMotion: (frame: MotionFrame) => void;
  onEvent: (event: MotionEvent) => void;
  faceFilter?: (face: FaceTrackingData) => boolean;
  bodyFilter?: (body: BodyPoseData) => boolean;
  handFilter?: (hand: HandTrackingData) => boolean;
}

export interface MotionEngine {
  initialize(config: MotionEngineConfig): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  updateConfig(config: Partial<MotionEngineConfig>): void;
  getConfig(): MotionEngineConfig;
  subscribe(subscriber: MotionSubscriber): () => void;
  unsubscribe(subscriberId: string): void;
  getLatestFrame(): MotionFrame | null;
  getTrackingStats(): TrackingStats;
  setDebugMode(enabled: boolean): void;
  renderDebugOverlay(canvas: HTMLCanvasElement): void;
}

export interface TrackingStats {
  totalFrames: number;
  fps: number;
  averageProcessingTime: number;
  faceTrackingTime: number;
  bodyTrackingTime: number;
  handTrackingTime: number;
  lastUpdateTime: number;
}
