/**
 * Portrait Renderer
 * 
 * Renders the animated portrait by applying motion data to the uploaded image.
 * Uses canvas-based rendering with landmark warping.
 */

import { Point2D, Point3D, FaceTrackingData, BodyPoseData, HandTrackingData } from '@/lib/motion';
import { PortraitLandmarks, LANDMARK_INDICES } from './portrait-detector';
import { BlendShapes } from '@/lib/session';

/**
 * Render configuration
 */
export interface RenderConfig {
  // Output size
  width: number;
  height: number;
  
  // Quality
  antialiasing: boolean;
  imageSmoothing: boolean;
  
  // Animation
  interpolationFrames: number;
  
  // Debug
  showLandmarks: boolean;
  showWireframe: boolean;
}

/**
 * Default render config
 */
export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  width: 512,
  height: 512,
  antialiasing: true,
  imageSmoothing: true,
  interpolationFrames: 2,
  showLandmarks: false,
  showWireframe: false,
};

/**
 * Animation state for smooth interpolation
 */
export interface AnimationState {
  // Current pose
  headPosition: Point2D;
  headRotation: Point3D;
  eyeGaze: Point2D;
  blendShapes: BlendShapes;
  
  // Previous pose (for interpolation)
  prevHeadPosition: Point2D;
  prevHeadRotation: Point3D;
  prevEyeGaze: Point2D;
  prevBlendShapes: BlendShapes;
  
  // Interpolation progress
  alpha: number;
}

/**
 * PortraitRenderer
 * 
 * Renders the animated portrait by warping the original image
 * based on motion data.
 */
export class PortraitRenderer {
  private config: RenderConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  private portraitImage: HTMLImageElement | null = null;
  private portraitLandmarks: PortraitLandmarks | null = null;
  
