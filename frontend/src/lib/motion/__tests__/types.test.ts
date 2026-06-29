/**
 * Tests for Motion Types
 */

import {
  Point2D,
  Point3D,
  BoundingBox,
  FaceTrackingData,
  BodyPoseData,
  HandTrackingData,
  MotionFrame,
  MotionEngineConfig,
} from '../types';

describe('Point2D', () => {
  it('should have x and y coordinates', () => {
    const point: Point2D = { x: 10, y: 20 };
    expect(point.x).toBe(10);
    expect(point.y).toBe(20);
  });
});

describe('Point3D', () => {
  it('should have x, y, and z coordinates', () => {
    const point: Point3D = { x: 10, y: 20, z: 30 };
    expect(point.x).toBe(10);
    expect(point.y).toBe(20);
    expect(point.z).toBe(30);
  });
});

describe('BoundingBox', () => {
  it('should have position and dimensions', () => {
    const bbox: BoundingBox = { x: 10, y: 20, width: 100, height: 150 };
    expect(bbox.x).toBe(10);
    expect(bbox.y).toBe(20);
    expect(bbox.width).toBe(100);
    expect(bbox.height).toBe(150);
  });
});

describe('FaceTrackingData', () => {
  it('should have all required face tracking properties', () => {
    const face: FaceTrackingData = {
      id: 'face_0',
      bbox: { x: 0, y: 0, width: 100, height: 100 },
      landmarks: { points: [], confidence: 0.9 },
      confidence: 0.9,
      isTracked: true,
      headPose: {
        pitch: 0,
        roll: 0,
        yaw: 0,
        pitchConfidence: 0.9,
        rollConfidence: 0.9,
        yawConfidence: 0.9,
      },
      leftEye: { openness: 0.8, isBlinking: false, pupil: { x: 0, y: 0 } },
      rightEye: { openness: 0.8, isBlinking: false, pupil: { x: 0, y: 0 } },
      eyebrows: {
        left: { raised: 0, furrowed: 0 },
        right: { raised: 0, furrowed: 0 },
      },
      mouth: { openness: 0.1, smile: 0, shape: 'neutral' },
      jaw: { openness: 0, leftShift: 0, rightShift: 0 },
      expressions: {
        smile: 0,
        frown: 0,
        surprise: 0,
        anger: 0,
        disgust: 0,
        fear: 0,
        neutral: 1,
      },
      blinkRate: 0,
      lastBlinkTime: 0,
    };

    expect(face.id).toBe('face_0');
    expect(face.isTracked).toBe(true);
    expect(face.headPose.pitch).toBe(0);
    expect(face.mouth.shape).toBe('neutral');
  });
});

describe('BodyPoseData', () => {
  it('should have all required body tracking properties', () => {
    const body: BodyPoseData = {
      id: 'body_0',
      isTracked: true,
      confidence: 0.85,
      landmarks: [],
      upperBody: {
        neck: { point: { x: 0, y: 0 }, tilt: 0, forward: 0 },
        shoulders: {
          left: { x: 0, y: 0 },
          right: { x: 0, y: 0 },
          roll: 0,
        },
        chest: { x: 0, y: 0 },
        spine: {
          top: { x: 0, y: 0 },
          middle: { x: 0, y: 0 },
          bottom: { x: 0, y: 0 },
          curvature: 0,
        },
      },
      lowerBody: {
        hips: {
          left: { x: 0, y: 0 },
          right: { x: 0, y: 0 },
          center: { x: 0, y: 0 },
        },
        knees: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
        ankles: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
      },
      pose: 'standing',
    };

    expect(body.id).toBe('body_0');
    expect(body.pose).toBe('standing');
    expect(body.isTracked).toBe(true);
  });
});

describe('HandTrackingData', () => {
  it('should have all required hand tracking properties', () => {
    const hand: HandTrackingData = {
      id: 'hand_left',
      handedness: 'left',
      isTracked: true,
      confidence: 0.9,
      landmarks: [],
      thumb: {
        isExtended: false,
        extension: 0,
        curled: 1,
        landmarks: { tip: { x: 0, y: 0 }, middle: { x: 0, y: 0 }, base: { x: 0, y: 0 } },
      },
      index: {
        isExtended: true,
        extension: 1,
        curled: 0,
        landmarks: { tip: { x: 0, y: 0 }, middle: { x: 0, y: 0 }, base: { x: 0, y: 0 } },
      },
      middle: {
        isExtended: true,
        extension: 1,
        curled: 0,
        landmarks: { tip: { x: 0, y: 0 }, middle: { x: 0, y: 0 }, base: { x: 0, y: 0 } },
      },
      ring: {
        isExtended: true,
        extension: 1,
        curled: 0,
        landmarks: { tip: { x: 0, y: 0 }, middle: { x: 0, y: 0 }, base: { x: 0, y: 0 } },
      },
      pinky: {
        isExtended: false,
        extension: 0,
        curled: 1,
        landmarks: { tip: { x: 0, y: 0 }, middle: { x: 0, y: 0 }, base: { x: 0, y: 0 } },
      },
      gesture: 'pointing',
      gestureConfidence: 0.85,
      palmNormal: { x: 0, y: 0, z: 1 },
      palmDirection: { x: 0, y: 1, z: 0 },
    };

    expect(hand.id).toBe('hand_left');
    expect(hand.handedness).toBe('left');
    expect(hand.gesture).toBe('pointing');
  });
});

describe('MotionFrame', () => {
  it('should combine all tracking data', () => {
    const frame: MotionFrame = {
      timestamp: Date.now(),
      frameId: 1,
      faces: [],
      bodies: [],
      hands: [],
      overallConfidence: 0.9,
      trackingQuality: {
        faceDetected: true,
        bodyDetected: true,
        handsDetected: { left: false, right: false },
        qualityScore: 0.7,
      },
      fps: 30,
      processingTime: 16,
    };

    expect(frame.fps).toBe(30);
    expect(frame.trackingQuality.faceDetected).toBe(true);
  });
});

describe('MotionEngineConfig', () => {
  it('should have default values', () => {
    const config: MotionEngineConfig = {
      enableFaceTracking: true,
      enableBodyTracking: true,
      enableHandTracking: true,
      targetFps: 30,
      maxFaces: 1,
      smoothingLevel: 'medium',
      showDebugOverlay: false,
      debugCanvasId: 'debug-canvas',
      temporalSmoothing: 0.5,
      landmarkSmoothing: 0.5,
      velocityFilter: 0.3,
      minFaceConfidence: 0.5,
      minBodyConfidence: 0.4,
      minHandConfidence: 0.5,
    };

    expect(config.enableFaceTracking).toBe(true);
    expect(config.targetFps).toBe(30);
    expect(config.smoothingLevel).toBe('medium');
  });
});
