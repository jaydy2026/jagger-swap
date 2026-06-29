'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, Monitor, MemoryStick, Zap, Eye, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface DiagnosticsProps {
  motionFps: number;
  motionLatency: number;
  animationFps: number;
  animationLatency: number;
  trackingConfidence: number;
  renderingConfidence: number;
  droppedFrames: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Performance metrics from the browser
 */
interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  fps: number;
}

export function Diagnostics({
  motionFps,
  motionLatency,
  animationFps,
  animationLatency,
  trackingConfidence,
  renderingConfidence,
  droppedFrames,
  isOpen,
  onClose,
}: DiagnosticsProps) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    memoryTotal: 0,
    memoryUsed: 0,
    fps: 0,
  });
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());

  // Update metrics periodically
  useEffect(() => {
    if (!isOpen) return;

    const updateMetrics = () => {
      const now = performance.now();
      const frameTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Track frame times
      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = 1000 / avgFrameTime;

      // Get memory info if available
      let memoryUsed = 0;
      let memoryTotal = 0;
      let memoryUsage = 0;

      if (performance.memory) {
        memoryUsed = performance.memory.usedJSHeapSize;
        memoryTotal = performance.jsHeapSizeLimit;
        memoryUsage = memoryUsed / memoryTotal;
      }

      setMetrics(prev => ({
        ...prev,
        fps,
        memoryUsage,
        memoryTotal,
        memoryUsed,
      }));
    };

    const interval = setInterval(updateMetrics, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getQualityColor = (value: number): string => {
    if (value >= 0.8) return 'text-green-500';
    if (value >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFpsColor = (fps: number): string => {
    if (fps >= 28) return 'text-green-500';
    if (fps >= 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-sm">
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Diagnostics
          </CardTitle>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FPS Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Frame Rate
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricDisplay
                label="Motion"
                value={motionFps.toFixed(1)}
                unit="FPS"
                color={getFpsColor(motionFps)}
              />
              <MetricDisplay
                label="Animation"
                value={animationFps.toFixed(1)}
                unit="FPS"
                color={getFpsColor(animationFps)}
              />
            </div>
            <MetricDisplay
              label="Rendering"
              value={metrics.fps.toFixed(1)}
              unit="FPS"
              color={getFpsColor(metrics.fps)}
            />
          </div>

          {/* Latency Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Latency
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricDisplay
                label="Motion"
                value={motionLatency.toFixed(1)}
                unit="ms"
                color={motionLatency < 50 ? 'text-green-500' : motionLatency < 100 ? 'text-yellow-500' : 'text-red-500'}
              />
              <MetricDisplay
                label="Animation"
                value={animationLatency.toFixed(1)}
                unit="ms"
                color={animationLatency < 50 ? 'text-green-500' : animationLatency < 100 ? 'text-yellow-500' : 'text-red-500'}
              />
            </div>
          </div>

          {/* Confidence Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Confidence
            </div>
            <div className="space-y-1">
              <ConfidenceBar label="Tracking" value={trackingConfidence} />
              <ConfidenceBar label="Rendering" value={renderingConfidence} />
            </div>
          </div>

          {/* System Resources */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              System
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-mono">
                  {formatBytes(metrics.memoryUsed)} / {formatBytes(metrics.memoryTotal)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${metrics.memoryUsage * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dropped Frames</span>
                <span className={`font-mono ${droppedFrames > 10 ? 'text-red-500' : droppedFrames > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {droppedFrames}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Metric display component
 */
function MetricDisplay({
  label,
  value,
  unit,
  color = 'text-foreground',
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline justify-between rounded bg-muted/50 px-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${color}`}>
        {value}
        <span className="ml-1 text-xs font-normal">{unit}</span>
      </span>
    </div>
  );
}

/**
 * Confidence bar component
 */
function ConfidenceBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  const color = value >= 0.8 ? 'bg-green-500' : value >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default Diagnostics;
