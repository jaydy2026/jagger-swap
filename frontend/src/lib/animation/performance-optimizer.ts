/**
 * Performance Optimizer
 * 
 * Manages frame rate, rendering performance, and resource usage.
 * Implements adaptive quality based on device capabilities.
 */

import { Point2D, Point3D } from '@/lib/motion';
import { BlendShapes } from '@/lib/session';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  fps: number;
  targetFps: number;
  frameTime: number;
  renderTime: number;
  totalLatency: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  droppedFrames: number;
  smoothness: number;
}

/**
 * Quality settings
 */
export interface QualitySettings {
  resolution: 'low' | 'medium' | 'high';
  targetFps: number;
  smoothingLevel: 'low' | 'medium' | 'high';
  enableInterpolation: boolean;
  enableMotionPrediction: boolean;
  enableGpuAcceleration: boolean;
  qualityMode: 'performance' | 'balanced' | 'quality';
}

/**
 * Motion history for smoothing and prediction
 */
export interface MotionHistory {
  headRotation: Point3D[];
  headPosition: Point2D[];
  blendShapes: BlendShapes[];
  eyeGaze: Point2D[];
  timestamps: number[];
}

/**
 * OptimizedMotionState
 */
export interface OptimizedMotionState {
  headRotation: Point3D;
  headPosition: Point2D;
  blendShapes: BlendShapes;
  eyeGaze: Point2D;
  velocity: Point3D;
  confidence: number;
}

/**
 * PerformanceOptimizer
 * 
 * Optimizes rendering by managing frame rate, smoothing,
 * and adaptive quality based on device performance.
 */
export class PerformanceOptimizer {
  // Settings
  private settings: QualitySettings = {
    resolution: 'high',
    targetFps: 30,
    smoothingLevel: 'medium',
    enableInterpolation: true,
    enableMotionPrediction: true,
    enableGpuAcceleration: true,
    qualityMode: 'balanced',
  };

  // Motion history
  private history: MotionHistory = {
    headRotation: [],
    headPosition: [],
    blendShapes: [],
    eyeGaze: [],
    timestamps: [],
  };

  // History size based on FPS
  private maxHistorySize: number = 5;

  // Performance metrics
  private metrics: PerformanceMetrics = {
    fps: 0,
    targetFps: 30,
    frameTime: 0,
    renderTime: 0,
    totalLatency: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    gpuUsage: 0,
    droppedFrames: 0,
    smoothness: 1.0,
  };

  // Timing
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 500;
  private lastFpsUpdate: number = 0;

  // Smoothing factors
  private smoothingFactors: Record<string, number> = {
    headRotation: 0.7,
    headPosition: 0.6,
    blendShapes: 0.5,
    eyeGaze: 0.8,
  };

  // Velocity tracking
  private velocities: {
    headRotation: Point3D;
    headPosition: Point2D;
  } = {
    headRotation: { x: 0, y: 0, z: 0 },
    headPosition: { x: 0, y: 0 },
  };

  // Previous state for velocity calculation
  private prevState: OptimizedMotionState | null = null;

