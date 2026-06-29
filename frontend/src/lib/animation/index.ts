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

export * from './types';
export { AnimationEngine, BaseAnimationEngine, createAnimationEngine } from './animation-engine';
export { PortraitAnimationEngine, createPortraitAnimationEngine } from './portrait-animation-engine';
export { PortraitRenderer } from './portrait-renderer';
export { PortraitDetector, PortraitLandmarks, normalizePoints, denormalizePoints } from './portrait-detector';
export { AdvancedPortraitRenderer } from './advanced-renderer';
export { PerformanceOptimizer, PerformanceMetrics, QualitySettings as PerformanceQualitySettings } from './performance-optimizer';
export { WebGLRenderer } from './webgl-renderer';
