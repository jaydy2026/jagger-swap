/**
 * Settings Module
 * 
 * Manages application settings with local storage persistence.
 */

export * from './types';
export {
  SettingsProvider,
  useSettings,
  useQualitySettings,
  useCameraSettings,
  useRecordingSettings,
  useDebugSettings,
} from './settings-context';
