/**
 * Motion Engine Module
 * 
 * Real-time motion capture engine for tracking face, body, and hands.
 * 
 * @example
 * ```typescript
 * import { MotionEngine, MotionEngineConfig } from '@/lib/motion';
 * 
 * const engine = new MotionEngine();
 * await engine.initialize();
 * engine.setVideoElement(videoElement);
 * 
 * engine.subscribe({
 *   id: 'animation-module',
 *   onMotion: (frame) => {
 *     // Use face, body, and hand data for animation
 *     const headPose = frame.faces[0]?.headPose;
 *   },
 *   onEvent: (event) => {
 *     console.log('Motion event:', event.type);
 *   }
 * });
 * 
 * await engine.start();
 * ```
 */

export * from './types';
export * from './smoothing';
export { MotionEngine } from './motion-engine';
export { MediaPipeTracker } from './mediapipe-tracker';
