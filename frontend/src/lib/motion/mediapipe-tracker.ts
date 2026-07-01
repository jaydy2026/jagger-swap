/**
 * MediaPipe Tracker Wrapper
 * 
 * This module wraps MediaPipe functionality and exposes a clean interface
 * for the MotionEngine. The MotionEngine does NOT depend directly on MediaPipe.
 */

import {
  FaceTrackingData,
  BodyPoseData,
  HandTrackingData,
  HeadPose,
  Point2D,
  GestureType,
  PoseType,
  Point3D,
} from './types';

import {
  LandmarkSmoother,
  AngularSmoother,
} from './smoothing';

/**
 * Configuration for MediaPipe trackers
 */
interface TrackerConfig {
  maxFaces: number;
  refineLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

/**
 * MediaPipeTracker - Internal tracker using MediaPipe
 * 
 * This class wraps MediaPipe and converts its output to our
 * normalized format. The MotionEngine uses this internally.
 */
export class MediaPipeTracker {
  private faceMesh: any = null;
  private pose: any = null;
  private hands: any = null;
  
  private config: TrackerConfig;
  private smoothingConfig: { temporalSmoothing: number; landmarkSmoothing: number };
  
  // Smoothers for each tracking type
  private faceSmoothers: Map<string, { landmarks: LandmarkSmoother; pose: AngularSmoother[] }> = new Map();
  private bodySmoother: LandmarkSmoother | null = null;
  private leftHandSmoother: LandmarkSmoother | null = null;
  private rightHandSmoother: LandmarkSmoother | null = null;
  
  private isInitialized: boolean = false;
  private isLoading: boolean = false;

  // Store results from callbacks
  private faceResults: any = null;
  private poseResults: any = null;
  private handsResults: any = null;

  constructor(config: TrackerConfig, smoothingConfig: { temporalSmoothing: number; landmarkSmoothing: number }) {
    this.config = config;
    this.smoothingConfig = smoothingConfig;
  }

  /**
   * Load MediaPipe dependencies
   */
  async load(): Promise<void> {
    if (this.isInitialized || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      // Dynamic import of MediaPipe
      const [faceMeshModule, poseModule, handsModule] = await Promise.all([
        import('@mediapipe/face_mesh'),
        import('@mediapipe/pose'),
        import('@mediapipe/hands'),
      ]);
      
      const { FaceMesh } = faceMeshModule;
      const { Pose } = poseModule;
      const { Hands } = handsModule;

      // Initialize FaceMesh
      this.faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
      });
      this.faceMesh.setOptions({
        maxNumFaces: this.config.maxFaces,
        refineLandmarks: this.config.refineLandmarks,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });

      // Initialize Pose
      this.pose = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
      });
      this.pose.setOptions({
        modelComplexity: 1, // Faster for real-time
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });

      // Initialize Hands
      this.hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
      });
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1, // Faster for real-time
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });

      // Set up callbacks to capture results
      this.faceMesh.onResults((results: any) => {
        this.faceResults = results;
      });
      
      this.pose.onResults((results: any) => {
        this.poseResults = results;
      });
      
      this.hands.onResults((results: any) => {
        this.handsResults = results;
      });

      this.isInitialized = true;
      console.log('[MediaPipeTracker] Initialized successfully');
    } catch (error) {
      console.error('Failed to load MediaPipe:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Process a video frame through all trackers
   * Returns processed tracking data
   */
  async processFrame(video: HTMLVideoElement): Promise<{
    faces: FaceTrackingData[];
    bodies: BodyPoseData[];
    hands: HandTrackingData[];
  }> {
    if (!this.isInitialized) {
      return { faces: [], bodies: [], hands: [] };
    }

    // Clear previous results
    this.faceResults = null;
    this.poseResults = null;
    this.handsResults = null;

    // Send frame to all trackers
    const promises: Promise<any>[] = [];
    
    if (this.faceMesh) {
      promises.push(this.faceMesh.send({ image: video }));
    }
    if (this.pose) {
      promises.push(this.pose.send({ image: video }));
    }
    if (this.hands) {
      promises.push(this.hands.send({ image: video }));
    }

    // Wait for all trackers to process
    await Promise.all(promises);

    // Small delay to ensure callbacks have fired
    await new Promise(resolve => setTimeout(resolve, 10));

    // Process results
    const faces = this.faceResults ? this.processFaceResults(this.faceResults) : [];
    const bodies = this.poseResults ? this.processPoseResults(this.poseResults) : [];
    const hands = this.handsResults ? this.processHandsResults(this.handsResults) : [];

    return { faces, bodies, hands };
  }

  /**
   * Process face mesh results
   */
  private processFaceResults(results: any): FaceTrackingData[] {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return [];
    }

    const faces: FaceTrackingData[] = [];
    const width = results.imageWidth || 640;
    const height = results.imageHeight || 480;

    for (let i = 0; i < results.multiFaceLandmarks.length; i++) {
      const landmarks = results.multiFaceLandmarks[i];
      const faceId = `face_${i}`;

      // Get or create smoothers for this face
      if (!this.faceSmoothers.has(faceId)) {
        this.faceSmoothers.set(faceId, {
          landmarks: new LandmarkSmoother(468, this.smoothingConfig.landmarkSmoothing),
          pose: [
            new AngularSmoother(this.smoothingConfig.temporalSmoothing),
            new AngularSmoother(this.smoothingConfig.temporalSmoothing),
            new AngularSmoother(this.smoothingConfig.temporalSmoothing),
          ],
        });
      }

      const smoothers = this.faceSmoothers.get(faceId)!;

      // Convert landmarks to pixel coordinates
      const points: Point2D[] = landmarks.map((lm: any) => ({
        x: lm.x * width,
        y: lm.y * height,
      }));

      const smoothedPoints = smoothers.landmarks.smooth(points);

      // Calculate head pose
      const headPose = this.calculateHeadPose(smoothedPoints, smoothers.pose);

      // Extract facial features
      const leftEye = this.extractEyeData(smoothedPoints, true);
      const rightEye = this.extractEyeData(smoothedPoints, false);
      const eyebrows = this.extractEyebrowData(smoothedPoints);
      const mouth = this.extractMouthData(smoothedPoints);
      const jaw = this.extractJawData(smoothedPoints);
      const expressions = this.calculateExpressions(smoothedPoints);

      // Calculate bounding box
      const bbox = this.calculateFaceBoundingBox(smoothedPoints);

      faces.push({
        id: faceId,
        bbox,
        landmarks: {
          points: smoothedPoints,
          confidence: 0.95,
        },
        confidence: 0.95,
        isTracked: true,
        headPose,
        leftEye,
        rightEye,
        eyebrows,
        mouth,
        jaw,
        expressions,
        blinkRate: this.calculateBlinkRate(leftEye.openness, rightEye.openness),
        lastBlinkTime: performance.now(),
      });
    }

    return faces;
  }

  /**
   * Calculate head pose from landmarks
   */
  private calculateHeadPose(
    landmarks: Point2D[],
    smoothers: AngularSmoother[]
  ): HeadPose {
    // Use specific landmarks for head pose estimation
    const nose = landmarks[1]; // Nose tip
    const leftEyeOuter = landmarks[33]; // Left eye outer corner
    const rightEyeOuter = landmarks[263]; // Right eye outer corner

    // Calculate eye distance as reference
    const eyeDistance = Math.sqrt(
      Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
      Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2)
    );

    // Yaw (left/right rotation) - based on nose position relative to eye center
    const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const noseOffset = nose.x - eyeCenterX;
    const yaw = (noseOffset / eyeDistance) * 45; // Scale to degrees

    // Pitch (up/down rotation) - based on nose position relative to eye line
    const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
    const noseOffsetY = nose.y - eyeCenterY;
    const pitch = (noseOffsetY / eyeDistance) * 45;

    // Roll - based on eye line angle
    const rollAngle = Math.atan2(
      rightEyeOuter.y - leftEyeOuter.y,
      rightEyeOuter.x - leftEyeOuter.x
    ) * (180 / Math.PI);

    // Smooth the values
    const smoothedYaw = smoothers[1].smoothAngle(yaw);
    const smoothedPitch = smoothers[0].smoothAngle(pitch);
    const smoothedRoll = smoothers[2].smoothAngle(rollAngle);

    return {
      yaw: smoothedYaw,
      pitch: smoothedPitch,
      roll: smoothedRoll,
      yawConfidence: 0.9,
      pitchConfidence: 0.85,
      rollConfidence: 0.8,
    };
  }

  /**
   * Calculate face bounding box
   */
  private calculateFaceBoundingBox(landmarks: Point2D[]): { x: number; y: number; width: number; height: number } {
    const xs = landmarks.map(p => p.x);
    const ys = landmarks.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Extract eye data
   */
  private extractEyeData(landmarks: Point2D[], isLeft: boolean): {
    openness: number;
    isBlinking: boolean;
    pupil: Point2D;
  } {
    // Eye landmark indices
    const upperLid = isLeft ? 159 : 386;
    const lowerLid = isLeft ? 145 : 374;
    const leftCorner = isLeft ? 33 : 362;
    const rightCorner = isLeft ? 133 : 263;

    const upper = landmarks[upperLid];
    const lower = landmarks[lowerLid];
    const left = landmarks[leftCorner];
    const right = landmarks[rightCorner];

    // Calculate eye openness as ratio of vertical to horizontal distance
    const verticalDist = Math.sqrt(
      Math.pow(upper.x - lower.x, 2) + Math.pow(upper.y - lower.y, 2)
    );
    const horizontalDist = Math.sqrt(
      Math.pow(right.x - left.x, 2) + Math.pow(right.y - left.y, 2)
    );

    const openness = Math.min(1, verticalDist / (horizontalDist * 0.3));
    const isBlinking = openness < 0.3;

    // Pupil position (midpoint of eye)
    const pupil: Point2D = {
      x: (upper.x + lower.x + left.x + right.x) / 4,
      y: (upper.y + lower.y + left.y + right.y) / 4,
    };

    return { openness, isBlinking, pupil };
  }

  /**
   * Extract eyebrow data
   */
  private extractEyebrowData(landmarks: Point2D[]): {
    left: { raised: number; furrowed: number };
    right: { raised: number; furrowed: number };
  } {
    // Left eyebrow: 70, 63, 105, 66, 107
    // Right eyebrow: 336, 296, 334, 293, 300
    
    const leftBrowCenter = landmarks[70];
    const rightBrowCenter = landmarks[336];
    
    // Reference position (eye level)
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    // Calculate raised amount based on distance from eyes
    const leftRaised = Math.max(0, (leftBrowCenter.y - leftEye.y) / 50);
    const rightRaised = Math.max(0, (rightBrowCenter.y - rightEye.y) / 50);
    
    // Furrowed (inner corners pulled down)
    const leftInner = landmarks[63];
    const rightInner = landmarks[296];
    const leftFurrowed = Math.max(0, (leftInner.y - leftBrowCenter.y) / 20);
    const rightFurrowed = Math.max(0, (rightInner.y - rightBrowCenter.y) / 20);

    return {
      left: { raised: leftRaised, furrowed: leftFurrowed },
      right: { raised: rightRaised, furrowed: rightFurrowed },
    };
  }

  /**
   * Extract mouth data
   */
  private extractMouthData(landmarks: Point2D[]): {
    openness: number;
    smile: number;
    shape: 'neutral' | 'smile' | 'open' | 'surprise' | 'pout' | 'grimace';
    cornerLeft: Point2D;
    cornerRight: Point2D;
  } {
    // Mouth landmarks
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];

    // Openness
    const verticalDist = Math.sqrt(
      Math.pow(upperLip.x - lowerLip.x, 2) + Math.pow(upperLip.y - lowerLip.y, 2)
    );
    const horizontalDist = Math.sqrt(
      Math.pow(rightCorner.x - leftCorner.x, 2) + Math.pow(rightCorner.y - leftCorner.y, 2)
    );
    const openness = Math.min(1, verticalDist / (horizontalDist * 0.3));

    // Smile (corner pull)
    const smile = Math.max(0, (rightCorner.x - leftCorner.x) / horizontalDist - 0.8);

    // Determine mouth shape
    let shape: 'neutral' | 'smile' | 'open' | 'surprise' | 'pout' | 'grimace' = 'neutral';
    if (openness > 0.5) {
      shape = 'open';
    } else if (smile > 0.3) {
      shape = 'smile';
    }

    return {
      openness,
      smile,
      shape,
      cornerLeft: leftCorner,
      cornerRight: rightCorner,
    };
  }

  /**
   * Extract jaw data
   */
  private extractJawData(landmarks: Point2D[]): {
    leftShift: number;
    rightShift: number;
    openness: number;
  } {
    const jawLeft = landmarks[234];
    const jawRight = landmarks[454];
    const chin = landmarks[152];
    
    const centerX = (jawLeft.x + jawRight.x) / 2;
    const jawOpenness = Math.abs(chin.y - centerX) / 100;
    
    return {
      leftShift: 0,
      rightShift: 0,
      openness: jawOpenness,
    };
  }

  /**
   * Calculate facial expressions
   */
  private calculateExpressions(landmarks: Point2D[]): {
    smile: number;
    anger: number;
    sadness: number;
    surprise: number;
    joy: number;
    frown: number;
    disgust: number;
    fear: number;
    neutral: number;
  } {
    const mouth = this.extractMouthData(landmarks);
    const eyebrows = this.extractEyebrowData(landmarks);
    
    const smile = mouth.smile;
    const surprise = mouth.openness > 0.5 ? 1 : 0;
    const anger = (eyebrows.left.furrowed + eyebrows.right.furrowed) / 2;
    
    return {
      smile,
      anger,
      sadness: 0,
      surprise,
      joy: smile * 2,
      frown: 0,
      disgust: 0,
      fear: 0,
      neutral: 1 - smile - anger - surprise,
    };
  }

  /**
   * Calculate blink rate
   */
  private calculateBlinkRate(leftOpenness: number, rightOpenness: number): number {
    const avgOpenness = (leftOpenness + rightOpenness) / 2;
    return avgOpenness < 0.3 ? 1 : 0;
  }

  /**
   * Process pose results
   */
  private processPoseResults(results: any): BodyPoseData[] {
    if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
      return [];
    }

    const landmarks = results.poseLandmarks;
    const width = results.imageWidth || 640;
    const height = results.imageHeight || 480;

    // Initialize body smoother if needed
    if (!this.bodySmoother) {
      this.bodySmoother = new LandmarkSmoother(33, this.smoothingConfig.landmarkSmoothing);
    }

    // Convert landmarks
    const bodyLandmarks: Array<{
      name: string;
      point: { x: number; y: number };
      confidence: number;
      visibility?: number;
    }> = landmarks.map((lm: any, i: number) => ({
      name: this.getPoseLandmarkName(i),
      point: { x: lm.x * width, y: lm.y * height },
      confidence: lm.visibility || 1,
      visibility: lm.visibility,
    }));

    // Smooth landmarks
    const smoothPoints = bodyLandmarks.map((l) => l.point);
    const smoothedPoints = this.bodySmoother.smooth(smoothPoints);
    const smoothedLandmarks = bodyLandmarks.map((l, i) => ({
      ...l,
      point: smoothedPoints[i],
    }));

    // Extract body parts
    const upperBody = this.extractUpperBody(smoothedLandmarks);
    const lowerBody = this.extractLowerBody(smoothedLandmarks);
    const pose = this.detectBodyPose(upperBody, lowerBody);

    return [{
      id: 'body_0',
      isTracked: true,
      confidence: this.calculateBodyConfidence(smoothedLandmarks),
      landmarks: smoothedLandmarks,
      upperBody,
      lowerBody,
      pose,
    }];
  }

  /**
   * Get pose landmark name
   */
  private getPoseLandmarkName(index: number): string {
    const names = [
      'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner',
      'right_eye', 'right_eye_outer', 'left_ear', 'right_ear', 'mouth_left',
      'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
      'right_index', 'left_thumb', 'right_thumb', 'left_hip', 'right_hip',
      'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'left_heel',
      'right_heel', 'left_foot_index', 'right_foot_index'
    ];
    return names[index] || `landmark_${index}`;
  }

  /**
   * Extract upper body landmarks
   */
  private extractUpperBody(landmarks: any[]): any {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    return {
      shoulders: {
        left: leftShoulder?.point || { x: 0, y: 0 },
        right: rightShoulder?.point || { x: 0, y: 0 },
        center: {
          x: ((leftShoulder?.point?.x || 0) + (rightShoulder?.point?.x || 0)) / 2,
          y: ((leftShoulder?.point?.y || 0) + (rightShoulder?.point?.y || 0)) / 2,
        },
        width: Math.sqrt(
          Math.pow((rightShoulder?.point?.x || 0) - (leftShoulder?.point?.x || 0), 2) +
          Math.pow((rightShoulder?.point?.y || 0) - (leftShoulder?.point?.y || 0), 2)
        ),
      },
      spine: {
        top: {
          x: ((leftShoulder?.point?.x || 0) + (rightShoulder?.point?.x || 0)) / 2,
          y: ((leftShoulder?.point?.y || 0) + (rightShoulder?.point?.y || 0)) / 2,
        },
        bottom: {
          x: ((leftHip?.point?.x || 0) + (rightHip?.point?.x || 0)) / 2,
          y: ((leftHip?.point?.y || 0) + (rightHip?.point?.y || 0)) / 2,
        },
        curvature: 0,
      },
      arms: {
        left: {
          elbow: leftElbow?.point || { x: 0, y: 0 },
          wrist: leftWrist?.point || { x: 0, y: 0 },
        },
        right: {
          elbow: rightElbow?.point || { x: 0, y: 0 },
          wrist: rightWrist?.point || { x: 0, y: 0 },
        },
      },
    };
  }

  /**
   * Extract lower body landmarks
   */
  private extractLowerBody(landmarks: any[]): any {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    return {
      hips: {
        left: leftHip?.point || { x: 0, y: 0 },
        right: rightHip?.point || { x: 0, y: 0 },
        center: {
          x: ((leftHip?.point?.x || 0) + (rightHip?.point?.x || 0)) / 2,
          y: ((leftHip?.point?.y || 0) + (rightHip?.point?.y || 0)) / 2,
        },
      },
      knees: {
        left: leftKnee?.point || { x: 0, y: 0 },
        right: rightKnee?.point || { x: 0, y: 0 },
      },
      ankles: {
        left: leftAnkle?.point || { x: 0, y: 0 },
        right: rightAnkle?.point || { x: 0, y: 0 },
      },
    };
  }

  /**
   * Detect body pose
   */
  private detectBodyPose(upperBody: any, lowerBody: any): PoseType {
    const hipHeight = lowerBody.hips.center.y;
    const kneeHeight = (lowerBody.knees.left.y + lowerBody.knees.right.y) / 2;
    const ankleHeight = (lowerBody.ankles.left.y + lowerBody.ankles.right.y) / 2;
    const shoulderHeight = upperBody.shoulders.center.y;

    // Check if sitting vs standing
    const legRatio = (ankleHeight - kneeHeight) / (hipHeight - ankleHeight + 0.001);

    if (legRatio < 0.5) {
      return 'sitting';
    } else if (upperBody.spine.curvature > 0.3) {
      return 'leaning';
    }

    return 'standing';
  }

  /**
   * Calculate body confidence
   */
  private calculateBodyConfidence(landmarks: any[]): number {
    const visibleLandmarks = landmarks.filter(
      (l: any) => l.visibility !== undefined && l.visibility > 0.5
    );
    return visibleLandmarks.length / landmarks.length;
  }

  /**
   * Process hands results
   */
  private processHandsResults(results: any): HandTrackingData[] {
    if (!results.multiHandLandmarks || !results.multiHandedness) {
      return [];
    }

    const hands: HandTrackingData[] = [];
    const width = results.imageWidth || 640;
    const height = results.imageHeight || 480;

    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const handedness = results.multiHandedness[i].label.toLowerCase() as 'left' | 'right';
      const handId = `hand_${handedness}`;

      // Get or create smoother
      const smootherKey = handedness === 'left' ? 'leftHandSmoother' : 'rightHandSmoother';
      if (!this[smootherKey]) {
        this[smootherKey] = new LandmarkSmoother(21, this.smoothingConfig.landmarkSmoothing);
      }

      // Convert landmarks
      const handLandmarks: Array<{
        name: string;
        point: { x: number; y: number };
        depth: number;
        confidence: number;
      }> = landmarks.map((lm: { x: number; y: number; z: number }, idx: number) => ({
        name: this.getHandLandmarkName(idx),
        point: { x: lm.x * width, y: lm.y * height },
        depth: lm.z,
        confidence: 1,
      }));

      // Smooth
      const smoothPoints = handLandmarks.map((l) => l.point);
      const smoothedPoints = (this[smootherKey] as LandmarkSmoother).smooth(smoothPoints);
      const smoothedLandmarks = handLandmarks.map((l, idx) => ({
        ...l,
        point: smoothedPoints[idx],
      }));

      // Extract fingers
      const fingers = this.extractFingers(smoothedLandmarks);

      // Detect gesture
      const { gesture, confidence } = this.detectGesture(fingers, smoothedLandmarks);

      // Palm data
      const palm = this.calculatePalmData(smoothedLandmarks);

      hands.push({
        id: handId,
        handedness,
        isTracked: true,
        confidence: 0.85,
        landmarks: smoothedLandmarks,
        thumb: fingers.thumb,
        index: fingers.index,
        middle: fingers.middle,
        ring: fingers.ring,
        pinky: fingers.pinky,
        gesture,
        gestureConfidence: confidence,
        palmNormal: palm.normal,
        palmDirection: palm.direction,
      });
    }

    return hands;
  }

  /**
   * Get hand landmark name
   */
  private getHandLandmarkName(index: number): string {
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    const parts = ['wrist', 'palm', 'MCP', 'PIP', 'DIP', 'tip'];
    const finger = Math.floor(index / 4);
    const part = index % 4;
    return `${fingers[finger] || 'unknown'}_${parts[part] || 'unknown'}`;
  }

  /**
   * Extract finger data
   */
  private extractFingers(landmarks: any[]): any {
    // Landmark indices for each finger (tip, PIP, MCP)
    const fingerIndices = {
      thumb: [4, 3, 2],
      index: [8, 6, 5],
      middle: [12, 10, 9],
      ring: [16, 14, 13],
      pinky: [20, 18, 17],
    };

    const fingers: any = {};

    for (const [name, indices] of Object.entries(fingerIndices)) {
      const tip = landmarks[indices[0]]?.point;
      const pip = landmarks[indices[1]]?.point;
      const mcp = landmarks[indices[2]]?.point;

      if (tip && pip && mcp) {
        // Calculate extension based on finger straightness
        const tipToMcp = Math.sqrt(
          Math.pow(tip.x - mcp.x, 2) + Math.pow(tip.y - mcp.y, 2)
        );
        const tipToPip = Math.sqrt(
          Math.pow(tip.x - pip.x, 2) + Math.pow(tip.y - pip.y, 2)
        );
        const extension = Math.min(1, tipToPip / (tipToMcp * 0.5));

        fingers[name] = {
          isExtended: extension > 0.5,
          extension,
          curled: 1 - extension,
          landmarks: { tip, pip, mcp },
        };
      } else {
        fingers[name] = {
          isExtended: false,
          extension: 0,
          curled: 1,
          landmarks: { tip: tip || mcp, pip: pip || mcp, mcp },
        };
      }
    }

    return fingers;
  }

  /**
   * Detect hand gesture
   */
  private detectGesture(fingers: any, landmarks: any[]): { gesture: GestureType; confidence: number } {
    const extendedFingers = Object.values(fingers).filter(
      (f: any) => f.isExtended
    ).length;

    // Check thumb separately
    const thumb = fingers.thumb;
    const thumbUp = thumb.isExtended && thumb.extension > 0.7;

    // Index finger pointing
    const index = fingers.index;
    const pointing = index.isExtended && !fingers.middle.isExtended && !fingers.ring.isExtended;

    // Fist
    const isFist = extendedFingers <= 1 && !thumbUp;

    // Open hand
    const isOpen = extendedFingers >= 4;

    // Peace sign
    const peace = fingers.index.isExtended && fingers.middle.isExtended && 
                  !fingers.ring.isExtended && !fingers.pinky.isExtended;

    if (isOpen) {
      return { gesture: 'open', confidence: 0.9 };
    } else if (isFist) {
      return { gesture: 'closed_fist', confidence: 0.85 };
    } else if (thumbUp) {
      return { gesture: 'thumbs_up', confidence: 0.8 };
    } else if (pointing) {
      return { gesture: 'pointing', confidence: 0.8 };
    } else if (peace) {
      return { gesture: 'peace', confidence: 0.75 };
    }

    return { gesture: 'unknown', confidence: 0.5 };
  }

  /**
   * Calculate palm normal and direction
   */
  private calculatePalmData(landmarks: any[]): { normal: Point3D; direction: Point3D } {
    const wrist = landmarks[0]?.point || { x: 0, y: 0 };
    const middleMcp = landmarks[9]?.point || { x: 0, y: 0 };

    const direction: Point3D = {
      x: middleMcp.x - wrist.x,
      y: middleMcp.y - wrist.y,
      z: 0,
    };

    return {
      normal: { x: 0, y: 0, z: 1 },
      direction,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    if (this.pose) {
      this.pose.close();
      this.pose = null;
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }

    this.faceSmoothers.clear();
    this.bodySmoother = null;
    this.leftHandSmoother = null;
    this.rightHandSmoother = null;
    this.isInitialized = false;
    
    console.log('[MediaPipeTracker] Disposed');
  }
}
