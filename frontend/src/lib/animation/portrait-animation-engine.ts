/**
 * Portrait Animation Engine
 * 
 * Main animation engine that receives MotionFrame data and applies
 * it to the uploaded portrait identity.
 */

import { MotionEngine, MotionFrame, FaceTrackingData, BodyPoseData, HandTrackingData } from '@/lib/motion';
import { PortraitIdentity, AnimationParameters } from '@/lib/session';
import { PortraitLandmarks } from './portrait-detector';
import { AdvancedPortraitRenderer } from './advanced-renderer';
import {
  AnimationEngine as IAnimationEngine,
  AnimationEngineConfig,
  AnimationSubscriber,
  AnimationResult,
  AnimationEvent,
  AnimationState,
  DEFAULT_ANIMATION_CONFIG,
} from './types';

/**
 * PortraitAnimationEngine
 * 
 * Complete implementation of the animation engine that:
 * 1. Receives MotionFrame from MotionEngine
 * 2. Applies motion to the uploaded portrait
 * 3. Preserves identity (face, hair, clothing, etc.)
 * 4. Renders in real-time
 */
export class PortraitAnimationEngine implements IAnimationEngine {
  private config: AnimationEngineConfig;
  
  // Components
  private renderer: AdvancedPortraitRenderer | null = null;
  private motionEngine: MotionEngine | null = null;
  
  // State
  private portrait: PortraitIdentity | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  
  // Subscribers
  private subscribers: Map<string, AnimationSubscriber> = new Map();
  
  // Animation state
  private frameCount: number = 0;
  private lastRenderTime: number = 0;
  private fps: number = 0;
  private renderTime: number = 0;
  
  // Motion subscriptions
  private unsubscribeMotion: (() => void) | null = null;
  
