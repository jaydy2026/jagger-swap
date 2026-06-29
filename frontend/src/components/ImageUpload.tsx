/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { UploadState, SUPPORTED_IMAGE_TYPES } from '@/types';

interface ImageUploadProps {
  state: UploadState;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onReplace: () => void;
}

export function ImageUpload({
  state,
  onFileSelect,
  onClear,
  onReplace: _onReplace,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  if (state.preview) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-full overflow-hidden rounded-lg">
          <img
            src={state.preview}
            alt="Preview of uploaded image"
            className="h-32 w-full object-contain"
          />
          {state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openFilePicker}>
            <Upload className="mr-2 h-4 w-4" />
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED_IMAGE_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex w-full flex-col items-center justify-center"
    >
      <div
        onClick={openFilePicker}
        className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-primary/50 hover:bg-muted/50"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>

        <p className="mb-2 text-sm font-medium">
          Drop your image here or click to upload
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          PNG, JPEG, JPG up to 10MB
        </p>

        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Select File
        </Button>
      </div>

      {state.error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{state.error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_IMAGE_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
