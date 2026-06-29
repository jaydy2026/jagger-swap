from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CameraStartRequest(BaseModel):
    """Request schema for starting camera."""

    deviceId: Optional[str] = None
    resolution: Optional[str] = "1280x720"
    fps: Optional[int] = 30


class CameraStartResponse(BaseModel):
    """Response schema for camera start."""

    success: bool
    message: str
    deviceId: Optional[str] = None
    resolution: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CameraStopResponse(BaseModel):
    """Response schema for camera stop."""

    success: bool
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CameraDevice(BaseModel):
    """Information about a camera device."""

    deviceId: str
    label: Optional[str] = None
    kind: str = "videoinput"


class CameraDevicesResponse(BaseModel):
    """Response containing list of available camera devices."""

    success: bool
    devices: List[CameraDevice]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
