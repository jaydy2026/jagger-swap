from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AnimationStatus(str, Enum):
    """Animation processing status."""

    IDLE = "idle"
    INITIALIZING = "initializing"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class AnimationStartRequest(BaseModel):
    """Request schema for starting animation."""

    fileId: str
    model: Optional[str] = "default"


class AnimationStartResponse(BaseModel):
    """Response schema for animation start."""

    success: bool
    message: str
    sessionId: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AnimationStatusResponse(BaseModel):
    """Response schema for animation status."""

    status: AnimationStatus
    message: str
    progress: Optional[float] = None
    fps: Optional[float] = None
    latency: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AnimationStopResponse(BaseModel):
    """Response schema for stopping animation."""

    success: bool
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AnimationSettings(BaseModel):
    """Animation configuration settings."""

    smoothing: float = 0.5
    fidelity: float = 0.7
    style: str = "natural"
    preserve_background: bool = True
