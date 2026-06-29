/**
 * Animation Engine Module
 * 
 * Provides animation capabilities for applying motion data
 * to uploaded portrait images.
 * 
 * @example
 * ```typescript
 * import { createAnimationEngine } from '@/lib/animation';
 * 
 * const engine = createAnimationEngine({ canvasWidth: 512, canvasHeight: 512 });
 * await engine.initialize(portrait);
 * 
 * engine.subscribe({
 *   id: 'renderer',
 *   onFrame: (result) => updateCanvas(result.frame),
 *   onEvent: (event) => console.log(event.type),
 * });
 * 
 * engine.start();
 * ```
 */

export * from './types';
export { AnimationEngine, BaseAnimationEngine, createAnimationEngine } from './animation-engine';
