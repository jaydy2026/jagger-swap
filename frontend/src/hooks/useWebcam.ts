import { useState, useRef, useCallback, useEffect } from 'react';
import { CameraState } from '@/types';

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  state: CameraState;
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => void;
  getDevices: () => Promise<MediaDeviceInfo[]>;
  error: string | null;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [state, setState] = useState<CameraState>({
    stream: null,
    isActive: false,
    error: null,
    deviceId: null,
  });
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState({
      stream: null,
      isActive: false,
      error: null,
      deviceId: null,
    });
  }, [state.stream]);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setError(null);
        setState((prev) => ({ ...prev, error: null }));

        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setState({
          stream,
          isActive: true,
          error: null,
          deviceId: deviceId || null,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to access camera. Please check permissions.';

        setError(errorMessage);
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isActive: false,
        }));
      }
    },
    []
  );

  const getDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [state.stream]);

  return {
    videoRef,
    state,
    startCamera,
    stopCamera,
    getDevices,
    error,
  };
}
