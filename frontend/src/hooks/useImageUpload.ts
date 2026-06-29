import { useState, useCallback } from 'react';
import { UploadState, SUPPORTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/types';

interface UseImageUploadReturn {
  state: UploadState;
  handleFileSelect: (file: File) => void;
  handleFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearUpload: () => void;
  validateFile: (file: File) => string | null;
}

export function useImageUpload(): UseImageUploadReturn {
  const [state, setState] = useState<UploadState>({
    file: null,
    preview: null,
    isUploading: false,
    error: null,
    isValid: false,
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type as never)) {
      return 'Invalid file type. Please upload PNG, JPEG, or JPG images.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`;
    }

    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);

      if (validationError) {
        setState((prev) => ({
          ...prev,
          error: validationError,
          isValid: false,
        }));
        return;
      }

      const preview = URL.createObjectURL(file);

      setState({
        file,
        preview,
        isUploading: false,
        error: null,
        isValid: true,
      });
    },
    [validateFile]
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        handleFileSelect(file);
      }

      event.target.value = '';
    },
    [handleFileSelect]
  );

  const clearUpload = useCallback(() => {
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
    }

    setState({
      file: null,
      preview: null,
      isUploading: false,
      error: null,
      isValid: false,
    });
  }, [state.preview]);

  return {
    state,
    handleFileSelect,
    handleFileInput,
    clearUpload,
    validateFile,
  };
}
