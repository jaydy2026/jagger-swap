"""
Session Service

Manages user sessions with automatic cleanup and timeout handling.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, List
import asyncio
import logging
from app.models.session import Session, SessionStatus, SessionMetrics

logger = logging.getLogger(__name__)


class SessionService:
    """Service for managing user sessions."""
    
    def __init__(self, timeout_minutes: int = 30, cleanup_interval_seconds: int = 60):
        """
        Initialize the session service.
        
        Args:
            timeout_minutes: Minutes before an inactive session is considered expired
            cleanup_interval_seconds: Seconds between cleanup runs
        """
        self._sessions: Dict[str, Session] = {}
        self._timeout = timedelta(minutes=timeout_minutes)
        self._cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_interval = cleanup_interval_seconds
        
    async def start(self):
        """Start the session cleanup background task."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            logger.info("Session cleanup task started")
    
    async def stop(self):
        """Stop the session cleanup background task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
            logger.info("Session cleanup task stopped")
    
    async def _cleanup_loop(self):
        """Background task to clean up expired sessions."""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                cleaned = await self.cleanup_expired()
                if cleaned > 0:
                    logger.info(f"Cleaned up {cleaned} expired sessions")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
    
    async def cleanup_expired(self) -> int:
        """
        Remove all expired sessions.
        
        Returns:
            Number of sessions removed
        """
        now = datetime.utcnow()
        expired_ids = []
        
        for session_id, session in self._sessions.items():
            if now - session.last_activity > self._timeout:
                expired_ids.append(session_id)
        
        for session_id in expired_ids:
            del self._sessions[session_id]
        
        return len(expired_ids)
    
    def create_session(
        self,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Session:
        """
        Create a new session.
        
        Args:
            user_agent: Browser user agent string
            ip_address: Client IP address
            metadata: Optional session metadata
            
        Returns:
            Newly created Session
        """
        session = Session(
            user_agent=user_agent,
            ip_address=ip_address,
            metadata=metadata or {}
        )
        self._sessions[session.id] = session
        logger.info(f"Created session {session.id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """
        Get a session by ID.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session if found, None otherwise
        """
        return self._sessions.get(session_id)
    
    def update_activity(self, session_id: str) -> bool:
        """
        Update the last activity timestamp for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if session was found and updated
        """
        session = self._sessions.get(session_id)
        if session:
            session.last_activity = datetime.utcnow()
            session.updated_at = datetime.utcnow()
            if session.status == SessionStatus.CREATED:
                session.status = SessionStatus.ACTIVE
            return True
        return False
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if session was found and deleted
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session {session_id}")
            return True
        return False
    
    def get_all_sessions(self) -> List[Session]:
        """Get all active sessions."""
        return list(self._sessions.values())
    
    def get_active_sessions(self) -> List[Session]:
        """Get all active (non-expired) sessions."""
        now = datetime.utcnow()
        return [
            s for s in self._sessions.values()
            if now - s.last_activity <= self._timeout
        ]
    
    def get_session_count(self) -> int:
        """Get total session count."""
        return len(self._sessions)
    
    def get_active_count(self) -> int:
        """Get active session count."""
        return len(self.get_active_sessions())
    
    def get_session_metrics(self, session_id: str) -> Optional[SessionMetrics]:
        """
        Get metrics for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            SessionMetrics if found
        """
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        return SessionMetrics(
            session_id=session.id,
            frame_count=session.frame_count,
            upload_count=session.upload_count,
            recording_count=session.recording_count,
            average_fps=session.average_fps,
            total_processing_time=session.total_processing_time,
            error_count=session.error_count,
            last_activity=session.last_activity
        )
    
    def record_frame(self, session_id: str, processing_time: float):
        """
        Record a processed frame for a session.
        
        Args:
            session_id: Session identifier
            processing_time: Time taken to process frame in ms
        """
        session = self._sessions.get(session_id)
        if session:
            session.frame_count += 1
            session.total_processing_time += processing_time
            if session.frame_count > 0:
                session.average_fps = 1000 / (session.total_processing_time / session.frame_count)
    
    def record_upload(self, session_id: str):
        """Record an upload for a session."""
        session = self._sessions.get(session_id)
        if session:
            session.upload_count += 1
    
    def record_recording(self, session_id: str):
        """Record a recording for a session."""
        session = self._sessions.get(session_id)
        if session:
            session.recording_count += 1
    
    def record_error(self, session_id: str):
        """Record an error for a session."""
        session = self._sessions.get(session_id)
        if session:
            session.error_count += 1
    
    def set_session_error(self, session_id: str):
        """Set session status to error."""
        session = self._sessions.get(session_id)
        if session:
            session.status = SessionStatus.ERROR
    
    def set_session_inactive(self, session_id: str):
        """Set session status to inactive."""
        session = self._sessions.get(session_id)
        if session:
            session.status = SessionStatus.INACTIVE


# Global session service instance
_session_service: Optional[SessionService] = None


def get_session_service() -> SessionService:
    """Get the global session service instance."""
    global _session_service
    if _session_service is None:
        _session_service = SessionService()
    return _session_service


async def init_session_service(timeout_minutes: int = 30) -> SessionService:
    """Initialize the global session service."""
    global _session_service
    _session_service = SessionService(timeout_minutes=timeout_minutes)
    await _session_service.start()
    return _session_service


async def shutdown_session_service():
    """Shutdown the global session service."""
    global _session_service
    if _session_service:
        await _session_service.stop()
        _session_service = None
