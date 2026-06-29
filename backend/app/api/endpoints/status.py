from fastapi import APIRouter
from datetime import datetime
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/")
async def get_status():
    """
    Get API status and system information.
    
    Returns current system status, version, and health information.
    """
    return {
        "status": "healthy",
        "message": "JAGGER SWAP API is running",
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "development" if settings.debug else "production",
    }


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "healthy": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/info")
async def get_info():
    """Get detailed API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Backend API for JAGGER SWAP - Real-Time Portrait Animation",
        "endpoints": {
            "upload": "/upload",
            "camera": "/camera",
            "animation": "/animation",
            "status": "/status",
            "docs": "/docs",
        },
        "features": {
            "upload_enabled": True,
            "camera_enabled": True,
            "animation_enabled": False,  # Coming in Milestone 2
            "gpu_acceleration": False,  # Coming in Milestone 2
        },
        "timestamp": datetime.utcnow().isoformat(),
    }
