"""
Recording Models
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid


class RecordingFormat(str, Enum):
    """Supported recording formats."""
    WEBM = "webm"
    MP4 = "mp4"
    GIF = "gif"


class RecordingStatus(str, Enum):
    """Recording status."""
    PENDING = "pending"
    RECORDING = "recording"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Recording(BaseModel):
    """Recording model."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: RecordingStatus = RecordingStatus.PENDING
    
    # Recording info
    format: RecordingFormat = RecordingFormat.WEBM
    duration_seconds: float = 0.0
    file_size_bytes: int = 0
    
    # File paths (relative to storage directory)
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    
    # Metadata
    resolution_width: int = 1920
    resolution_height: int = 1080
    fps: float = 30.0
    bitrate: int = 2500000
    
    class Config:
        use_enum_values = True


class RecordingCreate(BaseModel):
    """Request to create a new recording."""
    session_id: str
    format: RecordingFormat = RecordingFormat.WEBM
    resolution_width: int = 1920
    resolution_height: int = 1080
    fps: float = 30.0
    bitrate: int = 2500000


class RecordingResponse(BaseModel):
    """Recording response."""
    id: str
    session_id: str
    status: str
    format: str
    duration_seconds: float
    file_size_bytes: int
    created_at: datetime
    download_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class RecordingList(BaseModel):
    """List of recordings."""
    recordings: List[RecordingResponse]
    total: int


class Snapshot(BaseModel):
    """Snapshot model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    file_path: Optional[str] = None
    format: str = "png"


class SnapshotResponse(BaseModel):
    """Snapshot response."""
    id: str
    session_id: str
    created_at: datetime
    download_url: Optional[str] = None
