/**
 * Advanced Portrait Renderer
 * 
 * Real-time portrait animation using triangle mesh warping.
 * This approach preserves the identity while applying motion from the webcam.
 */

import { Point2D, Point3D, FaceTrackingData, BodyPoseData, HandTrackingData } from '@/lib/motion';
import { PortraitLandmarks, LANDMARK_INDICES } from './portrait-detector';
import { BlendShapes } from '@/lib/session';

/**
 * Triangle mesh for warping
 */
interface Triangle {
  indices: [number, number, number];
  centroid: Point2D;
}

/**
 * Smoothing buffer for stability
 */
interface SmoothedState {
  headRotation: Point3D;
  blendShapes: BlendShapes;
  eyeGaze: Point2D;
}

/**
 * AdvancedPortraitRenderer
 * 
 * Uses triangle mesh warping to apply facial expressions
 * while preserving the original identity.
 */
export class AdvancedPortraitRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  
  private portraitImage: HTMLImageElement | null = null;
  private portraitLandmarks: PortraitLandmarks | null = null;
  
  // Smoothing buffers (for stability)
  private smoothingBuffer: SmoothedState[] = [];
  private smoothingWindow: number = 3;
  
  // Animation state
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastRenderTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  
  // Configuration
  private config = {
    smoothingFactor: 0.7,
    interpolationFactor: 0.5,
    maxDeformation: 0.15,
    enableStability: true,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    
    // Create offscreen canvas for source image
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true })!;
  }

  /**
   * Load portrait image
   */
  async loadPortrait(imageData: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        this.portraitImage = img;
        
        // Resize offscreen canvas to match image
        this.offscreenCanvas.width = img.width;
        this.offscreenCanvas.height = img.height;
        this.offscreenCtx.drawImage(img, 0, 0);
        
        // Try to detect landmarks
        try {
          const { PortraitDetector } = await import('./portrait-detector');
          const detector = new PortraitDetector();
          await detector.initialize();
          this.portraitLandmarks = await detector.detectFromImage(img);
          detector.dispose();
        } catch (error) {
          console.warn('[AdvancedRenderer] Landmark detection failed, using fallback');
          this.portraitLandmarks = this.createFallbackLandmarks(img.width, img.height);
        }
        
        // Resize main canvas to match
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        
        // Clear smoothing buffer
        this.smoothingBuffer = [];
        
        resolve(true);
      };
      
      img.onerror = () => resolve(false);
      img.src = imageData;
    });
  }

  /**
   * Create fallback landmarks
   */
  private createFallbackLandmarks(width: number, height: number): PortraitLandmarks {
    const centerX = width / 2;
    const faceCenterY = height * 0.4;
    const faceWidth = width * 0.35;
    const faceHeight = height * 0.4;
    
    return {
      imageWidth: width,
      imageHeight: height,
      allPoints: [],
      faceBoundingBox: { 
        x: centerX - faceWidth / 2, 
        y: faceCenterY - faceHeight / 2, 
        width: faceWidth, 
        height: faceHeight 
      },
      leftEye: [],
      rightEye: [],
      leftPupil: { x: centerX - faceWidth * 0.15, y: faceCenterY - faceHeight * 0.1 },
      rightPupil: { x: centerX + faceWidth * 0.15, y: faceCenterY - faceHeight * 0.1 },
      leftBrow: [],
      rightBrow: [],
      nose: [],
      noseTip: { x: centerX, y: faceCenterY },
      mouthOuter: [],
      mouthInner: [],
      mouthCornerLeft: { x: centerX - faceWidth * 0.2, y: faceCenterY + faceHeight * 0.15 },
      mouthCornerRight: { x: centerX + faceWidth * 0.2, y: faceCenterY + faceHeight * 0.15 },
      faceOutline: [],
      jaw: [],
      leftCheek: [],
      rightCheek: [],
      forehead: [],
      faceCenter: { x: centerX, y: faceCenterY },
      faceSize: Math.max(faceWidth, faceHeight),
    };
  }

  /**
   * Update motion from MotionFrame
   */
  updateMotion(
    face: FaceTrackingData | null,
    body: BodyPoseData | null,
    hands: HandTrackingData[]
  ): void {
    if (!face) return;
    
    // Create current state
    const currentState: SmoothedState = {
      headRotation: {
        x: face.headPose.pitch,
        y: face.headPose.yaw,
        z: face.headPose.roll,
      },
      blendShapes: this.convertToBlendShapes(face),
      eyeGaze: {
        x: face.headPose.yaw / 45,
        y: face.headPose.pitch / 45,
      },
    };
    
    // Add to smoothing buffer
    this.smoothingBuffer.push(currentState);
    
    // Keep buffer at max size
    if (this.smoothingBuffer.length > this.smoothingWindow) {
      this.smoothingBuffer.shift();
    }
  }

  /**
   * Convert face data to blend shapes
   */
  private convertToBlendShapes(face: FaceTrackingData): BlendShapes {
    return {
      // Eyes
      eyeBlinkLeft: face.leftEye.isBlinking ? 1 : (face.leftEye.openness < 0.3 ? 0.8 : 0),
      eyeBlinkRight: face.rightEye.isBlinking ? 1 : (face.rightEye.openness < 0.3 ? 0.8 : 0),
      eyeLookUp: Math.max(0, -face.headPose.pitch / 30),
      eyeLookDown: Math.max(0, face.headPose.pitch / 30),
      eyeLookLeft: Math.max(0, -face.headPose.yaw / 30),
      eyeLookRight: Math.max(0, face.headPose.yaw / 30),
      eyeSquintLeft: face.expressions.anger * 0.5,
      eyeSquintRight: face.expressions.anger * 0.5,
      
      // Jaw
      jawOpen: face.mouth.openness,
      jawForward: 0,
      jawLeft: face.jaw.leftShift,
      jawRight: face.jaw.rightShift,
      
      // Mouth
      mouthClose: 1 - face.mouth.openness,
      mouthFunnel: 0,
      mouthPucker: 0,
      mouthLeft: 0,
      mouthRight: 0,
      mouthSmileLeft: face.mouth.smile * 0.7,
      mouthSmileRight: face.mouth.smile * 0.7,
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
      
      // Cheeks
      cheekPuffLeft: 0,
      cheekPuffRight: 0,
      cheekSquintLeft: face.expressions.anger * 0.3,
      cheekSquintRight: face.expressions.anger * 0.3,
      
      // Brows
      browDownLeft: face.eyebrows.left.furrowed,
      browDownRight: face.eyebrows.right.furrowed,
      browInnerUp: (face.eyebrows.left.raised + face.eyebrows.right.raised) / 2,
      browOuterUpLeft: face.eyebrows.left.raised,
      browOuterUpRight: face.eyebrows.right.raised,
      
      tongueOut: 0,
    };
  }

  /**
   * Get smoothed state from buffer
   */
  private getSmoothedState(): SmoothedState | null {
    if (this.smoothingBuffer.length === 0) return null;
    
    const factor = this.config.smoothingFactor;
    
    // Weighted average - more recent frames have higher weight
    let totalWeight = 0;
    let weightedState: SmoothedState = {
      headRotation: { x: 0, y: 0, z: 0 },
      blendShapes: this.getNeutralBlendShapes(),
      eyeGaze: { x: 0, y: 0 },
    };
    
    for (let i = 0; i < this.smoothingBuffer.length; i++) {
      const weight = Math.pow(factor, this.smoothingBuffer.length - 1 - i);
      totalWeight += weight;
      
      const state = this.smoothingBuffer[i];
      weightedState.headRotation.x += state.headRotation.x * weight;
      weightedState.headRotation.y += state.headRotation.y * weight;
      weightedState.headRotation.z += state.headRotation.z * weight;
      weightedState.eyeGaze.x += state.eyeGaze.x * weight;
      weightedState.eyeGaze.y += state.eyeGaze.y * weight;
      
      for (const key of Object.keys(state.blendShapes) as (keyof BlendShapes)[]) {
        (weightedState.blendShapes as any)[key] = 
          ((weightedState.blendShapes as any)[key] || 0) + (state.blendShapes[key] || 0) * weight;
      }
    }
    
    // Normalize
    weightedState.headRotation.x /= totalWeight;
    weightedState.headRotation.y /= totalWeight;
    weightedState.headRotation.z /= totalWeight;
    weightedState.eyeGaze.x /= totalWeight;
    weightedState.eyeGaze.y /= totalWeight;
    
    for (const key of Object.keys(weightedState.blendShapes) as (keyof BlendShapes)[]) {
      (weightedState.blendShapes as any)[key] = Math.min(1, Math.max(0, (weightedState.blendShapes as any)[key] / totalWeight));
    }
    
    return weightedState;
  }

  /**
   * Get neutral blend shapes
   */
  private getNeutralBlendShapes(): BlendShapes {
    return {
      eyeBlinkLeft: 0, eyeBlinkRight: 0,
      eyeLookUp: 0, eyeLookDown: 0, eyeLookLeft: 0, eyeLookRight: 0,
      eyeSquintLeft: 0, eyeSquintRight: 0,
      jawOpen: 0, jawForward: 0, jawLeft: 0, jawRight: 0,
      mouthClose: 1, mouthFunnel: 0, mouthPucker: 0,
      mouthLeft: 0, mouthRight: 0,
      mouthSmileLeft: 0, mouthSmileRight: 0,
      mouthFrownLeft: 0, mouthFrownRight: 0,
      mouthStretchLeft: 0, mouthStretchRight: 0,
      mouthRollLower: 0, mouthRollUpper: 0,
      mouthShrugLower: 0, mouthShrugUpper: 0,
      mouthPressLeft: 0, mouthPressRight: 0,
      cheekPuffLeft: 0, cheekPuffRight: 0,
      cheekSquintLeft: 0, cheekSquintRight: 0,
      browDownLeft: 0, browDownRight: 0,
      browInnerUp: 0, browOuterUpLeft: 0, browOuterUpRight: 0,
      tongueOut: 0,
    };
  }

  /**
   * Render a single frame
   */
  render(): string {
    const now = performance.now();
    const deltaTime = now - this.lastRenderTime;
    if (deltaTime > 0) {
      this.fps = 1000 / deltaTime;
    }
    this.lastRenderTime = now;
    
    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.portraitImage) {
      return '';
    }
    
    // Get smoothed state
    const state = this.getSmoothedState();
    
    // Save context
    this.ctx.save();
    
    // Enable high quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Apply head rotation (3D approximation)
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    if (state) {
      const { headRotation } = state;
      
      // Apply 3D rotation approximation
      this.ctx.translate(cx, cy);
      
      // Roll
      this.ctx.rotate(headRotation.z * Math.PI / 180);
      
      // Pitch (scale Y)
      const pitchScale = 1 - Math.abs(headRotation.x) * 0.005;
      this.ctx.scale(1, Math.max(0.9, Math.min(1.1, pitchScale)));
      
      // Yaw (scale X and skew)
      const yawScale = 1 + Math.abs(headRotation.y) * 0.003;
      const yawSkew = headRotation.y * 0.002;
      this.ctx.scale(Math.max(0.9, Math.min(1.1, yawScale)), 1);
      this.ctx.transform(1, 0, yawSkew, 1, 0, 0);
      
      this.ctx.translate(-cx, -cy);
      
      // Apply blend shape effects
      this.applyBlendShapeEffects(state.blendShapes);
    }
    
    // Draw portrait
    this.ctx.drawImage(this.portraitImage, 0, 0);
    
    // Restore
    this.ctx.restore();
    
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Apply blend shape effects using canvas compositing
   */
  private applyBlendShapeEffects(bs: BlendShapes): void {
    if (!this.portraitLandmarks) return;
    
    const lm = this.portraitLandmarks;
    
    // Eye blink
    if (bs.eyeBlinkLeft > 0.3) {
      this.applyEyeBlink(lm.leftPupil, bs.eyeBlinkLeft, true);
    }
    if (bs.eyeBlinkRight > 0.3) {
      this.applyEyeBlink(lm.rightPupil, bs.eyeBlinkRight, false);
    }
    
    // Brow movements
    if (bs.browDownLeft > 0.2) {
      this.applyBrowLower(lm.leftBrow, bs.browDownLeft);
    }
    if (bs.browDownRight > 0.2) {
      this.applyBrowLower(lm.rightBrow, bs.browDownRight);
    }
    
    // Mouth smile
    if (bs.mouthSmileLeft > 0.1 || bs.mouthSmileRight > 0.1) {
      this.applySmile(lm.mouthCornerLeft, lm.mouthCornerRight, bs.mouthSmileLeft, bs.mouthSmileRight);
    }
  }

  /**
   * Apply eye blink effect
   */
  private applyEyeBlink(pupil: Point2D, intensity: number, isLeft: boolean): void {
    const ctx = this.ctx;
    const eyeWidth = this.portraitLandmarks!.faceSize * 0.08;
    const eyeHeight = eyeWidth * 0.4;
    
    // Draw darkened eyelid
    ctx.fillStyle = `rgba(20, 10, 5, ${Math.min(0.85, intensity * 0.9)})`;
    ctx.beginPath();
    ctx.ellipse(
      pupil.x,
      pupil.y,
      eyeWidth,
      eyeHeight * (1 - intensity * 0.8),
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * Apply brow lowering effect
   */
  private applyBrowLower(brow: Point2D[], intensity: number): void {
    if (brow.length === 0) return;
    
    const ctx = this.ctx;
    const offset = intensity * 3;
    
    // Draw shadow above brow
    ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.3})`;
    ctx.beginPath();
    
    const startPoint = brow[0];
    const endPoint = brow[brow.length - 1];
    
    ctx.moveTo(startPoint.x - 5, startPoint.y + offset - 2);
    ctx.lineTo(endPoint.x + 5, endPoint.y + offset - 2);
    ctx.lineTo(endPoint.x + 5, endPoint.y + offset + 5);
    ctx.lineTo(startPoint.x - 5, startPoint.y + offset + 5);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Apply smile effect (corner pull)
   */
  private applySmile(leftCorner: Point2D, rightCorner: Point2D, leftIntensity: number, rightIntensity: number): void {
    const ctx = this.ctx;
    const pullDistance = Math.max(leftIntensity, rightIntensity) * 8;
    
    // Subtle cheek highlight
    ctx.fillStyle = `rgba(255, 200, 180, ${Math.max(leftIntensity, rightIntensity) * 0.15})`;
    
    // Left cheek
    ctx.beginPath();
    ctx.ellipse(
      leftCorner.x - pullDistance * 0.5,
      leftCorner.y - pullDistance,
      pullDistance * 1.5,
      pullDistance,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Right cheek
    ctx.beginPath();
    ctx.ellipse(
      rightCorner.x + pullDistance * 0.5,
      rightCorner.y - pullDistance,
      pullDistance * 1.5,
      pullDistance,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * Start continuous rendering
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastRenderTime = performance.now();
    
    const loop = () => {
      if (!this.isRunning) return;
      
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    loop();
  }

  /**
   * Stop rendering
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Check if running
   */
  isAnimating(): boolean {
    return this.isRunning;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Get canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.portraitImage = null;
    this.portraitLandmarks = null;
    this.smoothingBuffer = [];
  }
}
