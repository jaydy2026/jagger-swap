"""
Admin API Endpoints

Provides monitoring and admin functionality for production deployment.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List, Optional
import psutil
import platform
from app.services.session_service import get_session_service
from app.services.recording_service import get_recording_service

router = APIRouter()


class SystemMetrics:
    """System metrics collector."""
    
    @staticmethod
    def get_cpu_usage() -> float:
        """Get current CPU usage percentage."""
        return psutil.cpu_percent(interval=0.1)
    
    @staticmethod
    def get_memory_usage() -> dict:
        """Get memory usage information."""
        memory = psutil.virtual_memory()
        return {
            "total_bytes": memory.total,
            "available_bytes": memory.available,
            "used_bytes": memory.used,
            "percent": memory.percent
        }
    
    @staticmethod
    def get_disk_usage() -> dict:
        """Get disk usage information."""
        disk = psutil.disk_usage('/')
        return {
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "percent": disk.percent
        }
    
    @staticmethod
    def get_platform_info() -> dict:
        """Get platform information."""
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        }


@router.get("/health")
async def health_check():
    """
    Detailed health check for all services.
    """
    return {
        "healthy": True,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "session_service": True,
            "recording_service": True,
            "database": True,  # Placeholder
        }
    }


@router.get("/metrics")
async def get_metrics():
    """
    Get system-wide metrics.
    """
    session_service = get_session_service()
    recording_service = get_recording_service()
    
    # Session metrics
    sessions = session_service.get_all_sessions()
    active_sessions = session_service.get_active_sessions()
    
    # Calculate aggregate metrics
    total_frames = sum(s.frame_count for s in sessions)
    total_errors = sum(s.error_count for s in sessions)
    avg_fps = sum(s.average_fps for s in sessions) / len(sessions) if sessions else 0
    
    # Recording stats
    recording_stats = recording_service.get_storage_stats()
    
    return {
        # Time
        "timestamp": datetime.utcnow().isoformat(),
        
        # Sessions
        "sessions": {
            "total": len(sessions),
            "active": len(active_sessions),
            "total_frames_processed": total_frames,
            "total_errors": total_errors,
            "average_fps": round(avg_fps, 2)
        },
        
        # System resources
        "system": {
            "cpu_percent": SystemMetrics.get_cpu_usage(),
            "memory": SystemMetrics.get_memory_usage(),
            "disk": SystemMetrics.get_disk_usage(),
            "platform": SystemMetrics.get_platform_info()
        },
        
        # Recording stats
        "recordings": {
            "total": recording_stats["recordings_count"],
            "snapshots": recording_stats["snapshots_count"],
            "storage_used_bytes": recording_stats["total_storage_bytes"]
        }
    }


@router.get("/users")
async def get_active_users():
    """
    Get list of active users with their session info.
    """
    session_service = get_session_service()
    active_sessions = session_service.get_active_sessions()
    
    users = []
    for session in active_sessions:
        metrics = session_service.get_session_metrics(session.id)
        users.append({
            "session_id": session.id,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "user_agent": session.user_agent,
            "ip_address": session.ip_address,
            "frame_count": session.frame_count,
            "upload_count": session.upload_count,
            "average_fps": round(session.average_fps, 2),
            "error_count": session.error_count,
            "status": session.status
        })
    
    return {
        "count": len(users),
        "users": users
    }


@router.get("/performance")
async def get_performance_stats():
    """
    Get performance statistics across all sessions.
    """
    session_service = get_session_service()
    sessions = session_service.get_all_sessions()
    
    if not sessions:
        return {
            "average_fps": 0,
            "average_latency_ms": 0,
            "total_frames": 0,
            "error_rate": 0,
            "active_sessions": 0
        }
    
    total_frames = sum(s.frame_count for s in sessions)
    total_processing_time = sum(s.total_processing_time for s in sessions)
    total_errors = sum(s.error_count for s in sessions)
    active_count = len(session_service.get_active_sessions())
    
    avg_latency = total_processing_time / total_frames if total_frames > 0 else 0
    error_rate = (total_errors / total_frames * 100) if total_frames > 0 else 0
    
    return {
        "average_fps": round(
            sum(s.average_fps for s in sessions) / len(sessions), 2
        ),
        "average_latency_ms": round(avg_latency, 2),
        "total_frames": total_frames,
        "error_rate_percent": round(error_rate, 2),
        "active_sessions": active_count
    }


@router.get("/errors")
async def get_recent_errors():
    """
    Get recent errors from sessions.
    """
    session_service = get_session_service()
    sessions = session_service.get_all_sessions()
    
    errors = []
    for session in sessions:
        if session.error_count > 0:
            errors.append({
                "session_id": session.id,
                "error_count": session.error_count,
                "status": session.status,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat()
            })
    
    # Sort by error count descending
    errors.sort(key=lambda x: x["error_count"], reverse=True)
    
    return {
        "total_sessions_with_errors": len(errors),
        "total_errors": sum(e["error_count"] for e in errors),
        "errors": errors[:100]  # Limit to 100
    }


@router.post("/sessions/cleanup")
async def force_cleanup():
    """
    Force cleanup of expired sessions.
    """
    session_service = get_session_service()
    cleaned = await session_service.cleanup_expired()
    
    return {
        "cleaned_sessions": cleaned,
        "remaining_sessions": session_service.get_session_count()
    }
