/**
 * API Client
 * 
 * Centralized API client for backend communication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
};

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = `${baseUrl}${API_PREFIX}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', headers = {}, body } = options;

    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(response.status, error.detail || 'Request failed');
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text) as T;
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Session API
export const sessionApi = {
  create: (metadata?: Record<string, unknown>) =>
    api.post<SessionResponse>('/session/', { metadata }),

  get: (sessionId: string) =>
    api.get<SessionResponse>(`/session/${sessionId}`),

  delete: (sessionId: string) =>
    api.delete(`/session/${sessionId}`),

  list: () =>
    api.get<SessionList>('/session/'),

  heartbeat: (sessionId: string) =>
    api.post(`/session/${sessionId}/heartbeat`),

  recordFrame: (sessionId: string, processingTimeMs: number) =>
    api.post(`/session/${sessionId}/record/frame?processing_time_ms=${processingTimeMs}`),

  recordUpload: (sessionId: string) =>
    api.post(`/session/${sessionId}/record/upload`),

  recordRecording: (sessionId: string) =>
    api.post(`/session/${sessionId}/record/recording`),

  recordError: (sessionId: string) =>
    api.post(`/session/${sessionId}/error`),

  setInactive: (sessionId: string) =>
    api.post(`/session/${sessionId}/inactive`),
};

// Recording API
export const recordingApi = {
  create: (sessionId: string, options?: Partial<RecordingOptions>) =>
    api.post<RecordingResponse>('/recording/', {
      session_id: sessionId,
      ...options,
    }),

  list: (sessionId: string) =>
    api.get<RecordingList>(`/recording/?session_id=${sessionId}`),

  get: (recordingId: string) =>
    api.get<RecordingResponse>(`/recording/${recordingId}`),

  delete: (recordingId: string) =>
    api.delete(`/recording/${recordingId}`),

  upload: async (recordingId: string, file: Blob) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}${API_PREFIX}/recording/${recordingId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to upload recording');
    }

    return response.json();
  },

  downloadUrl: (recordingId: string) =>
    `${API_BASE_URL}${API_PREFIX}/recording/${recordingId}/download`,

  getStats: () =>
    api.get<RecordingStats>('/recording/stats'),
};

// Admin API
export const adminApi = {
  health: () =>
    api.get<HealthResponse>('/admin/health'),

  metrics: () =>
    api.get<SystemMetrics>('/admin/metrics'),

  users: () =>
    api.get<ActiveUsers>('/admin/users'),

  performance: () =>
    api.get<PerformanceStats>('/admin/performance'),

  errors: () =>
    api.get<ErrorList>('/admin/errors'),

  cleanup: () =>
    api.post<CleanupResult>('/admin/sessions/cleanup'),
};

// Virtual Camera API
export const vcamApi = {
  getInfo: () =>
    api.get<VcamInfo>('/vcam/info'),

  start: () =>
    api.post('/vcam/start'),

  stop: () =>
    api.post('/vcam/stop'),

  pushFrame: async (sessionId: string, imageData: Blob) => {
    const formData = new FormData();
    formData.append('image', imageData);

    const response = await fetch(
      `${API_BASE_URL}${API_PREFIX}/vcam/frame?session_id=${sessionId}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to push frame');
    }

    return response.json();
  },

  streamUrl: () =>
    `${API_BASE_URL}${API_PREFIX}/vcam/stream`,
};

// Types
export interface SessionResponse {
  id: string;
  created_at: string;
  status: string;
  age_seconds: number;
}

export interface SessionList {
  sessions: SessionResponse[];
  total: number;
  active: number;
}

export interface RecordingOptions {
  format: 'webm' | 'mp4';
  resolution_width: number;
  resolution_height: number;
  fps: number;
  bitrate: number;
}

export interface RecordingResponse {
  id: string;
  session_id: string;
  status: string;
  format: string;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: string;
}

export interface RecordingList {
  recordings: RecordingResponse[];
  total: number;
}

export interface RecordingStats {
  recordings_count: number;
  snapshots_count: number;
  total_storage_bytes: number;
  storage_path: string;
}

export interface HealthResponse {
  healthy: boolean;
  timestamp: string;
  services: Record<string, boolean>;
}

export interface SystemMetrics {
  timestamp: string;
  sessions: {
    total: number;
    active: number;
    total_frames_processed: number;
    total_errors: number;
    average_fps: number;
  };
  system: {
    cpu_percent: number;
    memory: {
      total_bytes: number;
      available_bytes: number;
      used_bytes: number;
      percent: number;
    };
    disk: {
      total_bytes: number;
      used_bytes: number;
      free_bytes: number;
      percent: number;
    };
    platform: Record<string, string>;
  };
  recordings: {
    total: number;
    snapshots: number;
    storage_used_bytes: number;
  };
}

export interface ActiveUsers {
  count: number;
  users: Array<{
    session_id: string;
    created_at: string;
    last_activity: string;
    user_agent?: string;
    ip_address?: string;
    frame_count: number;
    upload_count: number;
    average_fps: number;
    error_count: number;
    status: string;
  }>;
}

export interface PerformanceStats {
  average_fps: number;
  average_latency_ms: number;
  total_frames: number;
  error_rate_percent: number;
  active_sessions: number;
}

export interface ErrorList {
  total_sessions_with_errors: number;
  total_errors: number;
  errors: Array<{
    session_id: string;
    error_count: number;
    status: string;
    created_at: string;
    last_activity: string;
  }>;
}

export interface CleanupResult {
  cleaned_sessions: number;
  remaining_sessions: number;
}

export interface VcamInfo {
  width: number;
  height: number;
  fps: number;
  format: string;
  is_streaming: boolean;
  handlers: string[];
}

// Export singleton
export const api = new ApiClient();
