'use client';

import React, { useState } from 'react';
import { Settings, X, Monitor, Camera, Activity, Bug, Download, Upload } from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'quality' | 'camera' | 'performance' | 'debug';

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateQuality, updateCamera, updateDebug, resetSettings, exportSettings, importSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('quality');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 'quality' as const, label: 'Quality', icon: Activity },
    { id: 'camera' as const, label: 'Camera', icon: Camera },
    { id: 'performance' as const, label: 'Performance', icon: Monitor },
    { id: 'debug' as const, label: 'Debug', icon: Bug },
  ];

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jagger-swap-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (importSettings(importText)) {
      setShowImport(false);
      setImportText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex">
          {/* Sidebar */}
          <div className="w-48 border-r p-4">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Import/Export */}
            <div className="mt-6 space-y-2 border-t pt-4">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                onClick={() => setShowImport(!showImport)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>

            {/* Reset */}
            <div className="mt-6 border-t pt-4">
              <Button
                onClick={resetSettings}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'quality' && (
              <QualitySettings settings={settings} updateSettings={updateQuality} />
            )}
            {activeTab === 'camera' && (
              <CameraSettings settings={settings} updateSettings={updateCamera} />
            )}
            {activeTab === 'performance' && (
              <PerformanceSettings settings={settings} updateSettings={updateQuality} />
            )}
            {activeTab === 'debug' && (
              <DebugSettings settings={settings} updateSettings={updateDebug} />
            )}
          </div>
        </div>

        {/* Import Modal */}
        {showImport && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg border bg-background p-6">
              <h3 className="mb-4 text-lg font-semibold">Import Settings</h3>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste settings JSON here..."
                className="mb-4 h-40 w-full rounded-lg border border-input bg-background p-2 font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowImport(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleImport}>Import</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quality Settings Tab
 */
function QualitySettings({
  settings,
  updateSettings,
}: {
  settings: any;
  updateSettings: (settings: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Animation Quality</h3>
        <div className="space-y-4">
          <SettingRow label="Quality Mode">
            <select
              value={settings.quality.qualityMode}
              onChange={(e) => updateSettings({ qualityMode: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="performance">Performance (Lower quality, better FPS)</option>
              <option value="balanced">Balanced (Recommended)</option>
              <option value="quality">Quality (Higher quality, may reduce FPS)</option>
            </select>
          </SettingRow>

          <SettingRow label="Target FPS">
            <select
              value={settings.quality.targetFps}
              onChange={(e) => updateSettings({ targetFps: parseInt(e.target.value) })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value={15}>15 FPS (Battery saver)</option>
              <option value={24}>24 FPS (Cinematic)</option>
              <option value={30}>30 FPS (Standard)</option>
              <option value={60}>60 FPS (Smooth)</option>
            </select>
          </SettingRow>

          <SettingRow label="Smoothing Level">
            <select
              value={settings.quality.smoothingLevel}
              onChange={(e) => updateSettings({ smoothingLevel: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="low">Low (Less smoothing, more responsive)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (More smoothing, smoother motion)</option>
            </select>
          </SettingRow>

          <SettingRow label="Resolution">
            <select
              value={settings.quality.resolution}
              onChange={(e) => updateSettings({ resolution: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="low">Low (640×480)</option>
              <option value="medium">Medium (1280×720)</option>
              <option value="high">High (1920×1080)</option>
            </select>
          </SettingRow>

          <SettingRow label="Frame Interpolation">
            <Toggle
              checked={settings.quality.enableInterpolation}
              onChange={(checked) => updateSettings({ enableInterpolation: checked })}
            />
          </SettingRow>

          <SettingRow label="Motion Prediction">
            <Toggle
              checked={settings.quality.enableMotionPrediction}
              onChange={(checked) => updateSettings({ enableMotionPrediction: checked })}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

/**
 * Camera Settings Tab
 */
function CameraSettings({
  settings,
  updateSettings,
}: {
  settings: any;
  updateSettings: (settings: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Camera Settings</h3>
        <div className="space-y-4">
          <SettingRow label="Camera Resolution">
            <select
              value={settings.camera.resolution}
              onChange={(e) => updateSettings({ resolution: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="low">Low (640×480)</option>
              <option value="medium">Medium (1280×720)</option>
              <option value="high">High (1920×1080)</option>
            </select>
          </SettingRow>

          <SettingRow label="Camera Direction">
            <select
              value={settings.camera.facingMode}
              onChange={(e) => updateSettings({ facingMode: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="user">Front Camera (Webcam)</option>
              <option value="environment">Rear Camera</option>
            </select>
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

/**
 * Performance Settings Tab
 */
function PerformanceSettings({
  settings,
  updateSettings,
}: {
  settings: any;
  updateSettings: (settings: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Performance</h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Performance settings are automatically optimized based on your device capabilities.
            Manual overrides may affect stability.
          </p>

          <SettingRow label="Enable Hardware Acceleration">
            <Toggle checked={true} onChange={() => {}} disabled />
          </SettingRow>

          <SettingRow label="Max Concurrent Animations">
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              disabled
            >
              <option value="1">1 (Recommended)</option>
            </select>
          </SettingRow>

          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">System Recommendations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• For best performance, use Chrome or Edge browser</li>
              <li>• Close other tabs and applications for optimal FPS</li>
              <li>• Reduce resolution if experiencing frame drops</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Debug Settings Tab
 */
function DebugSettings({
  settings,
  updateSettings,
}: {
  settings: any;
  updateSettings: (settings: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Debug Options</h3>
        <div className="space-y-4">
          <SettingRow label="Show Debug Overlay">
            <Toggle
              checked={settings.debug.showDebugOverlay}
              onChange={(checked) => updateSettings({ showDebugOverlay: checked })}
            />
          </SettingRow>

          <SettingRow label="Show Face Landmarks">
            <Toggle
              checked={settings.debug.showFaceLandmarks}
              onChange={(checked) => updateSettings({ showFaceLandmarks: checked })}
            />
          </SettingRow>

          <SettingRow label="Show Body Skeleton">
            <Toggle
              checked={settings.debug.showBodySkeleton}
              onChange={(checked) => updateSettings({ showBodySkeleton: checked })}
            />
          </SettingRow>

          <SettingRow label="Show Hand Landmarks">
            <Toggle
              checked={settings.debug.showHandLandmarks}
              onChange={(checked) => updateSettings({ showHandLandmarks: checked })}
            />
          </SettingRow>

          <SettingRow label="Show Performance Metrics">
            <Toggle
              checked={settings.debug.showPerformanceMetrics}
              onChange={(checked) => updateSettings({ showPerformanceMetrics: checked })}
            />
          </SettingRow>

          <SettingRow label="Log Tracking Data">
            <Toggle
              checked={settings.debug.logTrackingData}
              onChange={(checked) => updateSettings({ logTrackingData: checked })}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

/**
 * Setting Row Component
 */
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium">{label}</label>
      <div className="w-48">{children}</div>
    </div>
  );
}

/**
 * Toggle Component
 */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default SettingsPanel;
