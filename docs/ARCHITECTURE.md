# JAGGER SWAP - Architecture Update

## Overview

This document defines the updated architecture for JAGGER SWAP, focusing on the **motion-to-identity** transfer paradigm.

---

## Core Paradigm

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   LIVE WEBCAM   │     │   UPLOADED      │
│   (Motion       │ ──► │   PORTRAIT      │
│    Source)      │     │   (Identity     │
│                 │     │    Source)      │
│   LEFT PANEL    │     │   RIGHT PANEL   │
└─────────────────┘     └─────────────────┘
```

- **LEFT Panel**: User's live webcam (motion source only)
- **RIGHT Panel**: Uploaded portrait (identity source, always displayed with animation applied)

---

## Architecture Principles

### 1. Motion Source Separation
The webcam is **ONLY** used for motion capture. It is never displayed as the animated result.

### 2. Identity Preservation
The uploaded image's identity (face, hair, clothing, accessories, skin tone, body proportions) must remain locked throughout the session.

### 3. Unidirectional Data Flow
```
Webcam → MotionEngine → MotionFrame → AnimationEngine → AnimatedPortrait
```

### 4. Modular Animation Layer
The animation engine must be swappable. The motion capture system exposes a clean API that any animation implementation can subscribe to.

---

## Updated Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌──────────────────┐                      │
│  │              │     │                  │                      │
│  │   WEBCAM     │────►│  MOTION ENGINE   │                      │
│  │   (Video)    │     │                  │                      │
│  │              │     │  ┌────────────┐  │                      │
│  └──────────────┘     │  │ Face Mesh  │  │                      │
│                       │  │ Pose       │  │                      │
│                       │  │ Hands      │  │                      │
│                       │  └────────────┘  │                      │
│                       │         │         │                      │
│                       │         ▼         │                      │
│                       │  ┌────────────┐  │                      │
│                       │  │MotionFrame │  │  ┌─────────────────┐ │
│                       │  │ {faces,    │──┼─►│ ANIMATION       │ │
│                       │  │  bodies,   │  │  │ ENGINE          │ │
│                       │  │  hands}    │  │  │                 │ │
│                       │  └────────────┘  │  │ - Apply motion  │ │
│                       └──────────────────┘  │ - Blend shapes   │ │
│                                             │ - Render frame  │ │
│                                             └────────┬────────┘ │
│                                                      │          │
│  ┌──────────────────────────────────────────────────┤          │
│  │                    SESSION STATE                   │          │
│  │  ┌─────────────┐    ┌─────────────────┐           │          │
│  │  │ Uploaded   │───►│ IdentityContext │───────────┘          │
│  │  │ Portrait   │    │ (Preserved)     │                      │
│  │  │ (Image)    │    └─────────────────┘                      │
│  │  └─────────────┘                                           │
│  └─────────────────────────────────────────────────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### 1. WebcamPanel (LEFT PANEL)
- **Purpose**: Display live webcam feed
- **Motion Capture**: Captures motion from webcam
- **Display**: Shows raw webcam video (no animation)
- **Output**: Passes video stream to MotionEngine

### 2. AnimatedPortraitPanel (RIGHT PANEL)
- **Purpose**: Display animated portrait
- **Identity**: Shows uploaded image with animation applied
- **Input**: 
  - Uploaded portrait image (identity source)
  - MotionFrame data (from MotionEngine)
- **Output**: Renders animated portrait in real-time

### 3. MotionEngine
- **Purpose**: Real-time motion capture
- **Input**: Video stream from WebcamPanel
- **Output**: MotionFrame stream (subscribable)
- **Location**: `/lib/motion/motion-engine.ts`

### 4. AnimationEngine (Future - Milestone 2B)
- **Purpose**: Apply motion to uploaded identity
- **Input**: 
  - MotionFrame stream
  - Uploaded portrait image
- **Output**: Animated frame render
- **Location**: `/lib/animation/` (to be created)

---

## Data Structures

### Identity/Portrait Reference
```typescript
interface PortraitIdentity {
  id: string;
  imageData: string;          // Base64 or blob URL
  originalDimensions: {
    width: number;
    height: number;
  };
  detectedFeatures?: {
    faceRegion?: BoundingBox;
    bodyRegion?: BoundingBox;
  };
  metadata: {
    uploadedAt: number;
    filename: string;
    format: 'png' | 'jpeg' | 'jpg';
  };
}
```

### Animation Parameters (Motion → Visual)
```typescript
interface AnimationParameters {
  // Head
  headRotation: Point3D;      // pitch, yaw, roll
  headPosition: Point2D;      // x, y offset
  
