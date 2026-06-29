'use client';

import React, { useState } from 'react';
import {
  Play,
  Square,
  Upload,
  RefreshCw,
  Maximize,
  Settings,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  Bug,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface ControlPanelProps {
  isCameraActive: boolean;
  hasImage: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onUploadClick: () => void;
  onReplaceImage: () => void;
  onFullscreen: () => void;
  fps: number;
  latency: number;
  onToggleDebug?: () => void;
  showDebug?: boolean;
}

export function ControlPanel({
  isCameraActive,
  hasImage,
  onStartCamera,
  onStopCamera,
  onUploadClick,
  onReplaceImage,
  onFullscreen,
  fps,
  latency,
  onToggleDebug,
  showDebug = false,
}: ControlPanelProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Camera Controls */}
          <div className="flex gap-2">
            {!isCameraActive ? (
              <Button onClick={onStartCamera} className="flex-1" variant="primary">
                <Play className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button
                onClick={onStopCamera}
                className="flex-1"
                variant="destructive"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            )}
          </div>

          {/* Image Upload Controls */}
          <div className="flex gap-2">
            {!hasImage ? (
              <Button
                onClick={onUploadClick}
                variant="secondary"
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            ) : (
              <Button
                onClick={onReplaceImage}
                variant="secondary"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Replace Image
              </Button>
            )}
          </div>

          {/* Fullscreen Button */}
          <Button
            onClick={onFullscreen}
            variant="outline"
            className="w-full"
          >
            <Maximize className="mr-2 h-4 w-4" />
            Fullscreen
          </Button>

          {/* Debug Toggle */}
          <Button
            onClick={onToggleDebug}
            variant={showDebug ? 'default' : 'outline'}
            className="w-full"
          >
            <Bug className="mr-2 h-4 w-4" />
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-4 w-4" />
            Motion Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FPS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>FPS</span>
            </div>
            <span className="font-mono text-lg font-semibold">
              {fps > 0 ? fps.toFixed(1) : '--'}
            </span>
          </div>

          {/* Latency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Latency</span>
            </div>
            <span className="font-mono text-lg font-semibold">
              {latency > 0 ? `${latency.toFixed(0)}ms` : '--'}
            </span>
          </div>

          {/* Tracking Status */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              {isCameraActive ? 'Motion tracking active' : 'Start camera to begin tracking'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-4 w-4" />
              Settings
            </CardTitle>
            {showSettings ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>

        {showSettings && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="low">Low (640x480)</option>
                <option value="medium">Medium (1280x720)</option>
                <option value="high">High (1920x1080)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Camera</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Default Camera</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Smoothing</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Show Performance Metrics
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-input"
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
