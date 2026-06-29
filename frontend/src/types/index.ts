export interface AppState {
  isStarted: boolean;
  isCameraActive: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  deviceId: string | null;
}

export interface UploadState {
  file: File | null;
  preview: string | null;
  isUploading: boolean;
  error: string | null;
  isValid: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  latency: number;
  lastUpdated: Date;
}

export interface AppSettings {
  cameraDeviceId: string | null;
  resolution: 'low' | 'medium' | 'high';
  showPerformanceMetrics: boolean;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  url: string;
  message?: string;
}

export interface StatusResponse {
  status: 'idle' | 'processing' | 'ready' | 'error';
  message: string;
  version: string;
  timestamp: string;
}

export type SupportedImageFormat = 'image/png' | 'image/jpeg' | 'image/jpg';

export const SUPPORTED_IMAGE_TYPES: SupportedImageFormat[] = [
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