  private animationState: AnimationState;
  private lastUpdateTime: number = 0;
  
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config?: Partial<RenderConfig>) {
    this.config = { ...DEFAULT_RENDER_CONFIG, ...config };
    this.canvas = canvas;
    
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: false,
      alpha: true 
    });
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    this.ctx = ctx;
    
    // Initialize animation state
    this.animationState = this.createDefaultAnimationState();
  }

  /**
   * Create default animation state
   */
  private createDefaultAnimationState(): AnimationState {
    return {
      headPosition: { x: 0, y: 0 },
      headRotation: { x: 0, y: 0, z: 0 },
      eyeGaze: { x: 0, y: 0 },
      blendShapes: this.getNeutralBlendShapes(),
      prevHeadPosition: { x: 0, y: 0 },
      prevHeadRotation: { x: 0, y: 0, z: 0 },
      prevEyeGaze: { x: 0, y: 0 },
      prevBlendShapes: this.getNeutralBlendShapes(),
      alpha: 1.0,
    };
  }

  /**
   * Get neutral blend shapes (no animation)
   */
  private getNeutralBlendShapes(): BlendShapes {
    return {
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
  }

  /**
   * Load portrait image and detect landmarks
   */
  async loadPortrait(imageData: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        this.portraitImage = img;
        
        // Detect landmarks
        const { PortraitDetector } = await import('./portrait-detector');
        const detector = new PortraitDetector();
        
        try {
          await detector.initialize();
          this.portraitLandmarks = await detector.detectFromImage(img);
          detector.dispose();
          resolve();
        } catch (error) {
          console.warn('[PortraitRenderer] Could not detect landmarks, using fallback');
          // Create fallback landmarks based on image dimensions
          this.portraitLandmarks = this.createFallbackLandmarks(img.width, img.height);
          resolve();
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load portrait image'));
      };
      
      img.src = imageData;
    });
  }

  /**
   * Create fallback landmarks when detection fails
   */
  private createFallbackLandmarks(width: number, height: number): PortraitLandmarks {
    const faceWidth = width * 0.4;
    const faceHeight = height * 0.5;
    const faceX = width * 0.3;
    const faceY = height * 0.2;
    
    const centerX = faceX + faceWidth / 2;
    const centerY = faceY + faceHeight / 2;
    
    return {
      imageWidth: width,
      imageHeight: height,
      allPoints: [],
      faceBoundingBox: { x: faceX, y: faceY, width: faceWidth, height: faceHeight },
      leftEye: [],
      rightEye: [],
      leftPupil: { x: centerX - faceWidth * 0.15, y: centerY - faceHeight * 0.1 },
      rightPupil: { x: centerX + faceWidth * 0.15, y: centerY - faceHeight * 0.1 },
      leftBrow: [],
      rightBrow: [],
      nose: [{ x: centerX, y: centerY }],
      noseTip: { x: centerX, y: centerY + faceHeight * 0.1 },
      mouthOuter: [],
      mouthInner: [],
      mouthCornerLeft: { x: centerX - faceWidth * 0.2, y: centerY + faceHeight * 0.25 },
      mouthCornerRight: { x: centerX + faceWidth * 0.2, y: centerY + faceHeight * 0.25 },
      faceOutline: [],
      jaw: [],
      leftCheek: [],
      rightCheek: [],
      forehead: [],
      faceCenter: { x: centerX, y: centerY },
      faceSize: Math.max(faceWidth, faceHeight),
    };
  }

  /**
   * Apply motion to the portrait
   */
  updateMotion(
    face: FaceTrackingData | null,
    body: BodyPoseData | null,
    hands: HandTrackingData[]
  ): void {
    // Store previous state for interpolation
    this.animationState.prevHeadPosition = { ...this.animationState.headPosition };
    this.animationState.prevHeadRotation = { ...this.animationState.headRotation };
    this.animationState.prevEyeGaze = { ...this.animationState.eyeGaze };
    this.animationState.prevBlendShapes = { ...this.animationState.blendShapes };
    
    if (face) {
      // Update head pose
      this.animationState.headRotation = {
        x: face.headPose.pitch,
        y: face.headPose.yaw,
        z: face.headPose.roll,
      };
      
      // Calculate head position offset based on gaze
      this.animationState.eyeGaze = {
        x: face.headPose.yaw / 45,
        y: face.headPose.pitch / 45,
      };
      
      // Convert to blend shapes
      this.animationState.blendShapes = this.convertToBlendShapes(face);
    } else {
      // Return to neutral
      const neutral = this.getNeutralBlendShapes();
      this.animationState.headRotation = { x: 0, y: 0, z: 0 };
      this.animationState.eyeGaze = { x: 0, y: 0 };
      this.animationState.blendShapes = neutral;
    }
    
    this.lastUpdateTime = performance.now();
    this.animationState.alpha = 0;
  }

  /**
   * Convert face tracking data to blend shapes
   */
  private convertToBlendShapes(face: FaceTrackingData): BlendShapes {
    return {
      // Eye shapes
      eyeBlinkLeft: face.leftEye.isBlinking ? 1 : face.leftEye.openness < 0.3 ? 0.8 : 0,
      eyeBlinkRight: face.rightEye.isBlinking ? 1 : face.rightEye.openness < 0.3 ? 0.8 : 0,
      eyeLookUp: Math.max(0, -face.headPose.pitch / 30),
      eyeLookDown: Math.max(0, face.headPose.pitch / 30),
      eyeLookLeft: Math.max(0, -face.headPose.yaw / 30),
      eyeLookRight: Math.max(0, face.headPose.yaw / 30),
      eyeSquintLeft: face.expressions.anger * 0.5,
      eyeSquintRight: face.expressions.anger * 0.5,
      
      // Jaw shapes
      jawOpen: face.mouth.openness,
      jawForward: 0,
      jawLeft: face.jaw.leftShift,
      jawRight: face.jaw.rightShift,
      
      // Mouth shapes
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
      
      // Cheek shapes
      cheekPuffLeft: 0,
      cheekPuffRight: 0,
      cheekSquintLeft: face.expressions.anger * 0.3,
      cheekSquintRight: face.expressions.anger * 0.3,
      
      // Brow shapes
      browDownLeft: face.eyebrows.left.furrowed,
      browDownRight: face.eyebrows.right.furrowed,
      browInnerUp: (face.eyebrows.left.raised + face.eyebrows.right.raised) / 2,
      browOuterUpLeft: face.eyebrows.left.raised,
      browOuterUpRight: face.eyebrows.right.raised,
      
      // Tongue
      tongueOut: 0,
    };
  }

  /**
   * Interpolate between previous and current animation state
   */
  private interpolate(alpha: number): AnimationState {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpPoint = (a: Point2D, b: Point2D, t: number): Point2D => ({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
    });
    const lerpPoint3D = (a: Point3D, b: Point3D, t: number): Point3D => ({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t),
    });
    
    const lerpBlendShapes = (a: BlendShapes, b: BlendShapes, t: number): BlendShapes => {
      const result: any = {};
      for (const key of Object.keys(a) as (keyof BlendShapes)[]) {
        result[key] = lerp(a[key], b[key], t);
      }
      return result as BlendShapes;
    };
    
    return {
      headPosition: lerpPoint(this.animationState.prevHeadPosition, this.animationState.headPosition, alpha),
      headRotation: lerpPoint3D(this.animationState.prevHeadRotation, this.animationState.headRotation, alpha),
      eyeGaze: lerpPoint(this.animationState.prevEyeGaze, this.animationState.eyeGaze, alpha),
      blendShapes: lerpBlendShapes(this.animationState.prevBlendShapes, this.animationState.blendShapes, alpha),
      prevHeadPosition: this.animationState.prevHeadPosition,
      prevHeadRotation: this.animationState.prevHeadRotation,
      prevEyeGaze: this.animationState.prevEyeGaze,
      prevBlendShapes: this.animationState.prevBlendShapes,
      alpha,
    };
  }

  /**
   * Render a single frame
   */
  render(): string {
    const alpha = Math.min(1, (performance.now() - this.lastUpdateTime) / 16.67);
    const state = this.interpolate(alpha);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.portraitImage) {
      return '';
    }
    
    // Save context
    this.ctx.save();
    
    // Set rendering quality
    this.ctx.imageSmoothingEnabled = this.config.imageSmoothing;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Apply head rotation (2D approximation)
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(state.headRotation.z * Math.PI / 180); // Roll
    this.ctx.scale(
      1 + Math.sin(state.headRotation.y * Math.PI / 180) * 0.1, // Yaw affects scale
      1 - Math.abs(state.headRotation.y * Math.PI / 180) * 0.05 // Yaw affects height
    );
    this.ctx.translate(-centerX, -centerY);
    
    // Apply head position offset
    const offsetX = state.headPosition.x * 20;
    const offsetY = state.headPosition.y * 20;
    
    // Draw the portrait image
    this.ctx.drawImage(
      this.portraitImage,
      offsetX,
      offsetY,
      this.canvas.width,
      this.canvas.height
    );
    
    // If we have landmark data, apply additional warping
    if (this.portraitLandmarks && this.portraitLandmarks.allPoints.length > 0) {
      this.applyBlendShapeEffects(state);
    }
    
    // Restore context
    this.ctx.restore();
    
    // Debug: Show landmarks
    if (this.config.showLandmarks && this.portraitLandmarks) {
      this.drawDebugLandmarks();
    }
    
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Apply blend shape effects to the rendered image
   */
  private applyBlendShapeEffects(state: AnimationState): void {
    const ls = state.blendShapes;
    const lm = this.portraitLandmarks!;
    
    // Apply eye blink
    if (ls.eyeBlinkLeft > 0.5) {
      this.applyEyeBlink(lm.leftEye, ls.eyeBlinkLeft, true);
    }
    if (ls.eyeBlinkRight > 0.5) {
      this.applyEyeBlink(lm.rightEye, ls.eyeBlinkRight, false);
    }
    
    // Apply smile
    if (ls.mouthSmileLeft > 0.1 || ls.mouthSmileRight > 0.1) {
      this.applySmile(ls.mouthSmileLeft, ls.mouthSmileRight);
    }
  }

  /**
   * Apply eye blink effect
   */
  private applyEyeBlink(eyePoints: Point2D[], intensity: number, isLeft: boolean): void {
    if (eyePoints.length < 6) return;
    
    const ctx = this.ctx;
    
    // Get eye bounding box
    const xs = eyePoints.map(p => p.x);
    const ys = eyePoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Draw eyelid overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(
      minX + width / 2,
      minY + height / 2,
      width / 2,
      height / 2 * intensity,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * Apply smile effect
   */
  private applySmile(leftIntensity: number, rightIntensity: number): void {
    // This would require more sophisticated image manipulation
    // For now, we just indicate where smile enhancement would go
  }

  /**
   * Draw debug landmarks
   */
  private drawDebugLandmarks(): void {
    const lm = this.portraitLandmarks!;
    const ctx = this.ctx;
    
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 1;
    
    // Draw all points
    for (const point of lm.allPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw face outline
    if (lm.faceOutline.length > 0) {
      ctx.beginPath();
      ctx.moveTo(lm.faceOutline[0].x, lm.faceOutline[0].y);
      for (let i = 1; i < lm.faceOutline.length; i++) {
        ctx.lineTo(lm.faceOutline[i].x, lm.faceOutline[i].y);
      }
      ctx.stroke();
    }
  }

  /**
   * Start continuous rendering
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    loop();
  }

  /**
   * Stop continuous rendering
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
   * Get current canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.portraitImage = null;
    this.portraitLandmarks = null;
  }
}
