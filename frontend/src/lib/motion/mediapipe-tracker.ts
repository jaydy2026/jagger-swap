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
  MotionEngineConfig,
  Point2D,
  GestureType,
  PoseType,
  MouthShape,
  Point3D,
} from './types';

import {
  LandmarkSmoother,
  Point2DSmoother,
  AngularSmoother,
  ConfidenceFilter,
  VelocityFilter,
  getSmoothingFactor,
} from './smoothing';

// MediaPipe imports (loaded dynamically)
type MediaPipeFaceMesh = any;
type MediaPipePose = any;
type MediaPipeHands = any;

interface MediaPipeResults {
  faceMesh?: any;
  pose?: any;
  hands?: any;
}

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
  private faceMesh: MediaPipeFaceMesh | null = null;
  private pose: MediaPipePose | null = null;
  private hands: MediaPipeHands | null = null;
  
  private config: TrackerConfig;
  private smoothingConfig: { temporalSmoothing: number; landmarkSmoothing: number };
  
  // Smoothers for each tracking type
  private faceSmoothers: Map<string, { landmarks: LandmarkSmoother; pose: AngularSmoother[] }> = new Map();
  private bodySmoother: LandmarkSmoother | null = null;
  private leftHandSmoother: LandmarkSmoother | null = null;
  private rightHandSmoother: LandmarkSmoother | null = null;
  
  private isInitialized: boolean = false;
  private isLoading: boolean = false;

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

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load MediaPipe:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Set callbacks for each tracker
   */
  setResultsCallback(
    onFaceResults: (results: any) => void,
    onPoseResults: (results: any) => void,
    onHandsResults: (results: any) => void
  ): void {
    if (this.faceMesh) {
      this.faceMesh.onResults(onFaceResults);
    }
    if (this.pose) {
      this.pose.onResults(onPoseResults);
    }
    if (this.hands) {
      this.hands.onResults(onHandsResults);
    }
  }

  /**
   * Process a video frame through all trackers
   */
  async processFrame(video: HTMLVideoElement): Promise<void> {
    if (!this.isInitialized) return;

    const timestamp = performance.now();

    // Process through all trackers
    const promises = [];
    
    if (this.faceMesh) {
      promises.push(this.faceMesh.send({ image: video }));
    }
    if (this.pose) {
      promises.push(this.pose.send({ image: video }));
    }
    if (this.hands) {
      promises.push(this.hands.send({ image: video }));
    }

    await Promise.all(promises);
  }

  /**
   * Process face mesh results
   */
  processFaceResults(results: any): FaceTrackingData[] {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return [];
    }

    const faces: FaceTrackingData[] = [];
    const width = results.imageWidth || 1;
    const height = results.imageHeight || 1;

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

      // Convert and smooth landmarks
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
          confidence: results.multiFaceLandmarks.length > 0 ? 0.9 : 0,
        },
        confidence: 0.9,
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
    const leftMouth = landmarks[61]; // Left mouth corner
    const rightMouth = landmarks[291]; // Right mouth corner

    // Calculate angles (simplified model)
    const eyeDistance = Math.sqrt(
      Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
      Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2)
    );

    const mouthDistance = Math.sqrt(
      Math.pow(rightMouth.x - leftMouth.x, 2) +
      Math.pow(rightMouth.y - leftMouth.y, 2)
    );

    // Yaw (left/right rotation)
    const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const mouthCenterX = (leftMouth.x + rightMouth.x) / 2;
    const yaw = Math.atan2(mouthCenterX - eyeCenterX, eyeDistance) * (180 / Math.PI);

    // Roll (tilt)
    const roll = Math.atan2(
      rightEyeOuter.y - leftEyeOuter.y,
      rightEyeOuter.x - leftEyeOuter.x
    ) * (180 / Math.PI);

    // Pitch (up/down) - simplified
    const pitch = Math.atan2(
      nose.y - (eyeCenterX + mouthCenterX) / 2,
      eyeDistance
    ) * (180 / Math.PI);

    return {
      pitch: smoothers[0].smoothAngle(pitch),
      roll: smoothers[1].smoothAngle(roll),
      yaw: smoothers[2].smoothAngle(yaw),
      pitchConfidence: 0.85,
      rollConfidence: 0.9,
      yawConfidence: 0.8,
    };
  }

  /**
   * Extract eye data from landmarks
   */
  private extractEyeData(landmarks: Point2D[], isLeft: boolean): any {
    // Eye landmark indices (MediaPipe Face Mesh)
    const upperLid = isLeft ? 159 : 386;
    const lowerLid = isLeft ? 145 : 374;
    const leftCorner = isLeft ? 33 : 263;
    const rightCorner = isLeft ? 133 : 362;
    const pupil = isLeft ? 468 : 473;

    const upperPoint = landmarks[upperLid];
    const lowerPoint = landmarks[lowerLid];
    const leftPoint = landmarks[leftCorner];
    const rightPoint = landmarks[rightCorner];
    const pupilPoint = landmarks[pupil] || {
      x: (leftPoint.x + rightPoint.x) / 2,
      y: (upperPoint.y + lowerPoint.y) / 2,
    };

    const eyeHeight = Math.abs(lowerPoint.y - upperPoint.y);
    const eyeWidth = Math.abs(rightPoint.x - leftPoint.x);

    // Normalize openness (0 = closed, 1 = fully open)
    const aspectRatio = eyeHeight / (eyeWidth + 0.001);
    const openness = Math.min(1, aspectRatio * 5);
    const isBlinking = openness < 0.2;

    return {
      openness: Math.max(0, Math.min(1, openness)),
      isBlinking,
      pupil: pupilPoint,
    };
  }

  /**
   * Extract eyebrow data
   */
  private extractEyebrowData(landmarks: Point2D[]): any {
    // Left eyebrow landmarks: 70, 63, 105, 66, 107
    // Right eyebrow landmarks: 336, 296, 334, 293, 300
    const leftBrowIndices = [70, 63, 105, 66, 107];
    const rightBrowIndices = [336, 296, 334, 293, 300];

    // Eye references for comparison
    const leftEyeTop = landmarks[159];
    const rightEyeTop = landmarks[386];

    const leftBrowPoints = leftBrowIndices.map((i) => landmarks[i]);
    const rightBrowPoints = rightBrowIndices.map((i) => landmarks[i]);

    const leftBrowAvgY = leftBrowPoints.reduce((sum, p) => sum + p.y, 0) / leftBrowPoints.length;
    const rightBrowAvgY = rightBrowPoints.reduce((sum, p) => sum + p.y, 0) / rightBrowPoints.length;

    // Raised: brow is above eye
    const leftRaised = Math.max(0, (leftBrowAvgY - leftEyeTop.y) / 50);
    const rightRaised = Math.max(0, (rightBrowAvgY - rightEyeTop.y) / 50);

    // Furrowed: inner brows come together
    const leftInnerBrow = landmarks[107];
    const rightInnerBrow = landmarks[336];
    const browDistance = Math.abs(leftInnerBrow.x - rightInnerBrow.x);
    const browDistanceNormalized = Math.min(1, browDistance / 40);
    const furrowed = 1 - browDistanceNormalized;

    return {
      left: { raised: Math.min(1, leftRaised), furrowed: furrowed * 0.5 },
      right: { raised: Math.min(1, rightRaised), furrowed: furrowed * 0.5 },
    };
  }

  /**
   * Extract mouth data
   */
  private extractMouthData(landmarks: Point2D[]): any {
    // Mouth landmarks
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];

    // Openness
    const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
    const mouthWidth = Math.abs(rightCorner.x - leftCorner.x);
    const openness = Math.min(1, (mouthHeight / (mouthWidth + 0.001)) * 3);

    // Smile detection
    const mouthCornerDiff = (rightCorner.y - leftCorner.y) / (mouthWidth + 0.001);
    const smile = Math.max(0, Math.min(1, 0.5 - mouthCornerDiff * 5));

    // Determine shape
    let shape: MouthShape = 'neutral';
    if (openness < 0.1) {
      shape = smile > 0.5 ? 'smile' : 'neutral';
    } else if (openness > 0.5) {
      shape = smile > 0.5 ? 'surprise' : 'open';
    } else if (smile > 0.7) {
      shape = 'smile';
    }

    return { openness, smile, shape };
  }

  /**
   * Extract jaw data
   */
  private extractJawData(landmarks: Point2D[]): any {
    const chin = landmarks[152];
    const nose = landmarks[1];
    const leftJaw = landmarks[58];
    const rightJaw = landmarks[288];

    const jawOpenness = Math.abs(chin.y - nose.y) / 100;
    const centerX = (leftJaw.x + rightJaw.x) / 2;
    const jawShift = (chin.x - centerX) / 50;

    return {
      openness: Math.min(1, jawOpenness),
      leftShift: Math.max(-1, Math.min(1, -jawShift)),
      rightShift: Math.max(-1, Math.min(1, jawShift)),
    };
  }

  /**
   * Calculate facial expressions (simplified blendshapes)
   */
  private calculateExpressions(landmarks: Point2D[]): any {
    const mouth = this.extractMouthData(landmarks);
    const eyebrows = this.extractEyebrowData(landmarks);

    return {
      smile: mouth.smile,
      frown: Math.max(0, eyebrows.left.furrowed + eyebrows.right.furrowed) / 2,
      surprise: mouth.openness > 0.5 ? mouth.openness : 0,
      anger: (eyebrows.left.furrowed + eyebrows.right.furrowed) / 2,
      disgust: 0,
      fear: 0,
      neutral: 1 - (mouth.smile + mouth.openness) / 2,
    };
  }

  /**
   * Calculate face bounding box
   */
  private calculateFaceBoundingBox(landmarks: Point2D[]): any {
    const xs = landmarks.map((p) => p.x);
    const ys = landmarks.map((p) => p.y);
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
   * Calculate blink rate
   */
  private calculateBlinkRate(leftOpenness: number, rightOpenness: number): number {
    const avgOpenness = (leftOpenness + rightOpenness) / 2;
    return 1 - avgOpenness;
  }

  /**
   * Process pose results
   */
  processPoseResults(results: any): BodyPoseData | null {
    if (!results.poseLandmarks) {
      return null;
    }

    const landmarks = results.poseLandmarks;
    const width = results.imageWidth || 1;
    const height = results.imageHeight || 1;

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
    }> = landmarks.map((lm: { x: number; y: number; visibility?: number }, i: number) => ({
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
    const pose = this.detectPose(upperBody, lowerBody);

    return {
      id: 'body_0',
      isTracked: true,
      confidence: this.calculateBodyConfidence(smoothedLandmarks),
      landmarks: smoothedLandmarks,
      upperBody,
      lowerBody,
      pose,
    };
  }

  /**
   * Get pose landmark name
   */
  private getPoseLandmarkName(index: number): string {
    const names = [
      'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
      'right_eye_inner', 'right_eye', 'right_eye_outer',
      'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
      'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
      'left_index', 'right_index', 'left_thumb', 'right_thumb',
      'left_hip', 'right_hip', 'left_knee', 'right_knee',
      'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
      'left_foot_index', 'right_foot_index',
    ];
    return names[index] || `landmark_${index}`;
  }

  /**
   * Extract upper body data
   */
  private extractUpperBody(landmarks: any[]): any {
    const neckIdx = 0; // Using nose as proxy
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    // Neck (approximate from shoulders)
    const neckPoint = {
      x: (leftShoulder.point.x + rightShoulder.point.x) / 2,
      y: (leftShoulder.point.y + rightShoulder.point.y) / 2,
    };

    // Shoulder tilt
    const shoulderTilt = (rightShoulder.point.y - leftShoulder.point.y) /
      (rightShoulder.point.x - leftShoulder.point.x + 0.001);

    // Shoulder roll
    const shoulderRoll = (leftShoulder.point.y - rightShoulder.point.y) / 50;

    // Chest (approximate)
    const chest = {
      x: neckPoint.x,
      y: neckPoint.y + (leftShoulder.point.y - neckPoint.y) * 1.5,
    };

    // Spine estimation
    const spineTop = neckPoint;
    const spineMiddle = {
      x: chest.x,
      y: (neckPoint.y + leftShoulder.point.y) / 2,
    };
    const hipCenter = {
      x: (landmarks[23]?.point.x + landmarks[24]?.point.x) / 2,
      y: (landmarks[23]?.point.y + landmarks[24]?.point.y) / 2,
    };
    const spineBottom = hipCenter;

    // Spine curvature
    const curvature = this.calculateSpineCurvature(spineTop, spineMiddle, spineBottom);

    return {
      neck: {
        point: neckPoint,
        tilt: shoulderTilt,
        forward: 0, // Would need depth data
      },
      shoulders: {
        left: leftShoulder.point,
        right: rightShoulder.point,
        roll: shoulderRoll,
      },
      chest,
      spine: {
        top: spineTop,
        middle: spineMiddle,
        bottom: spineBottom,
        curvature,
      },
    };
  }

  /**
   * Extract lower body data
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
        left: leftHip.point,
        right: rightHip.point,
        center: {
          x: (leftHip.point.x + rightHip.point.x) / 2,
          y: (leftHip.point.y + rightHip.point.y) / 2,
        },
      },
      knees: {
        left: leftKnee.point,
        right: rightKnee.point,
      },
      ankles: {
        left: leftAnkle.point,
        right: rightAnkle.point,
      },
    };
  }

  /**
   * Calculate spine curvature
   */
  private calculateSpineCurvature(top: Point2D, middle: Point2D, bottom: Point2D): number {
    const topToBottom = Math.sqrt(
      Math.pow(bottom.x - top.x, 2) + Math.pow(bottom.y - top.y, 2)
    );
    const deviation = Math.sqrt(
      Math.pow(middle.x - (top.x + bottom.x) / 2, 2) +
      Math.pow(middle.y - (top.y + bottom.y) / 2, 2)
    );
    return Math.min(1, deviation / (topToBottom + 0.001));
  }

  /**
   * Detect pose type
   */
  private detectPose(upperBody: any, lowerBody: any): PoseType {
    const hipHeight = lowerBody.hips.center.y;
    const kneeHeight = (lowerBody.knees.left.y + lowerBody.knees.right.y) / 2;
    const ankleHeight = (lowerBody.ankles.left.y + lowerBody.ankles.right.y) / 2;
    const shoulderHeight = (upperBody.shoulders.left.y + upperBody.shoulders.right.y) / 2;

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
      (l) => l.visibility !== undefined && l.visibility > 0.5
    );
    return visibleLandmarks.length / landmarks.length;
  }

  /**
   * Process hands results
   */
  processHandsResults(results: any): HandTrackingData[] {
    if (!results.multiHandLandmarks || !results.multiHandedness) {
      return [];
    }

    const hands: HandTrackingData[] = [];
    const width = results.imageWidth || 1;
    const height = results.imageHeight || 1;

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
    const parts = ['wrist', 'palm', ' MCP', ' PIP', ' DIP', ' tip'];
    const finger = Math.floor(index / 4);
    const part = index % 4;
    return `${fingers[finger] || 'unknown'}${parts[part] || ''}`;
  }

  /**
   * Extract finger data
   */
  private extractFingers(landmarks: any[]): any {
    // Landmark indices for each finger (tip, middle, base)
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
      const middle = landmarks[indices[1]]?.point;
      const base = landmarks[indices[2]]?.point;

      if (tip && middle && base) {
        // Calculate extension and curl
        const tipToBase = Math.sqrt(
          Math.pow(tip.x - base.x, 2) + Math.pow(tip.y - base.y, 2)
        );
        const tipToMiddle = Math.sqrt(
          Math.pow(tip.x - middle.x, 2) + Math.pow(tip.y - middle.y, 2)
        );
        const extension = Math.min(1, tipToMiddle / 30);
        const curled = 1 - extension;

        fingers[name] = {
          isExtended: extension > 0.5,
          extension,
          curled,
          landmarks: { tip, middle, base },
        };
      } else {
        fingers[name] = {
          isExtended: false,
          extension: 0,
          curled: 1,
          landmarks: { tip: base || tip, middle: base || middle, base },
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
    const peace = fingers.index.isExtended && fingers.middle.isExtended && !fingers.ring.isExtended && !fingers.pinky.isExtended;

    // OK sign
    const okSign = thumb.isExtended && index.isExtended && this.checkThumbIndexTouch(thumb, index);

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
    } else if (okSign) {
      return { gesture: 'ok_sign', confidence: 0.7 };
    }

    return { gesture: 'unknown', confidence: 0.5 };
  }

  /**
   * Check if thumb and index are touching (for OK sign)
   */
  private checkThumbIndexTouch(thumb: any, index: any): boolean {
    const dist = Math.sqrt(
      Math.pow(thumb.landmarks.tip.x - index.landmarks.tip.x, 2) +
      Math.pow(thumb.landmarks.tip.y - index.landmarks.tip.y, 2)
    );
    return dist < 30;
  }

  /**
   * Calculate palm normal and direction
   */
  private calculatePalmData(landmarks: any[]): { normal: Point3D; direction: Point3D } {
    const wrist = landmarks[0]?.point || { x: 0, y: 0, z: 0 };
    const middleMcp = landmarks[9]?.point || { x: 0, y: 0, z: 0 };

    // Simplified palm direction (from wrist to middle finger)
    const direction: Point3D = {
      x: middleMcp.x - wrist.x,
      y: middleMcp.y - wrist.y,
      z: 0,
    };

    return {
      normal: { x: 0, y: 0, z: 1 }, // Simplified
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
  }
}
