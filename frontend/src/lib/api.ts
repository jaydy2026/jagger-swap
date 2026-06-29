import { UploadResponse, StatusResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Upload failed with status: ${response.status}`
      );
    }

    return response.json();
  }

  async getStatus(): Promise<StatusResponse> {
    return this.request<StatusResponse>('/status');
  }

  async startCamera(deviceId?: string): Promise<{ success: boolean; message: string }> {
    return this.request('/camera/start', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
  }

  async stopCamera(): Promise<{ success: boolean; message: string }> {
    return this.request('/camera/stop', {
      method: 'POST',
    });
  }

  async getAnimationStatus(): Promise<{ status: string; progress?: number }> {
    return this.request('/animation/status');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