  // Canvas
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, config?: Partial<AnimationEngineConfig>) {
    this.config = { ...DEFAULT_ANIMATION_CONFIG, ...config };
    this.canvas = canvas;
  }

  /**
   * Initialize the animation engine
   */
  async initialize(portrait: PortraitIdentity): Promise<void> {
    this.portrait = portrait;
    
    try {
      // Create renderer
      this.renderer = new AdvancedPortraitRenderer(this.canvas);
      
      // Load portrait into renderer
      const success = await this.renderer.loadPortrait(portrait.imageData);
      
      if (!success) {
        throw new Error('Failed to load portrait image');
      }
      
      // Initialize motion engine
      this.motionEngine = new MotionEngine({
        enableFaceTracking: true,
        enableBodyTracking: true,
        enableHandTracking: true,
        targetFps: this.config.maxFPS,
        smoothingLevel: 'medium',
      });
      
      this.isInitialized = true;
      this.emitEvent('portrait_loaded');
      
      console.log('[PortraitAnimationEngine] Initialized successfully');
    } catch (error) {
      console.error('[PortraitAnimationEngine] Initialization failed:', error);
      this.emitEvent('error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Start the animation
   */
  start(): void {
    if (!this.isInitialized || !this.motionEngine || !this.renderer) {
      console.error('[PortraitAnimationEngine] Cannot start: not initialized');
      return;
    }
    
    if (this.isRunning) {
      console.warn('[PortraitAnimationEngine] Already running');
      return;
    }
    
    // Subscribe to motion engine
    this.unsubscribeMotion = this.motionEngine.subscribe({
      id: 'portrait-animation',
      onMotion: (frame) => {
        this.handleMotionFrame(frame);
      },
      onEvent: (event) => {
        if (event.type === 'error') {
          this.emitEvent('error', event.data);
        }
      },
    });
    
    // Initialize and start motion engine
    this.motionEngine.initialize().then(() => {
      this.motionEngine!.start();
    });
    
    // Start renderer
    this.renderer.start();
    
    this.isRunning = true;
    this.emitEvent('started');
    
    console.log('[PortraitAnimationEngine] Animation started');
  }

  /**
   * Stop the animation
   */
  stop(): void {
    if (!this.isRunning) return;
    
    // Unsubscribe from motion
    if (this.unsubscribeMotion) {
      this.unsubscribeMotion();
      this.unsubscribeMotion = null;
    }
    
    // Stop motion engine
    if (this.motionEngine) {
      this.motionEngine.stop();
    }
    
    // Stop renderer
    if (this.renderer) {
      this.renderer.stop();
    }
    
    this.isRunning = false;
    this.emitEvent('stopped');
    
    console.log('[PortraitAnimationEngine] Animation stopped');
  }

  /**
   * Handle incoming motion frame
   */
  private handleMotionFrame(frame: MotionFrame): void {
    if (!this.renderer) return;
    
    const renderStart = performance.now();
    
    // Extract tracking data
    const face = frame.faces[0] || null;
    const body = frame.bodies[0] || null;
    const hands = frame.hands;
    
    // Update renderer with motion
    this.renderer.updateMotion(face, body, hands);
    
    // Render frame
    const renderedFrame = this.renderer.render();
    
    // Calculate timing
    this.renderTime = performance.now() - renderStart;
    this.fps = frame.fps;
    this.frameCount++;
    
    // Create result
    const result: AnimationResult = {
      frame: renderedFrame,
      fps: this.fps,
      renderTime: this.renderTime,
      quality: {
        score: frame.overallConfidence,
        identityPreserved: true,
        motionAccuracy: frame.overallConfidence,
        smoothness: this.calculateSmoothness(frame),
        issues: this.detectIssues(frame),
      },
    };
    
    // Notify subscribers
    for (const [id, subscriber] of this.subscribers) {
      try {
        subscriber.onFrame(result);
      } catch (error) {
        console.error(`[PortraitAnimationEngine] Subscriber ${id} error:`, error);
      }
    }
  }

  /**
   * Calculate smoothness score
   */
  private calculateSmoothness(frame: MotionFrame): number {
    // Based on tracking quality and processing time
    const qualityFactor = frame.trackingQuality.qualityScore;
    const timeFactor = Math.max(0, 1 - (frame.processingTime / 100));
    
    return (qualityFactor + timeFactor) / 2;
  }

  /**
   * Detect potential issues
   */
  private detectIssues(frame: MotionFrame): string[] {
    const issues: string[] = [];
    
    if (!frame.trackingQuality.faceDetected) {
      issues.push('Face not detected');
    }
    
    if (!frame.trackingQuality.bodyDetected) {
      issues.push('Body not detected');
    }
    
    if (frame.processingTime > 50) {
      issues.push('High latency');
    }
    
    if (frame.overallConfidence < 0.5) {
      issues.push('Low tracking confidence');
    }
    
    return issues;
  }

  /**
   * Set video source for motion tracking
   */
  setVideoSource(videoElement: HTMLVideoElement): void {
    if (this.motionEngine) {
      this.motionEngine.setVideoElement(videoElement);
    }
  }

  /**
   * Get current state
   */
  getState(): AnimationState {
    return {
      status: this.isRunning ? 'animating' : (this.isInitialized ? 'ready' : 'idle'),
      currentFPS: this.fps,
      totalFrames: this.frameCount,
      error: null,
      portraitLoaded: this.portrait !== null,
      portraitDetected: this.renderer !== null,
    };
  }

  /**
   * Get current rendered frame
   */
  getCurrentFrame(): string | null {
    if (!this.renderer) return null;
    return this.renderer.render();
  }

  /**
   * Subscribe to animation output
   */
  subscribe(subscriber: AnimationSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    return () => this.unsubscribe(subscriber.id);
  }

  /**
   * Unsubscribe
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
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
        console.error(`[PortraitAnimationEngine] Subscriber ${id} event error:`, error);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnimationEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    
    if (this.motionEngine) {
      this.motionEngine.dispose();
      this.motionEngine = null;
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.subscribers.clear();
    this.portrait = null;
    this.isInitialized = false;
    
    console.log('[PortraitAnimationEngine] Disposed');
  }
}

/**
 * Create a portrait animation engine instance
 */
export function createPortraitAnimationEngine(
  canvas: HTMLCanvasElement,
  config?: Partial<AnimationEngineConfig>
): PortraitAnimationEngine {
  return new PortraitAnimationEngine(canvas, config);
}
