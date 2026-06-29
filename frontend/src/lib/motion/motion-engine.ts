/**
 * Motion Engine
 * 
 * The main motion capture engine that combines all tracking data
 * into a unified stream. Animation modules can subscribe to this
 * engine without depending on MediaPipe.
 */

import {
  MotionEngine as IMotionEngine,
  MotionEngineConfig,
  MotionFrame,
  MotionSubscriber,
  MotionEvent,
  MotionEventType,
  FaceTrackingData,
  BodyPoseData,
  HandTrackingData,
  TrackingStats,
  TrackingQuality,
} from './types';

import { MediaPipeTracker } from './mediapipe-tracker';
import { getSmoothingFactor } from './smoothing';

/**
 * Default configuration for the motion engine
 */
const DEFAULT_CONFIG: MotionEngineConfig = {
  enableFaceTracking: true,
  enableBodyTracking: true,
  enableHandTracking: true,
  targetFps: 30,
  maxFaces: 1,
  smoothingLevel: 'medium',
  showDebugOverlay: false,
  debugCanvasId: 'motion-debug-canvas',
  temporalSmoothing: 0.5,
  landmarkSmoothing: 0.5,
  velocityFilter: 0.3,
  minFaceConfidence: 0.5,
  minBodyConfidence: 0.4,
  minHandConfidence: 0.5,
};

/**
 * MotionEngine - Real-time motion capture engine
 * 
 * This class provides a clean API for subscribing to motion data.
 * It wraps the underlying tracking implementation (MediaPipe) and
 * exposes normalized data streams.
 */
export class MotionEngine implements IMotionEngine {
  private config: MotionEngineConfig;
  private subscribers: Map<string, MotionSubscriber> = new Map();
  
  private tracker: MediaPipeTracker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsUpdateInterval: number = 500;
  private lastFpsUpdate: number = 0;
  
  // Tracking stats
  private stats: TrackingStats = {
    totalFrames: 0,
    fps: 0,
    averageProcessingTime: 0,
    faceTrackingTime: 0,
    bodyTrackingTime: 0,
    handTrackingTime: 0,
    lastUpdateTime: 0,
  };
  
  private processingTimes: number[] = [];
  private readonly MAX_PROCESSING_TIMES = 30;

