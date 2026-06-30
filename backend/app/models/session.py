"""
Session Models
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid


class SessionStatus(str, Enum):
    """Session status enumeration."""
    CREATED = "created"
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    ERROR = "error"


class Session(BaseModel):
    """Session model representing an active user session."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    status: SessionStatus = SessionStatus.CREATED
    
    # User info
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    # Session metrics
    frame_count: int = 0
    upload_count: int = 0
    recording_count: int = 0
    
    # Performance metrics
    total_processing_time: float = 0.0
    average_fps: float = 0.0
    error_count: int = 0
    
    # Metadata
    metadata: dict = Field(default_factory=dict)
    
    class Config:
        use_enum_values = True


class SessionCreate(BaseModel):
    """Request model for creating a new session."""
    metadata: Optional[dict] = None


class SessionResponse(BaseModel):
    """Response model for session information."""
    id: str
    created_at: datetime
    status: str
    age_seconds: int
    
    @classmethod
    def from_session(cls, session: Session) -> "SessionResponse":
        """Create response from session model."""
        age = (datetime.utcnow() - session.created_at).total_seconds()
        return cls(
            id=session.id,
            created_at=session.created_at,
            status=session.status,
            age_seconds=int(age)
        )


class SessionList(BaseModel):
    """Response model for listing sessions."""
    sessions: List[SessionResponse]
    total: int
    active: int


class SessionMetrics(BaseModel):
    """Performance metrics for a session."""
    session_id: str
    frame_count: int
    upload_count: int
    recording_count: int
    average_fps: float
    total_processing_time: float
    error_count: int
    last_activity: datetime
