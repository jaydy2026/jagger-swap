'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useSession } from './session-context';
import { PortraitIdentity } from './types';
import { SUPPORTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/types';

/**
 * Validation result for image upload
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
}

/**
 * ImageUploadOptions
 */
interface UsePortraitUploadOptions {
  onUploadStart?: () => void;
  onUploadSuccess?: (portrait: PortraitIdentity) => void;
  onUploadError?: (error: string) => void;
}

/**
 * Hook for managing portrait upload
 */
export function usePortraitUpload(options: UsePortraitUploadOptions = {}) {
  const { setPortrait } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate image file
   */
  const validateImage = useCallback((file: File): ValidationResult => {
    // Check file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
      return {
        valid: false,
        error: `Invalid file type. Supported: ${SUPPORTED_IMAGE_TYPES.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    return { valid: true };
  }, []);

  /**
   * Get image dimensions
   */
  const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }, []);

  /**
   * Create portrait identity from file
   */
  const createPortraitIdentity = useCallback(async (file: File): Promise<PortraitIdentity> => {
    // Get dimensions
    const dimensions = await getImageDimensions(file);

    // Read file as data URL
    const imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    // Extract format from mime type
    const format = file.type.split('/')[1] as 'png' | 'jpeg' | 'jpg';

    return {
      id: `portrait_${Date.now()}`,
      imageData,
      originalDimensions: dimensions,
      aspectRatio: dimensions.width / dimensions.height,
      metadata: {
        uploadedAt: Date.now(),
        filename: file.name,
        format,
        fileSize: file.size,
      },
    };
  }, [getImageDimensions]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);
    options.onUploadStart?.();

    try {
      // Validate
      const validation = validateImage(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create portrait identity
      const portrait = await createPortraitIdentity(file);

      // Set in session
      setPortrait(portrait);
      options.onUploadSuccess?.(portrait);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      options.onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [validateImage, createPortraitIdentity, setPortrait, options]);

  /**
   * Clear current portrait
   */
  const clearPortrait = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    error,
    handleFileSelect,
    clearPortrait,
  };
}

/**
 * IdentityProvider Component
 * 
 * Provides portrait identity to child components.
 * Wraps the portrait image and exposes it via context.
 */
export interface IdentityProviderProps {
  children: ReactNode;
  portrait: PortraitIdentity | null;
  onPortraitLoad?: (dimensions: { width: number; height: number }) => void;
}

export function IdentityProvider({ children, portrait, onPortraitLoad }: IdentityProviderProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const dims = {
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      };
      setDimensions(dims);
      setIsLoaded(true);
      onPortraitLoad?.(dims);
    }
  }, [onPortraitLoad]);

  // Preload image
  React.useEffect(() => {
    if (portrait?.imageData && imgRef.current) {
      imgRef.current.src = portrait.imageData;
    }
  }, [portrait?.imageData]);

  return (
    <div className="identity-provider">
      {/* Hidden image for preloading */}
      <img
        ref={imgRef}
        alt=""
        className="hidden"
        onLoad={handleImageLoad}
      />

      {/* Render children with identity context */}
      {children({
        portrait,
        dimensions: dimensions || portrait?.originalDimensions || null,
        isLoaded,
      })}
    </div>
  );
}

/**
 * Identity Context Type
 */
export interface IdentityContextType {
  portrait: PortraitIdentity | null;
  dimensions: { width: number; height: number } | null;
  isLoaded: boolean;
  imageData: string | null;
}

/**
 * Identity Renderer Props
 */
export interface IdentityRendererProps {
  portrait: PortraitIdentity | null;
  dimensions: { width: number; height: number } | null;
  isLoaded: boolean;
  children: (context: IdentityContextType) => ReactNode;
}

export function IdentityRenderer({ portrait, dimensions, isLoaded, children }: IdentityRendererProps) {
  const context: IdentityContextType = {
    portrait,
    dimensions,
    isLoaded,
    imageData: portrait?.imageData || null,
  };

  return <>{children(context)}</>;
}
