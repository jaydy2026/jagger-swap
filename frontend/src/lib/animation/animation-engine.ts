/**
 * Animation Engine Interface
 * 
 * This defines the interface for the animation engine that will apply
 * motion data to uploaded portraits. Implementation comes in Milestone 2B.
 * 
 * The engine subscribes to MotionFrame from MotionEngine and outputs
 * animated frames while preserving the uploaded identity.
 */

import { MotionFrame } from '@/lib/motion';
import { PortraitIdentity, AnimationParameters } from '@/lib/session';
import {
  AnimationEngineConfig,
  AnimationSubscriber,
  AnimationResult,
  AnimationEvent,
  DEFAULT_ANIMATION_CONFIG,
} from './types';

/**
 * AnimationEngineFactory
 * 
 * Factory function to create an animation engine instance.
 * Returns the appropriate implementation based on availability.
 */
export function createAnimationEngine(
  config?: Partial<AnimationEngineConfig>
): AnimationEngine {
  // This will be implemented with actual rendering logic in Milestone 2B
  return new BaseAnimationEngine(config);
}

/**
 * BaseAnimationEngine
 * 
 * Base implementation of the AnimationEngine interface.
 * Placeholder for Milestone 2B implementation.
 */
export class BaseAnimationEngine implements AnimationEngine {
  private config: AnimationEngineConfig;
  private subscribers: Map<string, AnimationSubscriber> = new Map();
  private portrait: PortraitIdentity | null = null;
  private currentParams: AnimationParameters | null = null;
  private frameCount: number = 0;
  private _isRunning: boolean = false;
  private lastFrameTime: number = 0;

  constructor(config?: Partial<AnimationEngineConfig>) {
    this.config = { ...DEFAULT_ANIMATION_CONFIG, ...config };
  }

  /**
   * Initialize the engine with a portrait
   */
  async initialize(portrait: PortraitIdentity): Promise<void> {
    this.portrait = portrait;
    this.emitEvent('portrait_loaded');
    console.log('[AnimationEngine] Portrait loaded:', portrait.id);
  }

  /**
   * Process a motion frame and generate animation parameters
   */
  processMotionFrame(frame: MotionFrame): AnimationParameters {
    if (!this.portrait) {
      throw new Error('No portrait loaded');
    }

    // Convert MotionFrame to AnimationParameters
    // This will be implemented with actual blending logic in Milestone 2B
    const params: AnimationParameters = {
      frameId: this.frameCount,
      timestamp: frame.timestamp,
      headRotation: {
        x: frame.faces[0]?.headPose.pitch || 0,
        y: frame.faces[0]?.headPose.yaw || 0,
        z: frame.faces[0]?.headPose.roll || 0,
      },
      headPosition: { x: 0, y: 0 },
      blendShapes: this.convertToBlendShapes(frame),
      bodyPose: {
        shoulders: [],
        spine: 0,
        pose: frame.bodies[0]?.pose || 'standing',
      },
      leftHand: frame.hands.find(h => h.handedness === 'left') ? {
        position: frame.hands.find(h => h.handedness === 'left')!.landmarks[0]?.point || { x: 0, y: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        gesture: frame.hands.find(h => h.handedness === 'left')!.gesture,
        fingers: [],
      } : null,
      rightHand: frame.hands.find(h => h.handedness === 'right') ? {
        position: frame.hands.find(h => h.handedness === 'right')!.landmarks[0]?.point || { x: 0, y: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        gesture: frame.hands.find(h => h.handedness === 'right')!.gesture,
        fingers: [],
      } : null,
      confidence: frame.overallConfidence,
    };

    this.currentParams = params;
    this.frameCount++;

    return params;
  }

  /**
   * Convert MotionFrame to blend shapes
   */
  private convertToBlendShapes(frame: MotionFrame): any {
    const face = frame.faces[0];
    
    if (!face) {
      return {};
    }

    // Map face tracking data to ARKit-style blend shapes
    return {
      eyeBlinkLeft: face.leftEye.isBlinking ? 1 : 0,
      eyeBlinkRight: face.rightEye.isBlinking ? 1 : 0,
      eyeLookUp: 0,
      eyeLookDown: 0,
      eyeLookLeft: Math.max(0, -face.headPose.yaw / 45),
      eyeLookRight: Math.max(0, face.headPose.yaw / 45),
      eyeSquintLeft: 0,
      eyeSquintRight: 0,
      jawOpen: face.mouth.openness,
      jawForward: 0,
      jawLeft: face.jaw.leftShift,
      jawRight: face.jaw.rightShift,
      mouthClose: 1 - face.mouth.openness,
      mouthFunnel: 0,
      mouthPucker: 0,
      mouthLeft: 0,
      mouthRight: 0,
      mouthSmileLeft: face.mouth.smile * 0.5,
      mouthSmileRight: face.mouth.smile * 0.5,
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
      cheekSquintLeft: face.expressions.anger * 0.5,
      cheekSquintRight: face.expressions.anger * 0.5,
      browDownLeft: face.eyebrows.left.furrowed,
      browDownRight: face.eyebrows.right.furrowed,
      browInnerUp: (face.eyebrows.left.raised + face.eyebrows.right.raised) / 2,
      browOuterUpLeft: face.eyebrows.left.raised,
      browOuterUpRight: face.eyebrows.right.raised,
      tongueOut: 0,
    };
  }

  /**
   * Render the current frame
   */
  render(): string {
    // Placeholder: Return the original portrait
    // Actual rendering with animation will be implemented in Milestone 2B
    return this.portrait?.imageData || '';
  }

  /**
   * Render to a canvas
   */
  renderToCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.portrait) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = this.portrait.imageData;
  }

