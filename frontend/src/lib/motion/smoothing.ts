/**
 * Motion Smoothing Utilities
 * 
 * Provides temporal smoothing, motion filtering, and noise reduction
 * for stable motion tracking output.
 */

import { Point2D, Point3D } from './types';

/**
 * Exponential moving average filter for smoothing values over time
 */
export class ExponentialSmoother {
  private previousValue: number;
  private smoothingFactor: number;
  private initialized: boolean;

  constructor(smoothingFactor: number = 0.5) {
    this.smoothingFactor = smoothingFactor;
    this.previousValue = 0;
    this.initialized = false;
  }

  /**
   * Apply smoothing to a new value
   * @param value - New value to smooth
   * @returns Smoothed value
   */
  smooth(value: number): number {
    if (!this.initialized) {
      this.previousValue = value;
      this.initialized = true;
      return value;
    }

    const smoothed = this.previousValue + this.smoothingFactor * (value - this.previousValue);
    this.previousValue = smoothed;
    return smoothed;
  }

  /**
   * Reset the smoother state
   */
  reset(): void {
    this.initialized = false;
    this.previousValue = 0;
  }

  /**
   * Set the smoothing factor
   */
  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}

/**
 * One Euro Filter for smooth motion with adaptive smoothing
 * Based on: https://hal.inria.fr/hal-00670496/document
 */
export class OneEuroFilter {
  private frequency: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number;
  private dxPrev: number;
  private initialized: boolean;

  constructor(
    frequency: number = 30,
    minCutoff: number = 1.0,
    beta: number = 0.0,
    dCutoff: number = 1.0
  ) {
    this.frequency = frequency;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = 0;
    this.dxPrev = 0;
    this.initialized = false;
  }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  /**
   * Apply One Euro filter to a value
   */
  filter(value: number, timestamp?: number): number {
    if (!this.initialized) {
      this.xPrev = value;
      this.dxPrev = 0;
      this.initialized = true;
      return value;
    }

    const dt = timestamp ? timestamp / 1000 : 1.0 / this.frequency;
    
    // Adaptive cutoff based on speed
    const derivative = (value - this.xPrev) / Math.max(dt, 0.001);
    const dCutoff = this.dCutoff + this.beta * Math.abs(derivative);
    
    const edx = this.alpha(dt, dCutoff) * (derivative - this.dxPrev);
    this.dxPrev += edx;
    
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dxPrev);
    const ex = this.alpha(dt, cutoff) * (value - this.xPrev);
    
    this.xPrev += ex + this.dxPrev * dt;
    
    return this.xPrev;
  }

  reset(): void {
    this.initialized = false;
    this.xPrev = 0;
    this.dxPrev = 0;
  }
}

/**
 * Vector smoothing for 2D points
 */
export class Point2DSmoother {
  private xFilter: ExponentialSmoother;
  private yFilter: ExponentialSmoother;
  private factor: number;

  constructor(smoothingFactor: number = 0.5) {
    this.factor = smoothingFactor;
    this.xFilter = new ExponentialSmoother(smoothingFactor);
    this.yFilter = new ExponentialSmoother(smoothingFactor);
  }

  smooth(point: Point2D): Point2D {
    return {
      x: this.xFilter.smooth(point.x),
      y: this.yFilter.smooth(point.y),
    };
  }

  setSmoothingFactor(factor: number): void {
    this.factor = factor;
    this.xFilter = new ExponentialSmoother(factor);
    this.yFilter = new ExponentialSmoother(factor);
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}

/**
 * Vector smoothing for 3D points
 */
export class Point3DSmoother {
  private xFilter: ExponentialSmoother;
  private yFilter: ExponentialSmoother;
  private zFilter: ExponentialSmoother;

  constructor(smoothingFactor: number = 0.5) {
    this.xFilter = new ExponentialSmoother(smoothingFactor);
    this.yFilter = new ExponentialSmoother(smoothingFactor);
    this.zFilter = new ExponentialSmoother(smoothingFactor);
  }

  smooth(point: Point3D): Point3D {
    return {
      x: this.xFilter.smooth(point.x),
      y: this.yFilter.smooth(point.y),
      z: this.zFilter.smooth(point.z),
    };
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}

/**
 * Kalman filter for 1D signal smoothing
 */
export class KalmanFilter1D {
  private processNoise: number;
  private measurementNoise: number;
  private estimate: number;
  private errorCovariance: number;
  private initialized: boolean;

  constructor(processNoise: number = 0.1, measurementNoise: number = 1.0) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    this.estimate = 0;
    this.errorCovariance = 1;
    this.initialized = false;
  }

  filter(measurement: number): number {
    if (!this.initialized) {
      this.estimate = measurement;
      this.initialized = true;
      return measurement;
    }

    // Prediction
    const predictedErrorCovariance = this.errorCovariance + this.processNoise;

    // Update
    const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + this.measurementNoise);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.errorCovariance = (1 - kalmanGain) * predictedErrorCovariance;

    return this.estimate;
  }

  reset(): void {
    this.initialized = false;
    this.estimate = 0;
    this.errorCovariance = 1;
  }
}

/**
 * Landmark smoothing for a set of points
 */
export class LandmarkSmoother {
  private smoothers: Point2DSmoother[] = [];
  private smoothingFactor: number;
  private pointCount: number;

