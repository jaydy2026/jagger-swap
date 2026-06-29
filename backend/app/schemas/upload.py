from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UploadResponse(BaseModel):
    """Response schema for file upload."""

    success: bool
    fileId: str
    filename: str
    url: str
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UploadError(BaseModel):
    """Error response for upload failures."""

    success: bool = False
    error: str
    detail: Optional[str] = None


class FileInfo(BaseModel):
    """Information about an uploaded file."""

    fileId: str
    filename: str
    size: int
    content_type: str
    path: str
    created_at: datetime
