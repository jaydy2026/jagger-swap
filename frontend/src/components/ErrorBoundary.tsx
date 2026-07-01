'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the whole application.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-6">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="mb-2 text-lg font-semibold text-red-500">
            Something went wrong
          </h2>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to use error boundary programmatically
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
      console.error('[ErrorHandler]', err);
    } else {
      console.error('[ErrorHandler] Unknown error:', err);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

/**
 * Error Display Component
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
}: {
  error: Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-4">
      <div className="mb-2 text-2xl">⚠️</div>
      <p className="mb-4 text-center text-sm text-red-500">{message}</p>
      <div className="flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading Spinner Component
 */
export function LoadingSpinner({ 
  size = 'md',
  message,
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  message?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-primary border-t-transparent`}
      />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * Full Screen Loading Component
 */
export function FullScreenLoading({ 
  message = 'Loading...',
}: { 
  message?: string;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <LoadingSpinner size="lg" />
      <p className="text-lg font-medium text-muted-foreground">{message}</p>
    </div>
  );
}

export default ErrorBoundary;
