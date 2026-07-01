import { useState, useRef, useCallback, useEffect } from 'react';
import { CameraState } from '@/types';

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  state: CameraState;
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => void;
  getDevices: () => Promise<MediaDeviceInfo[]>;
  error: string | null;
  reconnectAttempts: number;
  isReconnecting: boolean;
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Track for cleanup
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    setIsReconnecting(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
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
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setError(null);
        setState((prev) => ({ ...prev, error: null }));
        setIsReconnecting(true);

        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              },
          audio: false, // Audio not needed for motion capture
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((e) => {
            console.warn('Video play failed:', e);
          });
        }

        setState({
          stream,
          isActive: true,
          error: null,
          deviceId: deviceId || null,
        });
        
        setIsReconnecting(false);
        setReconnectAttempts(0);
      } catch (err) {
        setIsReconnecting(false);
        
        let errorMessage: string;
        
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'No camera found. Please connect a camera and try again.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
          } else if (err.name === 'OverconstrainedError') {
            errorMessage = 'Camera does not support the requested resolution. Trying with lower resolution...';
          } else {
            errorMessage = err.message;
          }
        } else {
          errorMessage = 'Failed to access camera. Please check permissions.';
        }

        setError(errorMessage);
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isActive: false,
        }));
        
        setReconnectAttempts((prev) => prev + 1);
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

  // Handle stream disconnection
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const handleTrackEnded = () => {
      console.warn('[useWebcam] Track ended unexpectedly');
      setState((prev) => ({
        ...prev,
        isActive: false,
        error: 'Camera disconnected. Please reconnect.',
      }));
    };

    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', handleTrackEnded);
      track.addEventListener('mute', () => {
        console.warn('[useWebcam] Track muted');
      });
      track.addEventListener('unmute', () => {
        console.log('[useWebcam] Track unmuted');
      });
    });

    return () => {
      stream.getTracks().forEach((track) => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [state.stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    state,
    startCamera,
    stopCamera,
    getDevices,
    error,
    reconnectAttempts,
    isReconnecting,
  };
}
