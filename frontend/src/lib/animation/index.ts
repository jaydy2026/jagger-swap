/**
 * Animation Engine Module
 * 
 * Provides animation capabilities for applying motion data
 * to uploaded portrait images.
 * 
 * @example
 * ```typescript
 * import { PortraitAnimationEngine } from '@/lib/animation';
 * 
 * const engine = new PortraitAnimationEngine(canvas);
 * await engine.initialize(portrait);
 * 
 * engine.subscribe({
 *   id: 'renderer',
 *   onFrame: (result) => updateCanvas(result.frame),
 *   onEvent: (event) => console.log(event.type),
 * });
 * 
 * engine.setVideoSource(videoElement);
 * engine.start();
 * ```
 */

// Types
export * from './types';

// Animation engine
export { BaseAnimationEngine, createAnimationEngine } from './animation-engine';
export type { AnimationEngine } from './animation-engine';

// Portrait animation
export { PortraitAnimationEngine, createPortraitAnimationEngine } from './portrait-animation-engine';

// Rendering
export { PortraitRenderer } from './portrait-renderer';
export { PortraitDetector, normalizePoints, denormalizePoints } from './portrait-detector';
export type { PortraitLandmarks } from './portrait-detector';
export { AdvancedPortraitRenderer } from './advanced-renderer';

// Performance
export { PerformanceOptimizer } from './performance-optimizer';
export type { PerformanceMetrics, QualitySettings as PerformanceQualitySettings } from './performance-optimizer';

// WebGL
export { WebGLRenderer } from './webgl-renderer';
