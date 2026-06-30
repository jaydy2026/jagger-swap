"""
Recording Service

Manages recordings and snapshots with local file storage.
"""

import os
import shutil
import logging
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path
from app.models.recording import (
    Recording, RecordingFormat, RecordingStatus, Snapshot
)

logger = logging.getLogger(__name__)


class RecordingService:
    """Service for managing recordings and snapshots."""
    
    def __init__(self, storage_path: str = "./recordings"):
        """
        Initialize the recording service.
        
        Args:
            storage_path: Base path for storing recordings
        """
        self._storage_path = Path(storage_path)
        self._recordings: Dict[str, Recording] = {}
        self._snapshots: Dict[str, Snapshot] = {}
        
        # Create storage directories
        self._recordings_dir = self._storage_path / "videos"
        self._snapshots_dir = self._storage_path / "snapshots"
        self._thumbnails_dir = self._storage_path / "thumbnails"
        
        for directory in [self._recordings_dir, self._snapshots_dir, self._thumbnails_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def create_recording(
        self,
        session_id: str,
        format: RecordingFormat = RecordingFormat.WEBM,
        resolution_width: int = 1920,
        resolution_height: int = 1080,
        fps: float = 30.0,
        bitrate: int = 2500000
    ) -> Recording:
        """
        Create a new recording.
        
        Args:
            session_id: Associated session ID
            format: Video format
            resolution_width: Video width
            resolution_height: Video height
            fps: Frames per second
            bitrate: Video bitrate
            
        Returns:
            New Recording
        """
        recording = Recording(
            session_id=session_id,
            format=format,
            resolution_width=resolution_width,
            resolution_height=resolution_height,
            fps=fps,
            bitrate=bitrate
        )
        self._recordings[recording.id] = recording
        logger.info(f"Created recording {recording.id} for session {session_id}")
        return recording
    
    def get_recording(self, recording_id: str) -> Optional[Recording]:
        """Get a recording by ID."""
        return self._recordings.get(recording_id)
    
    def update_recording(
        self,
        recording_id: str,
        status: Optional[RecordingStatus] = None,
        duration_seconds: Optional[float] = None,
        file_size_bytes: Optional[int] = None
    ) -> bool:
        """Update recording details."""
        recording = self._recordings.get(recording_id)
        if not recording:
            return False
        
        if status is not None:
            recording.status = status
        if duration_seconds is not None:
            recording.duration_seconds = duration_seconds
        if file_size_bytes is not None:
            recording.file_size_bytes = file_size_bytes
        
        recording.updated_at = datetime.utcnow()
        return True
    
    def set_recording_ready(
        self,
        recording_id: str,
        file_path: str,
        duration_seconds: float,
        file_size_bytes: int
    ) -> bool:
        """Mark recording as ready."""
        recording = self._recordings.get(recording_id)
        if not recording:
            return False
        
        recording.status = RecordingStatus.READY
        recording.file_path = file_path
        recording.duration_seconds = duration_seconds
        recording.file_size_bytes = file_size_bytes
        recording.updated_at = datetime.utcnow()
        
        logger.info(f"Recording {recording_id} ready: {file_path}")
        return True
    
    def set_recording_failed(self, recording_id: str) -> bool:
        """Mark recording as failed."""
        recording = self._recordings.get(recording_id)
        if not recording:
            return False
        
        recording.status = RecordingStatus.FAILED
        recording.updated_at = datetime.utcnow()
        return True
    
    def get_session_recordings(self, session_id: str) -> List[Recording]:
        """Get all recordings for a session."""
        return [
            r for r in self._recordings.values()
            if r.session_id == session_id
        ]
    
    def delete_recording(self, recording_id: str) -> bool:
        """Delete a recording and its files."""
        recording = self._recordings.get(recording_id)
        if not recording:
            return False
        
        # Delete files
        if recording.file_path:
            file_path = Path(recording.file_path)
            if file_path.exists():
                file_path.unlink()
        if recording.thumbnail_path:
            thumb_path = Path(recording.thumbnail_path)
            if thumb_path.exists():
                thumb_path.unlink()
        
        del self._recordings[recording_id]
        logger.info(f"Deleted recording {recording_id}")
        return True
    
    def create_snapshot(self, session_id: str, file_path: str) -> Snapshot:
        """Create a new snapshot."""
        snapshot = Snapshot(session_id=session_id, file_path=file_path)
        self._snapshots[snapshot.id] = snapshot
        logger.info(f"Created snapshot {snapshot.id} for session {session_id}")
        return snapshot
    
    def get_snapshot(self, snapshot_id: str) -> Optional[Snapshot]:
        """Get a snapshot by ID."""
        return self._snapshots.get(snapshot_id)
    
    def get_session_snapshots(self, session_id: str) -> List[Snapshot]:
        """Get all snapshots for a session."""
        return [
            s for s in self._snapshots.values()
            if s.session_id == session_id
        ]
    
    def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a snapshot."""
        snapshot = self._snapshots.get(snapshot_id)
        if not snapshot:
            return False
        
        if snapshot.file_path:
            file_path = Path(snapshot.file_path)
            if file_path.exists():
                file_path.unlink()
        
        del self._snapshots[snapshot_id]
        logger.info(f"Deleted snapshot {snapshot_id}")
        return True
    
    def get_storage_stats(self) -> dict:
        """Get storage statistics."""
        recordings_size = sum(
            r.file_size_bytes for r in self._recordings.values()
            if r.file_size_bytes > 0
        )
        snapshots_count = len(self._snapshots)
        recordings_count = len(self._recordings)
        
        return {
            "recordings_count": recordings_count,
            "snapshots_count": snapshots_count,
            "total_storage_bytes": recordings_size,
            "storage_path": str(self._storage_path)
        }


# Global recording service instance
_recording_service: Optional[RecordingService] = None


def get_recording_service() -> RecordingService:
    """Get the global recording service instance."""
    global _recording_service
    if _recording_service is None:
        _recording_service = RecordingService()
    return _recording_service