  constructor(settings?: Partial<QualitySettings>) {
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }
    this.updateSmoothingFactors();
  }

  /**
   * Update smoothing factors based on level
   */
  private updateSmoothingFactors(): void {
    const factors: Record<string, Record<string, number>> = {
      low: { headRotation: 0.4, headPosition: 0.3, blendShapes: 0.2, eyeGaze: 0.5 },
      medium: { headRotation: 0.6, headPosition: 0.5, blendShapes: 0.4, eyeGaze: 0.7 },
      high: { headRotation: 0.8, headPosition: 0.7, blendShapes: 0.6, eyeGaze: 0.9 },
    };

    const level = this.settings.smoothingLevel;
    this.smoothingFactors = factors[level];
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<QualitySettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.updateSmoothingFactors();
    this.maxHistorySize = Math.ceil(this.settings.targetFps / 6); // ~5 frames worth
  }

  /**
   * Get current settings
   */
  getSettings(): QualitySettings {
    return { ...this.settings };
  }

  /**
   * Process incoming motion data and return optimized state
   */
  processMotion(
    headRotation: Point3D,
    headPosition: Point2D,
    blendShapes: BlendShapes,
    eyeGaze: Point2D,
    timestamp: number,
    confidence: number = 1.0
  ): OptimizedMotionState {
    const now = performance.now();

    // Add to history
    this.addToHistory(headRotation, headPosition, blendShapes, eyeGaze, timestamp);

    // Calculate velocity
    this.calculateVelocity(now);

    // Apply smoothing
    const smoothedState = this.applySmoothing(headRotation, headPosition, blendShapes, eyeGaze);

    // Apply motion prediction if enabled
    let predictedState = smoothedState;
    if (this.settings.enableMotionPrediction && this.prevState) {
      predictedState = this.applyPrediction(smoothedState, now);
    }

    // Apply confidence weighting
    const finalState = this.applyConfidenceWeighting(predictedState, confidence);

    // Update metrics
    this.updateMetrics(now);

    // Store for next frame
    this.prevState = finalState;

    return finalState;
  }

  /**
   * Add motion data to history
   */
  private addToHistory(
    headRotation: Point3D,
    headPosition: Point2D,
    blendShapes: BlendShapes,
    eyeGaze: Point2D,
    timestamp: number
  ): void {
    this.history.headRotation.push({ ...headRotation });
    this.history.headPosition.push({ ...headPosition });
    this.history.blendShapes.push({ ...blendShapes });
    this.history.eyeGaze.push({ ...eyeGaze });
    this.history.timestamps.push(timestamp);

    // Trim history
    while (this.history.timestamps.length > this.maxHistorySize) {
      this.history.headRotation.shift();
      this.history.headPosition.shift();
      this.history.blendShapes.shift();
      this.history.eyeGaze.shift();
      this.history.timestamps.shift();
    }
  }

  /**
   * Calculate velocity from history
   */
  private calculateVelocity(timestamp: number): void {
    if (this.history.timestamps.length < 2) return;

    const dt = (timestamp - this.history.timestamps[this.history.timestamps.length - 2]) / 1000;
    if (dt <= 0) return;

    const current = this.history.headRotation[this.history.headRotation.length - 1];
    const prev = this.history.headRotation[this.history.headRotation.length - 2];

    this.velocities.headRotation = {
      x: (current.x - prev.x) / dt,
      y: (current.y - prev.y) / dt,
      z: (current.z - prev.z) / dt,
    };

    const currentPos = this.history.headPosition[this.history.headPosition.length - 1];
    const prevPos = this.history.headPosition[this.history.headPosition.length - 2];

    this.velocities.headPosition = {
      x: (currentPos.x - prevPos.x) / dt,
      y: (currentPos.y - prevPos.y) / dt,
    };
  }

  /**
   * Apply temporal smoothing using weighted average
   */
  private applySmoothing(
    headRotation: Point3D,
    headPosition: Point2D,
    blendShapes: BlendShapes,
    eyeGaze: Point2D
  ): OptimizedMotionState {
    const history = this.history;

    if (history.headRotation.length <= 1) {
      return {
        headRotation,
        headPosition,
        blendShapes,
        eyeGaze,
        velocity: { ...this.velocities.headRotation },
        confidence: 1.0,
      };
    }

    // Weighted average - more recent frames have higher weight
    let totalWeight = 0;
    const factor = this.smoothingFactors.headRotation;

    const smoothedRotation: Point3D = { x: 0, y: 0, z: 0 };
    const smoothedPosition: Point2D = { x: 0, y: 0 };
    const smoothedEyeGaze: Point2D = { x: 0, y: 0 };

    for (let i = 0; i < history.headRotation.length; i++) {
      // Exponential weighting
      const weight = Math.pow(factor, history.headRotation.length - 1 - i);
      totalWeight += weight;

      const rot = history.headRotation[i];
      const pos = history.headPosition[i];
      const gaze = history.eyeGaze[i];

      smoothedRotation.x += rot.x * weight;
      smoothedRotation.y += rot.y * weight;
      smoothedRotation.z += rot.z * weight;

      smoothedPosition.x += pos.x * weight;
      smoothedPosition.y += pos.y * weight;

      smoothedEyeGaze.x += gaze.x * weight;
      smoothedEyeGaze.y += gaze.y * weight;
    }

    // Normalize
    smoothedRotation.x /= totalWeight;
    smoothedRotation.y /= totalWeight;
    smoothedRotation.z /= totalWeight;
    smoothedPosition.x /= totalWeight;
    smoothedPosition.y /= totalWeight;
    smoothedEyeGaze.x /= totalWeight;
    smoothedEyeGaze.y /= totalWeight;

    // Blend shapes - use most recent
    const smoothedBlendShapes = this.interpolateBlendShapes(
      history.blendShapes,
      factor
    );

    return {
      headRotation: smoothedRotation,
      headPosition: smoothedPosition,
      blendShapes: smoothedBlendShapes,
      eyeGaze: smoothedEyeGaze,
      velocity: { ...this.velocities.headRotation },
      confidence: totalWeight / this.maxHistorySize,
    };
  }

  /**
   * Interpolate blend shapes
   */
  private interpolateBlendShapes(history: BlendShapes[], factor: number): BlendShapes {
    if (history.length === 0) {
      return this.getNeutralBlendShapes();
    }

    if (history.length === 1) {
      return { ...history[0] };
    }

    const result: BlendShapes = this.getNeutralBlendShapes();
    let totalWeight = 0;

    for (let i = 0; i < history.length; i++) {
      const weight = Math.pow(factor, history.length - 1 - i);
      totalWeight += weight;

      const bs = history[i];
      for (const key of Object.keys(bs) as (keyof BlendShapes)[]) {
        (result as any)[key] = ((result as any)[key] || 0) + (bs[key] || 0) * weight;
      }
    }

    // Normalize
    for (const key of Object.keys(result) as (keyof BlendShapes)[]) {
      (result as any)[key] = Math.min(1, Math.max(0, (result as any)[key] / totalWeight));
    }

    return result;
  }

  /**
   * Apply motion prediction to reduce latency
   */
  private applyPrediction(state: OptimizedMotionState, now: number): OptimizedMotionState {
    if (!this.prevState || this.history.timestamps.length < 2) {
      return state;
    }

    // Calculate time since last frame
    const dt = (now - this.history.timestamps[this.history.timestamps.length - 1]) / 1000;

    // Predict position based on velocity
    const predictionFactor = Math.min(dt * 3, 0.5); // Cap at 500ms prediction

    return {
      ...state,
      headRotation: {
        x: state.headRotation.x + this.velocities.headRotation.x * predictionFactor,
        y: state.headRotation.y + this.velocities.headRotation.y * predictionFactor,
        z: state.headRotation.z + this.velocities.headRotation.z * predictionFactor,
      },
      headPosition: {
        x: state.headPosition.x + this.velocities.headPosition.x * predictionFactor,
        y: state.headPosition.y + this.velocities.headPosition.y * predictionFactor,
      },
    };
  }

  /**
   * Apply confidence weighting
   */
  private applyConfidenceWeighting(
    state: OptimizedMotionState,
    confidence: number
  ): OptimizedMotionState {
    // Blend with neutral pose based on low confidence
    if (confidence >= 0.8) {
      return state;
    }

    const blendFactor = 1 - confidence;
    const neutralRotation: Point3D = { x: 0, y: 0, z: 0 };
    const neutralPosition: Point2D = { x: 0, y: 0 };
    const neutralGaze: Point2D = { x: 0, y: 0 };
    const neutralShapes = this.getNeutralBlendShapes();

    return {
      headRotation: {
        x: state.headRotation.x * confidence + neutralRotation.x * blendFactor,
        y: state.headRotation.y * confidence + neutralRotation.y * blendFactor,
        z: state.headRotation.z * confidence + neutralRotation.z * blendFactor,
      },
      headPosition: {
        x: state.headPosition.x * confidence + neutralPosition.x * blendFactor,
        y: state.headPosition.y * confidence + neutralPosition.y * blendFactor,
      },
      blendShapes: this.blendShapesWithNeutral(state.blendShapes, neutralShapes, blendFactor),
      eyeGaze: {
        x: state.eyeGaze.x * confidence + neutralGaze.x * blendFactor,
        y: state.eyeGaze.y * confidence + neutralGaze.y * blendFactor,
      },
      velocity: state.velocity,
      confidence: state.confidence * confidence,
    };
  }

  /**
   * Blend two blend shape sets
   */
  private blendShapesWithNeutral(
    current: BlendShapes,
    neutral: BlendShapes,
    factor: number
  ): BlendShapes {
    const result: BlendShapes = { ...current };

    for (const key of Object.keys(neutral) as (keyof BlendShapes)[]) {
      (result as any)[key] = 
        (current[key] || 0) * (1 - factor) + (neutral[key] || 0) * factor;
    }

    return result;
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
   * Update performance metrics
   */
  private updateMetrics(now: number): void {
    // Frame time
    this.metrics.frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // FPS calculation
    this.frameCount++;
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const elapsed = now - this.lastFpsUpdate;
      this.metrics.fps = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      // Smoothness based on frame time variance
      if (this.history.timestamps.length >= 2) {
        const variances: number[] = [];
        for (let i = 1; i < this.history.timestamps.length; i++) {
          variances.push(this.history.timestamps[i] - this.history.timestamps[i - 1]);
        }
        const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
        const targetFrameTime = 1000 / this.settings.targetFps;
        this.metrics.smoothness = Math.min(1, targetFrameTime / avgVariance);
      }
    }

    // Memory usage estimate
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    }

    // Total latency estimate
    this.metrics.totalLatency = this.metrics.frameTime + this.metrics.renderTime;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.droppedFrames = 0;
    this.metrics.smoothness = 1.0;
    this.history = {
      headRotation: [],
      headPosition: [],
      blendShapes: [],
      eyeGaze: [],
      timestamps: [],
    };
    this.prevState = null;
  }

  /**
   * Get resolution scale based on settings
   */
  getResolutionScale(): number {
    const scales = { low: 0.5, medium: 0.75, high: 1.0 };
    return scales[this.settings.resolution];
  }

  /**
   * Get canvas size based on resolution
   */
  getCanvasSize(baseWidth: number, baseHeight: number): { width: number; height: number } {
    const scale = this.getResolutionScale();
    return {
      width: Math.round(baseWidth * scale),
      height: Math.round(baseHeight * scale),
    };
  }
}