  constructor(pointCount: number, smoothingFactor: number = 0.5) {
    this.pointCount = pointCount;
    this.smoothingFactor = smoothingFactor;
    this.smoothers = Array(pointCount)
      .fill(null)
      .map(() => new Point2DSmoother(smoothingFactor));
  }

  smooth(points: Point2D[]): Point2D[] {
    if (points.length !== this.pointCount) {
      // Reinitialize if point count changes
      this.pointCount = points.length;
      this.smoothers = Array(this.pointCount)
        .fill(null)
        .map(() => new Point2DSmoother(this.smoothingFactor));
    }

    return points.map((point, i) => this.smoothers[i].smooth(point));
  }

  reset(): void {
    this.smoothers.forEach((s) => s.reset());
  }

  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = factor;
    this.smoothers.forEach((s) => s.setSmoothingFactor(factor));
  }
}

/**
 * Velocity filter to reduce jitter based on motion velocity
 */
export class VelocityFilter {
  private previousValue: Point2D | null = null;
  private previousTime: number = 0;
  private velocityThreshold: number;
  private positionThreshold: number;

  constructor(velocityThreshold: number = 10, positionThreshold: number = 2) {
    this.velocityThreshold = velocityThreshold;
    this.positionThreshold = positionThreshold;
  }

  filter(point: Point2D, timestamp: number): Point2D {
    if (!this.previousValue || this.previousTime === 0) {
      this.previousValue = point;
      this.previousTime = timestamp;
      return point;
    }

    const dt = Math.max((timestamp - this.previousTime) / 1000, 0.001);
    const dx = (point.x - this.previousValue.x) / dt;
    const dy = (point.y - this.previousValue.y) / dt;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    // If velocity is very high, trust the new position
    // Otherwise, blend with previous
    if (velocity > this.velocityThreshold) {
      this.previousValue = point;
      this.previousTime = timestamp;
      return point;
    }

    // Apply slight smoothing for low velocities
    const smoothed = {
      x: point.x * 0.3 + this.previousValue.x * 0.7,
      y: point.y * 0.3 + this.previousValue.y * 0.7,
    };

    this.previousValue = smoothed;
    this.previousTime = timestamp;
    return smoothed;
  }

  reset(): void {
    this.previousValue = null;
    this.previousTime = 0;
  }
}

/**
 * Confidence-weighted averaging for stabilizing tracking
 */
export class ConfidenceFilter {
  private values: { value: number; confidence: number; timestamp: number }[] = [];
  private maxHistory: number;
  private decayFactor: number;

  constructor(maxHistory: number = 5, decayFactor: number = 0.8) {
    this.maxHistory = maxHistory;
    this.decayFactor = decayFactor;
  }

  filter(value: number, confidence: number, timestamp: number): number {
    // Add new value
    this.values.push({ value, confidence, timestamp });

    // Keep only recent values
    if (this.values.length > this.maxHistory) {
      this.values.shift();
    }

    if (this.values.length === 0) {
      return value;
    }

    // Weighted average based on confidence and recency
    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < this.values.length; i++) {
      const v = this.values[i];
      const age = (timestamp - v.timestamp) / 1000;
      const timeWeight = Math.pow(this.decayFactor, age);
      const weight = v.confidence * timeWeight;

      weightedSum += v.value * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? weightedSum / weightSum : value;
  }

  reset(): void {
    this.values = [];
  }
}

/**
 * Angular smoother for head pose angles (handling wraparound)
 */
export class AngularSmoother {
  private smoother: ExponentialSmoother;

  constructor(smoothingFactor: number = 0.5) {
    this.smoother = new ExponentialSmoother(smoothingFactor);
  }

  /**
   * Smooth an angle, handling wraparound at 180/-180 or 360/0
   */
  smoothAngle(value: number, wrapRange: number = 180): number {
    const previous = this.smoother['previousValue'];
    
    if (!this.smoother['initialized']) {
      this.smoother.smooth(value);
      return value;
    }

    // Handle wraparound
    let diff = value - previous;
    if (diff > wrapRange) {
      diff -= wrapRange * 2;
    } else if (diff < -wrapRange) {
      diff += wrapRange * 2;
    }

    return this.smoother.smooth(previous + diff);
  }

  reset(): void {
    this.smoother.reset();
  }
}

/**
 * Combined motion smoother factory
 */
export function createSmoother(
  type: 'exponential' | 'oneeuro' | 'kalman',
  config?: {
    smoothingFactor?: number;
    frequency?: number;
    minCutoff?: number;
    beta?: number;
    processNoise?: number;
    measurementNoise?: number;
  }
): ExponentialSmoother | OneEuroFilter | KalmanFilter1D {
  switch (type) {
    case 'oneeuro':
      return new OneEuroFilter(
        config?.frequency || 30,
        config?.minCutoff || 1.0,
        config?.beta || 0.0,
        1.0
      );
    case 'kalman':
      return new KalmanFilter1D(
        config?.processNoise || 0.1,
        config?.measurementNoise || 1.0
      );
    case 'exponential':
    default:
      return new ExponentialSmoother(config?.smoothingFactor || 0.5);
  }
}

/**
 * Get smoothing factor based on smoothing level
 */
export function getSmoothingFactor(level: 'low' | 'medium' | 'high'): number {
  switch (level) {
    case 'low':
      return 0.3;
    case 'medium':
      return 0.5;
    case 'high':
      return 0.7;
    default:
      return 0.5;
  }
}
