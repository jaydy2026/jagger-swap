"""
Session API Endpoints
"""

from fastapi import APIRouter, Request, HTTPException, Depends, Header
from typing import Optional
from app.models.session import (
    Session, SessionCreate, SessionResponse, SessionList, SessionMetrics
)
from app.services.session_service import get_session_service

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/", response_model=SessionResponse, status_code=201)
async def create_session(
    request: Request,
    session_data: Optional[SessionCreate] = None,
):
    """
    Create a new session.
    
    Returns session ID and initial session information.
    """
    service = get_session_service()
    
    session = service.create_session(
        user_agent=request.headers.get("User-Agent"),
        ip_address=get_client_ip(request),
        metadata=session_data.metadata if session_data else None
    )
    
    return SessionResponse.from_session(session)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """
    Get session information.
    """
    service = get_session_service()
    session = service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionResponse.from_session(session)


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session.
    """
    service = get_session_service()
    deleted = service.delete_session(session_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session deleted", "session_id": session_id}


@router.get("/", response_model=SessionList)
async def list_sessions():
    """
    List all sessions (admin endpoint).
    """
    service = get_session_service()
    sessions = service.get_all_sessions()
    
    return SessionList(
        sessions=[SessionResponse.from_session(s) for s in sessions],
        total=len(sessions),
        active=service.get_active_count()
    )


@router.get("/{session_id}/metrics", response_model=SessionMetrics)
async def get_session_metrics(session_id: str):
    """
    Get detailed metrics for a session.
    """
    service = get_session_service()
    metrics = service.get_session_metrics(session_id)
    
    if not metrics:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return metrics


@router.post("/{session_id}/heartbeat")
async def heartbeat(session_id: str):
    """
    Update session activity (heartbeat).
    """
    service = get_session_service()
    updated = service.update_activity(session_id)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Heartbeat recorded", "session_id": session_id}


@router.post("/{session_id}/record/frame")
async def record_frame(session_id: str, processing_time_ms: float):
    """
    Record a processed frame for a session.
    """
    service = get_session_service()
    session = service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    service.record_frame(session_id, processing_time_ms)
    
    return {"message": "Frame recorded", "session_id": session_id}


@router.post("/{session_id}/record/upload")
async def record_upload(session_id: str):
    """
    Record an upload event for a session.
    """
    service = get_session_service()
    session = service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    service.record_upload(session_id)
    
    return {"message": "Upload recorded", "session_id": session_id}


@router.post("/{session_id}/record/recording")
async def record_recording(session_id: str):
    """
    Record a recording event for a session.
    """
    service = get_session_service()
    session = service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    service.record_recording(session_id)
    
    return {"message": "Recording recorded", "session_id": session_id}


@router.post("/{session_id}/error")
async def record_error(session_id: str):
    """
    Record an error for a session.
    """
    service = get_session_service()
    session = service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    service.record_error(session_id)
    service.set_session_error(session_id)
    
    return {"message": "Error recorded", "session_id": session_id}


@router.post("/{session_id}/inactive")
async def set_inactive(session_id: str):
    """
    Set session as inactive.
    """
    service = get_session_service()
    session = service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    service.set_session_inactive(session_id)
    
    return {"message": "Session set to inactive", "session_id": session_id}