  constructor(config: Partial<MotionEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the motion engine
   */
  async initialize(config?: Partial<MotionEngineConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Update smoothing based on level
    if (this.config.smoothingLevel) {
      const factor = getSmoothingFactor(this.config.smoothingLevel);
      this.config.temporalSmoothing = factor;
      this.config.landmarkSmoothing = factor;
    }

    // Initialize MediaPipe tracker
    this.tracker = new MediaPipeTracker(
      {
        maxFaces: this.config.maxFaces,
        refineLandmarks: true,
        minDetectionConfidence: this.config.minFaceConfidence,
        minTrackingConfidence: 0.5,
      },
      {
        temporalSmoothing: this.config.temporalSmoothing,
        landmarkSmoothing: this.config.landmarkSmoothing,
      }
    );

    // Load MediaPipe dependencies
    await this.tracker.load();

    // Set up result callbacks
    this.tracker.setResultsCallback(
      () => {}, // Face results handled in processFrame
      () => {}, // Pose results handled in processFrame
      () => {}  // Hands results handled in processFrame
    );

    // Emit ready event
    this.emitEvent('ready');

    console.log('[MotionEngine] Initialized successfully');
  }

  /**
   * Start motion capture
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[MotionEngine] Already running');
      return;
    }

    if (!this.videoElement) {
      throw new Error('Video element not set. Call setVideoElement first.');
    }

    if (!this.tracker) {
      await this.initialize();
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastFpsUpdate = this.lastFrameTime;

    // Start the capture loop
    this.captureLoop();

    console.log('[MotionEngine] Started');
  }

  /**
   * Stop motion capture
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Emit stopped event
    this.emitEvent('stopped');

    console.log('[MotionEngine] Stopped');
  }

  /**
   * Check if engine is running
   */
  isRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set the video element to capture from
   */
  setVideoElement(video: HTMLVideoElement): void {
    this.videoElement = video;
  }

  /**
   * Set the debug canvas element
   */
  setDebugCanvas(canvas: HTMLCanvasElement): void {
    this.canvasElement = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MotionEngineConfig>): void {
    this.config = { ...this.config, ...config };

    // If smoothing level changed, update smoothing values
    if (config.smoothingLevel) {
      const factor = getSmoothingFactor(config.smoothingLevel);
      this.config.temporalSmoothing = factor;
      this.config.landmarkSmoothing = factor;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MotionEngineConfig {
    return { ...this.config };
  }

  /**
   * Subscribe to motion data
   */
  subscribe(subscriber: MotionSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[MotionEngine] Subscriber added: ${subscriber.id}`);

    // Return unsubscribe function
    return () => this.unsubscribe(subscriber.id);
  }

  /**
   * Unsubscribe from motion data
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    console.log(`[MotionEngine] Subscriber removed: ${subscriberId}`);
  }

  /**
   * Get the latest motion frame
   */
  getLatestFrame(): MotionFrame | null {
    return this.currentFrame;
  }

  private currentFrame: MotionFrame | null = null;

  /**
   * Get tracking statistics
   */
  getTrackingStats(): TrackingStats {
    return { ...this.stats };
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.config.showDebugOverlay = enabled;
  }

  /**
   * Render debug overlay
   */
  renderDebugOverlay(canvas: HTMLCanvasElement): void {
    if (!this.currentFrame || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw webcam frame
    if (this.videoElement) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw face landmarks
    for (const face of this.currentFrame.faces) {
      this.drawFaceDebug(ctx, face);
    }

    // Draw body skeleton
    for (const body of this.currentFrame.bodies) {
      this.drawBodyDebug(ctx, body);
    }

    // Draw hand landmarks
    for (const hand of this.currentFrame.hands) {
      this.drawHandDebug(ctx, hand);
    }

    // Draw info overlay
    this.drawInfoOverlay(ctx);
  }

  /**
   * Draw face debug visualization
   */
  private drawFaceDebug(ctx: CanvasRenderingContext2D, face: FaceTrackingData): void {
    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 1;

    // Draw bounding box
    ctx.strokeRect(face.bbox.x, face.bbox.y, face.bbox.width, face.bbox.height);

    // Draw face mesh points (subset for clarity)
    const drawIndices = [
      // Outline
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      215, 162, 127, 234, 107, 109, 67, 10,
    ];

    ctx.beginPath();
    for (const idx of drawIndices) {
      if (face.landmarks.points[idx]) {
        const point = face.landmarks.points[idx];
        ctx.moveTo(point.x, point.y);
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // Draw head pose text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Pitch: ${face.headPose.pitch.toFixed(1)}°`,
      face.bbox.x,
      face.bbox.y - 25
    );
    ctx.fillText(
      `Roll: ${face.headPose.roll.toFixed(1)}°`,
      face.bbox.x,
      face.bbox.y - 13
    );
    ctx.fillText(
      `Yaw: ${face.headPose.yaw.toFixed(1)}°`,
      face.bbox.x,
      face.bbox.y - 1
    );

    ctx.restore();
  }

  /**
   * Draw body debug visualization
   */
  private drawBodyDebug(ctx: CanvasRenderingContext2D, body: BodyPoseData): void {
    ctx.save();
    ctx.strokeStyle = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.lineWidth = 2;

    // Define connections for skeleton
    const connections = [
      // Torso
      [11, 12], // shoulders
      [11, 23], [12, 24], // shoulders to hips
      [23, 24], // hips
      // Left arm
      [11, 13], [13, 15], // shoulder to wrist
      // Right arm
      [12, 14], [14, 16],
      // Left leg
      [23, 25], [25, 27], [27, 29], [27, 31], // hip to ankle
      // Right leg
      [24, 26], [26, 28], [28, 30], [28, 32],
    ];

    const nameToIdx = new Map(
      body.landmarks.map((l, i) => [l.name, i])
    );

    for (const [start, end] of connections) {
      const startLandmark = body.landmarks[start];
      const endLandmark = body.landmarks[end];

      if (startLandmark && endLandmark && 
          startLandmark.confidence > 0.5 && endLandmark.confidence > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startLandmark.point.x, startLandmark.point.y);
        ctx.lineTo(endLandmark.point.x, endLandmark.point.y);
        ctx.stroke();
      }
    }

    // Draw joint points
    for (const landmark of body.landmarks) {
      if (landmark.confidence > 0.5) {
        ctx.beginPath();
        ctx.arc(landmark.point.x, landmark.point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Draw hand debug visualization
   */
  private drawHandDebug(ctx: CanvasRenderingContext2D, hand: HandTrackingData): void {
    ctx.save();
    ctx.strokeStyle = hand.handedness === 'left' ? '#ffaa00' : '#00aaff';
    ctx.fillStyle = hand.handedness === 'left' ? '#ffaa00' : '#00aaff';
    ctx.lineWidth = 2;

    // Draw connections
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
    ];

    for (const [start, end] of connections) {
      const startPoint = hand.landmarks[start]?.point;
      const endPoint = hand.landmarks[end]?.point;

      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    }

    // Draw landmark points
    for (const landmark of hand.landmarks) {
      ctx.beginPath();
      ctx.arc(landmark.point.x, landmark.point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw gesture label
    const firstPoint = hand.landmarks[0]?.point;
    if (firstPoint) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(
        `${hand.handedness}: ${hand.gesture}`,
        firstPoint.x,
        firstPoint.y - 10
      );
    }

    ctx.restore();
  }

  /**
   * Draw performance info overlay
   */
  private drawInfoOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.currentFrame) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(5, 5, 150, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 10, 20);
    ctx.fillText(`Frame: ${this.stats.totalFrames}`, 10, 35);
    ctx.fillText(`Process: ${this.currentFrame.processingTime.toFixed(1)}ms`, 10, 50);

    ctx.restore();
  }

  /**
   * Main capture loop
   */
  private captureLoop = async (): Promise<void> => {
    if (!this.isRunning || !this.videoElement || !this.tracker) return;

    const frameStart = performance.now();

    try {
      // Process frame through tracker
      const results = await this.processFrame();

      // Create motion frame
      const frame: MotionFrame = {
        timestamp: frameStart,
        frameId: this.frameCount,
        faces: results.faces,
        bodies: results.bodies,
        hands: results.hands,
        overallConfidence: this.calculateOverallConfidence(results),
        trackingQuality: this.calculateTrackingQuality(results),
        fps: this.fps,
        processingTime: frameStart - this.lastFrameTime,
      };

      this.currentFrame = frame;

      // Update stats
      this.updateStats(frameStart - this.lastFrameTime);

      // Notify subscribers
      this.notifySubscribers(frame);

      // Render debug overlay if enabled
      if (this.config.showDebugOverlay && this.canvasElement) {
        this.renderDebugOverlay(this.canvasElement);
      }

      this.lastFrameTime = frameStart;
      this.frameCount++;

    } catch (error) {
      console.error('[MotionEngine] Frame processing error:', error);
      this.emitEvent('error', error instanceof Error ? error.message : 'Unknown error');
    }

    // Schedule next frame
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.captureLoop);
    }
  };

  /**
   * Process a single frame through the tracker
   */
  private async processFrame(): Promise<{
    faces: FaceTrackingData[];
    bodies: BodyPoseData[];
    hands: HandTrackingData[];
  }> {
    if (!this.videoElement || !this.tracker) {
      return { faces: [], bodies: [], hands: [] };
    }

    const faceStart = performance.now();
    const poseStart = performance.now();
    const handsStart = performance.now();

    let faces: FaceTrackingData[] = [];
    let bodies: BodyPoseData[] = [];
    let hands: HandTrackingData[] = [];

    // Process through MediaPipe trackers
    await this.tracker.processFrame(this.videoElement);

    // For now, we'll use a simpler synchronous approach
    // In production, this would be async with proper callbacks

    // Update timing stats
    this.stats.faceTrackingTime = performance.now() - faceStart;
    this.stats.bodyTrackingTime = performance.now() - poseStart;
    this.stats.handTrackingTime = performance.now() - handsStart;

    // For demo purposes, create placeholder data
    // In production, this would come from MediaPipe callbacks
    return { faces, bodies, hands };
  }

  /**
   * Calculate overall confidence from all tracking data
   */
  private calculateOverallConfidence(results: {
    faces: FaceTrackingData[];
    bodies: BodyPoseData[];
    hands: HandTrackingData[];
  }): number {
    let total = 0;
    let count = 0;

    for (const face of results.faces) {
      total += face.confidence;
      count++;
    }

    for (const body of results.bodies) {
      total += body.confidence;
      count++;
    }

    for (const hand of results.hands) {
      total += hand.confidence;
      count++;
    }

    return count > 0 ? total / count : 0;
  }

  /**
   * Calculate tracking quality metrics
   */
  private calculateTrackingQuality(results: {
    faces: FaceTrackingData[];
    bodies: BodyPoseData[];
    hands: HandTrackingData[];
  }): TrackingQuality {
    const faceDetected = results.faces.length > 0;
    const bodyDetected = results.bodies.length > 0;
    const leftHand = results.hands.find((h) => h.handedness === 'left');
    const rightHand = results.hands.find((h) => h.handedness === 'right');

    const qualityScore =
      (faceDetected ? 0.3 : 0) +
      (bodyDetected ? 0.3 : 0) +
      ((leftHand ? 0.2 : 0) + (rightHand ? 0.2 : 0));

    return {
      faceDetected,
      bodyDetected,
      handsDetected: {
        left: !!leftHand,
        right: !!rightHand,
      },
      qualityScore,
    };
  }

  /**
   * Update tracking statistics
   */
  private updateStats(processingTime: number): void {
    this.stats.totalFrames++;
    this.stats.lastUpdateTime = performance.now();

    // Update processing time average
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.MAX_PROCESSING_TIMES) {
      this.processingTimes.shift();
    }
    this.stats.averageProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;

    // Update FPS
    const now = performance.now();
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const elapsed = now - this.lastFpsUpdate;
      this.fps = (this.frameCount * 1000) / elapsed;
      this.stats.fps = this.fps;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  /**
   * Notify all subscribers of a new frame
   */
  private notifySubscribers(frame: MotionFrame): void {
    for (const [id, subscriber] of this.subscribers) {
      try {
        // Apply filters if set
        let shouldNotify = true;

        if (subscriber.faceFilter && frame.faces.length > 0) {
          const filteredFaces = frame.faces.filter(subscriber.faceFilter);
          if (filteredFaces.length === 0) shouldNotify = false;
        }

        if (subscriber.bodyFilter && frame.bodies.length > 0) {
          const filteredBodies = frame.bodies.filter(subscriber.bodyFilter);
          if (filteredBodies.length === 0) shouldNotify = false;
        }

        if (subscriber.handFilter && frame.hands.length > 0) {
          const filteredHands = frame.hands.filter(subscriber.handFilter);
          if (filteredHands.length === 0) shouldNotify = false;
        }

        if (shouldNotify) {
          subscriber.onMotion(frame);
        }
      } catch (error) {
        console.error(`[MotionEngine] Subscriber ${id} error:`, error);
      }
    }
  }

  /**
   * Emit a motion event
   */
  private emitEvent(type: MotionEventType, data?: any): void {
    const event: MotionEvent = {
      type,
      timestamp: performance.now(),
      data,
    };

    for (const [id, subscriber] of this.subscribers) {
      try {
        subscriber.onEvent(event);
      } catch (error) {
        console.error(`[MotionEngine] Subscriber ${id} event error:`, error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();

    if (this.tracker) {
      this.tracker.dispose();
      this.tracker = null;
    }

    this.subscribers.clear();
    this.videoElement = null;
    this.canvasElement = null;
    this.ctx = null;

    console.log('[MotionEngine] Disposed');
  }
}
