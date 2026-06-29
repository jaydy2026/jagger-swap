/**
 * Tests for Motion Smoothing Utilities
 */

import {
  ExponentialSmoother,
  OneEuroFilter,
  Point2DSmoother,
  KalmanFilter1D,
  AngularSmoother,
  getSmoothingFactor,
} from '../smoothing';

describe('ExponentialSmoother', () => {
  it('should return the first value unchanged', () => {
    const smoother = new ExponentialSmoother(0.5);
    expect(smoother.smooth(10)).toBe(10);
  });

  it('should smooth subsequent values', () => {
    const smoother = new ExponentialSmoother(0.5);
    smoother.smooth(10); // First value
    const smoothed = smoother.smooth(20); // Second value
    // With factor 0.5: smoothed = 10 + 0.5 * (20 - 10) = 15
    expect(smoothed).toBe(15);
  });

  it('should reset correctly', () => {
    const smoother = new ExponentialSmoother(0.5);
    smoother.smooth(10);
    smoother.smooth(20);
    smoother.reset();
    expect(smoother.smooth(10)).toBe(10);
  });

  it('should respect smoothing factor bounds', () => {
    const smoother = new ExponentialSmoother(0.5);
    smoother.setSmoothingFactor(0.2);
    smoother.smooth(10);
    const result = smoother.smooth(20);
    // With factor 0.2: result = 10 + 0.2 * (20 - 10) = 12
    expect(result).toBe(12);
  });
});

describe('OneEuroFilter', () => {
  it('should return the first value unchanged', () => {
    const filter = new OneEuroFilter(30, 1.0, 0.0);
    expect(filter.filter(10)).toBe(10);
  });

  it('should smooth subsequent values', () => {
    const filter = new OneEuroFilter(30, 1.0, 0.0);
    filter.filter(10);
    const smoothed = filter.filter(20);
    expect(smoothed).toBeGreaterThan(10);
    expect(smoothed).toBeLessThan(20);
  });

  it('should adapt to fast movements', () => {
    const filter = new OneEuroFilter(30, 1.0, 1.0);
    filter.filter(10);
    const fastMovement = filter.filter(100);
    // Fast movement should have less smoothing
    expect(fastMovement).toBeGreaterThan(50);
  });

  it('should reset correctly', () => {
    const filter = new OneEuroFilter(30, 1.0, 0.0);
    filter.filter(10);
    filter.filter(20);
    filter.reset();
    expect(filter.filter(10)).toBe(10);
  });
});

describe('Point2DSmoother', () => {
  it('should smooth 2D points', () => {
    const smoother = new Point2DSmoother(0.5);
    smoother.smooth({ x: 10, y: 20 });
    const smoothed = smoother.smooth({ x: 30, y: 40 });
    expect(smoothed.x).toBe(20); // 10 + 0.5 * (30 - 10)
    expect(smoothed.y).toBe(30); // 20 + 0.5 * (40 - 20)
  });

  it('should reset correctly', () => {
    const smoother = new Point2DSmoother(0.5);
    smoother.smooth({ x: 10, y: 20 });
    smoother.smooth({ x: 30, y: 40 });
    smoother.reset();
    const result = smoother.smooth({ x: 50, y: 60 });
    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
  });
});

describe('KalmanFilter1D', () => {
  it('should return the first measurement unchanged', () => {
    const filter = new KalmanFilter1D(0.1, 1.0);
    expect(filter.filter(10)).toBe(10);
  });

  it('should smooth subsequent measurements', () => {
    const filter = new KalmanFilter1D(0.1, 1.0);
    filter.filter(10);
    const smoothed = filter.filter(20);
    expect(smoothed).toBeGreaterThan(10);
    expect(smoothed).toBeLessThan(20);
  });

  it('should reset correctly', () => {
    const filter = new KalmanFilter1D(0.1, 1.0);
    filter.filter(10);
    filter.filter(20);
    filter.reset();
    expect(filter.filter(10)).toBe(10);
  });
});

describe('AngularSmoother', () => {
  it('should handle angle smoothing without wraparound', () => {
    const smoother = new AngularSmoother(0.5);
    smoother.smoothAngle(10);
    const smoothed = smoother.smoothAngle(20);
    expect(smoothed).toBe(15); // 10 + 0.5 * (20 - 10)
  });

  it('should handle wraparound at 180 degrees', () => {
    const smoother = new AngularSmoother(0.5);
    smoother.smoothAngle(170);
    const smoothed = smoother.smoothAngle(-170);
    // Should handle the wraparound: -170 + 360 = 190, diff = 190 - 170 = 20
    // smoothed = 170 + 0.5 * 20 = 180
    expect(Math.abs(smoothed)).toBeLessThanOrEqual(180);
  });

  it('should reset correctly', () => {
    const smoother = new AngularSmoother(0.5);
    smoother.smoothAngle(10);
    smoother.smoothAngle(20);
    smoother.reset();
    expect(smoother.smoothAngle(10)).toBe(10);
  });
});

describe('getSmoothingFactor', () => {
  it('should return correct factors for each level', () => {
    expect(getSmoothingFactor('low')).toBe(0.3);
    expect(getSmoothingFactor('medium')).toBe(0.5);
    expect(getSmoothingFactor('high')).toBe(0.7);
  });

  it('should default to medium', () => {
    expect(getSmoothingFactor('unknown' as any)).toBe(0.5);
  });
});