  /**
   * Get current animation parameters
   */
  getCurrentParameters(): AnimationParameters | null {
    return this.currentParams;
  }

  /**
   * Start animation loop
   */
  start(): void {
    this._isRunning = true;
    this.emitEvent('started');
    console.log('[AnimationEngine] Animation started');
  }

  /**
   * Stop animation loop
   */
  stop(): void {
    this._isRunning = false;
    this.emitEvent('stopped');
    console.log('[AnimationEngine] Animation stopped');
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Subscribe to animation output
   */
  subscribe(subscriber: AnimationSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[AnimationEngine] Subscriber added: ${subscriber.id}`);
    return () => this.unsubscribe(subscriber.id);
  }

  /**
   * Unsubscribe from animation output
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    console.log(`[AnimationEngine] Subscriber removed: ${subscriberId}`);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnimationEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnimationEngineConfig {
    return { ...this.config };
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(type: AnimationEvent['type'], data?: any): void {
    const event: AnimationEvent = {
      type,
      timestamp: performance.now(),
      data,
    };

    for (const [id, subscriber] of this.subscribers) {
      try {
        subscriber.onEvent(event);
      } catch (error) {
        console.error(`[AnimationEngine] Subscriber ${id} error:`, error);
      }
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.subscribers.clear();
    this.portrait = null;
    this.currentParams = null;
    console.log('[AnimationEngine] Disposed');
  }
}

// ============================================
// Animation Engine Interface
// ============================================

export interface AnimationEngine {
  /**
   * Initialize with a portrait identity
   */
  initialize(portrait: PortraitIdentity): Promise<void>;

  /**
   * Process a motion frame
   */
  processMotionFrame(frame: MotionFrame): AnimationParameters;

  /**
   * Render current state to data URL
   */
  render(): string;

  /**
   * Render to canvas element
   */
  renderToCanvas(canvas: HTMLCanvasElement): void;

  /**
   * Get current animation parameters
   */
  getCurrentParameters(): AnimationParameters | null;

  /**
   * Start animation
   */
  start(): void;

  /**
   * Stop animation
   */
  stop(): void;

  /**
   * Check if running
   */
  isRunning(): boolean;

  /**
   * Subscribe to animation output
   */
  subscribe(subscriber: AnimationSubscriber): () => void;

  /**
   * Unsubscribe
   */
  unsubscribe(subscriberId: string): void;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnimationEngineConfig>): void;

  /**
   * Get configuration
   */
  getConfig(): AnimationEngineConfig;

  /**
   * Cleanup
   */
  dispose(): void;
}
