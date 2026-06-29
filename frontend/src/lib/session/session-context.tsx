'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { PortraitIdentity, SessionState, SessionStatus, AnimationParameters, createDefaultAnimationParameters } from './types';

// ============================================
// Actions
// ============================================

type SessionAction =
  | { type: 'SET_PORTRAIT'; payload: PortraitIdentity }
  | { type: 'CLEAR_PORTRAIT' }
  | { type: 'SET_MOTION_STATUS'; payload: { isActive: boolean; fps?: number; latency?: number } }
  | { type: 'SET_ANIMATION_STATUS'; payload: { isActive: boolean; fps?: number; latency?: number } }
  | { type: 'SET_STATUS'; payload: SessionStatus }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ANIMATION_PARAMS'; payload: AnimationParameters }
  | { type: 'RESET' };

// ============================================
// Initial State
// ============================================

const initialState: SessionState = {
  sessionId: '',
  portrait: null,
  isMotionActive: false,
  motionFps: 0,
  motionLatency: 0,
  isAnimationActive: false,
  animationFps: 0,
  animationLatency: 0,
  status: 'idle',
  error: null,
};

// ============================================
// Reducer
// ============================================

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_PORTRAIT':
      return {
        ...state,
        portrait: action.payload,
        status: 'portrait_uploaded',
      };
    
    case 'CLEAR_PORTRAIT':
      return {
        ...state,
        portrait: null,
        status: state.isMotionActive ? 'camera_active' : 'idle',
      };
    
    case 'SET_MOTION_STATUS':
      return {
        ...state,
        isMotionActive: action.payload.isActive,
        motionFps: action.payload.fps ?? state.motionFps,
        motionLatency: action.payload.latency ?? state.motionLatency,
        status: action.payload.isActive && state.portrait ? 'animating' : 
                action.payload.isActive ? 'camera_active' : state.status,
      };
    
    case 'SET_ANIMATION_STATUS':
      return {
        ...state,
        isAnimationActive: action.payload.isActive,
        animationFps: action.payload.fps ?? state.animationFps,
        animationLatency: action.payload.latency ?? state.animationLatency,
        status: action.payload.isActive ? 'animating' : 
                state.portrait ? 'portrait_uploaded' : state.status,
      };
    
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        status: action.payload ? 'error' : state.status,
      };
    
    case 'SET_ANIMATION_PARAMS':
      // This updates internal animation state but doesn't change session status
      return state;
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

interface SessionContextValue {
  state: SessionState;
  
  // Portrait actions
  setPortrait: (portrait: PortraitIdentity) => void;
  clearPortrait: () => void;
  
  // Motion actions
  setMotionStatus: (isActive: boolean, fps?: number, latency?: number) => void;
  
  // Animation actions
  setAnimationStatus: (isActive: boolean, fps?: number, latency?: number) => void;
  setAnimationParams: (params: AnimationParameters) => void;
  
  // Status actions
  setStatus: (status: SessionStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Convenience
  isReadyToAnimate: boolean;
  animationParams: AnimationParameters;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface SessionProviderProps {
  children: ReactNode;
  initialSessionId?: string;
}

export function SessionProvider({ children, initialSessionId }: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, {
    ...initialState,
    sessionId: initialSessionId || `session_${Date.now()}`,
  });

  // Animation parameters (managed separately for high-frequency updates)
  const [animationParams, setAnimationParamsState] = React.useState<AnimationParameters>(
    createDefaultAnimationParameters()
  );

  // Portrait actions
  const setPortrait = useCallback((portrait: PortraitIdentity) => {
    dispatch({ type: 'SET_PORTRAIT', payload: portrait });
  }, []);

  const clearPortrait = useCallback(() => {
    dispatch({ type: 'CLEAR_PORTRAIT' });
  }, []);

  // Motion actions
  const setMotionStatus = useCallback((isActive: boolean, fps?: number, latency?: number) => {
    dispatch({ type: 'SET_MOTION_STATUS', payload: { isActive, fps, latency } });
  }, []);

  // Animation actions
  const setAnimationStatus = useCallback((isActive: boolean, fps?: number, latency?: number) => {
    dispatch({ type: 'SET_ANIMATION_STATUS', payload: { isActive, fps, latency } });
  }, []);

  const setAnimationParams = useCallback((params: AnimationParameters) => {
    setAnimationParamsState(params);
    dispatch({ type: 'SET_ANIMATION_PARAMS', payload: params });
  }, []);

  // Status actions
  const setStatus = useCallback((status: SessionStatus) => {
    dispatch({ type: 'SET_STATUS', payload: status });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setAnimationParamsState(createDefaultAnimationParameters());
  }, []);

  // Convenience
  const isReadyToAnimate = state.portrait !== null && state.isMotionActive;

  const value: SessionContextValue = {
    state,
    setPortrait,
    clearPortrait,
    setMotionStatus,
    setAnimationStatus,
    setAnimationParams,
    setStatus,
    setError,
    reset,
    isReadyToAnimate,
    animationParams,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// ============================================
// Identity Hook (for portrait access)
// ============================================

export function usePortrait(): PortraitIdentity | null {
  const { state } = useSession();
  return state.portrait;
}

// ============================================
// Export
// ============================================

export { SessionContext };
