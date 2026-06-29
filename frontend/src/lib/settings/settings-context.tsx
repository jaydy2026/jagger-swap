'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS, QualitySettings, CameraSettings, RecordingSettings, DebugSettings } from './types';

const STORAGE_KEY = 'jagger-swap-settings';

/**
 * Settings Context
 */
interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateQuality: (quality: Partial<QualitySettings>) => void;
  updateCamera: (camera: Partial<CameraSettings>) => void;
  updateRecording: (recording: Partial<RecordingSettings>) => void;
  updateDebug: (debug: Partial<DebugSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Load settings from localStorage
 */
function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

/**
 * Settings Provider
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    setSettings(loadSettings());
    setIsLoaded(true);
  }, []);

  // Save settings when changed
  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  /**
   * Update entire settings
   */
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  /**
   * Update quality settings
   */
  const updateQuality = useCallback((quality: Partial<QualitySettings>) => {
    setSettings(prev => ({
      ...prev,
      quality: { ...prev.quality, ...quality },
    }));
  }, []);

  /**
   * Update camera settings
   */
  const updateCamera = useCallback((camera: Partial<CameraSettings>) => {
    setSettings(prev => ({
      ...prev,
      camera: { ...prev.camera, ...camera },
    }));
  }, []);

  /**
   * Update recording settings
   */
  const updateRecording = useCallback((recording: Partial<RecordingSettings>) => {
    setSettings(prev => ({
      ...prev,
      recording: { ...prev.recording, ...recording },
    }));
  }, []);

  /**
   * Update debug settings
   */
  const updateDebug = useCallback((debug: Partial<DebugSettings>) => {
    setSettings(prev => ({
      ...prev,
      debug: { ...prev.debug, ...debug },
    }));
  }, []);

  /**
   * Reset to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  /**
   * Export settings as JSON
   */
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  /**
   * Import settings from JSON
   */
  const importSettings = useCallback((json: string): boolean => {
    try {
      const imported = JSON.parse(json);
      setSettings({ ...DEFAULT_SETTINGS, ...imported });
      return true;
    } catch {
      return false;
    }
  }, []);

  const value: SettingsContextValue = {
    settings,
    updateSettings,
    updateQuality,
    updateCamera,
    updateRecording,
    updateDebug,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings
 */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

/**
 * Hook for quality settings only
 */
export function useQualitySettings(): [QualitySettings, (quality: Partial<QualitySettings>) => void] {
  const { settings, updateQuality } = useSettings();
  return [settings.quality, updateQuality];
}

/**
 * Hook for camera settings only
 */
export function useCameraSettings(): [CameraSettings, (camera: Partial<CameraSettings>) => void] {
  const { settings, updateCamera } = useSettings();
  return [settings.camera, updateCamera];
}

/**
 * Hook for recording settings only
 */
export function useRecordingSettings(): [RecordingSettings, (recording: Partial<RecordingSettings>) => void] {
  const { settings, updateRecording } = useSettings();
  return [settings.recording, updateRecording];
}

/**
 * Hook for debug settings only
 */
export function useDebugSettings(): [DebugSettings, (debug: Partial<DebugSettings>) => void] {
  const { settings, updateDebug } = useSettings();
  return [settings.debug, updateDebug];
}