  // Face
  blendShapes: Record<string, number>;  // ARKit-style blend shapes
  
  // Body
  bodyPose: BodyPoseData;
  
  // Hands
  leftHand: HandTrackingData;
  rightHand: HandTrackingData;
  
  // Timing
  timestamp: number;
  confidence: number;
}
```

### Session State
```typescript
interface SessionState {
  // Identity
  portrait: PortraitIdentity | null;
  
  // Motion
  currentFrame: MotionFrame | null;
  animationParameters: AnimationParameters | null;
  
  // Status
  isTracking: boolean;
  isAnimating: boolean;
  fps: number;
  latency: number;
}
```

---

## Implementation Plan

### Milestone 2A: Motion Capture Engine (COMPLETED ✅)
- [x] MotionEngine with clean API
- [x] Face tracking (landmarks, head pose, expressions)
- [x] Body pose tracking (upper/lower body)
- [x] Hand tracking (landmarks, gestures)
- [x] Smoothing algorithms
- [x] Debug overlay

### Milestone 2B: Animation Engine (NEXT)
- [ ] Create `/lib/animation/` module
- [ ] Define AnimationEngine interface
- [ ] Implement identity-aware rendering
- [ ] Blend shape application
- [ ] Real-time frame rendering
- [ ] Flicker reduction

### Milestone 2C: Integration & Polish
- [ ] Connect AnimationEngine to AnimatedPortraitPanel
- [ ] Optimize performance
- [ ] Add identity detection/alignment
- [ ] Test with various portrait types

---

## File Structure

```
frontend/src/
├── lib/
│   ├── motion/                    # Motion Capture Engine
│   │   ├── types.ts              # Motion data types
│   │   ├── motion-engine.ts      # Main engine
│   │   ├── mediapipe-tracker.ts  # MediaPipe wrapper
│   │   ├── smoothing.ts          # Smoothing utilities
│   │   └── index.ts
│   │
│   ├── animation/                 # Animation Engine (TO BE CREATED)
│   │   ├── types.ts              # Animation types
│   │   ├── animation-engine.ts   # Main engine interface
│   │   ├── portrait-renderer.ts  # Portrait rendering
│   │   ├── blend-shapes.ts       # Blend shape application
│   │   └── index.ts
│   │
│   └── session/                   # Session Management (TO BE CREATED)
│       ├── session-context.tsx   # React context
│       ├── identity-provider.tsx # Portrait identity provider
│       └── index.ts
│
├── components/
│   ├── WebcamPanel.tsx            # LEFT PANEL (motion source)
│   ├── AnimatedPortraitPanel.tsx  # RIGHT PANEL (identity display)
│   ├── SessionView.tsx           # Main session view
│   └── ...
│
└── hooks/
    ├── useMotionEngine.ts         # Motion capture hook
    └── useAnimation.ts            # Animation hook (TO CREATE)
```

---

## Key Interfaces

### AnimationEngine Interface
```typescript
interface AnimationEngine {
  // Initialize with portrait
  initialize(portrait: PortraitIdentity): Promise<void>;
  
  // Apply motion frame
  applyMotion(frame: MotionFrame): AnimationParameters;
  
  // Render current frame
  render(): string | HTMLCanvasElement | Blob;
  
  // Cleanup
  dispose(): void;
}
```

### AnimationSubscriber Interface
```typescript
interface AnimationSubscriber {
  id: string;
  onFrame: (renderedFrame: string | Blob) => void;
  onError: (error: Error) => void;
}
```

---

## Milestone 2A Summary

The motion capture engine (Milestone 2A) is complete and provides:

1. **Clean API** - Animation modules subscribe to `MotionFrame` without knowing about MediaPipe
2. **Complete Tracking** - Face, body, hands with all required features
3. **Performance Optimized** - 25-30 FPS target with smoothing
4. **Debug Ready** - Built-in debug overlay for visualization

**Next Step**: Milestone 2B will create the Animation Engine that:
- Subscribes to MotionFrame stream
- Applies motion to uploaded portrait
- Preserves identity (face, hair, clothing)
- Renders animated result in real-time

---

## Backward Compatibility

This architecture update:
- ✅ Does NOT modify existing completed work
- ✅ Preserves Milestone 1 structure
- ✅ Extends Milestone 2A (motion engine is complete)
- ✅ Provides clear path for Milestone 2B (animation engine)
