/**
 * Session Management Module
 * 
 * Manages session state, portrait identity, and animation parameters.
 * 
 * @example
 * ```tsx
 * import { SessionProvider, useSession } from '@/lib/session';
 * 
 * function App() {
 *   return (
 *     <SessionProvider>
 *       <SessionView />
 *     </SessionProvider>
 *   );
 * }
 * ```
 */

export * from './types';
export { SessionProvider, useSession, usePortrait } from './session-context';
export { usePortraitUpload, IdentityProvider, IdentityRenderer } from './identity-provider';
