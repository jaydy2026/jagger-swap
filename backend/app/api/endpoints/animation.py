from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.schemas.animation import (
    AnimationStartRequest,
    AnimationStartResponse,
    AnimationStatusResponse,
    AnimationStopResponse,
    AnimationStatus,
)

router = APIRouter()

# In-memory animation state
animation_state = {
    "status": AnimationStatus.IDLE,
    "session_id": None,
    "file_id": None,
    "progress": 0.0,
    "fps": 0.0,
    "latency": 0.0,
}


@router.post("/start")
async def start_animation(request: AnimationStartRequest):
    """
    Start animation processing.
    
    This is a placeholder endpoint. The actual AI animation
    will be implemented in future milestones.
    """
    if animation_state["status"] in [AnimationStatus.PROCESSING, AnimationStatus.INITIALIZING]:
        return AnimationStartResponse(
            success=True,
            message="Animation already in progress",
            sessionId=animation_state.get("session_id"),
        )

    animation_state["status"] = AnimationStatus.INITIALIZING
    animation_state["file_id"] = request.fileId
    animation_state["session_id"] = f"session_{request.fileId[:8]}"
    animation_state["progress"] = 0.0

    return AnimationStartResponse(
        success=True,
        message="Animation initialization started. AI processing coming in Milestone 2.",
        sessionId=animation_state["session_id"],
    )


@router.get("/status")
async def get_animation_status():
    """
    Get current animation status.
    
    Returns placeholder metrics. Real metrics will be provided
    once AI animation is implemented.
    """
    return AnimationStatusResponse(
        status=animation_state["status"],
        message=_get_status_message(animation_state["status"]),
        progress=animation_state["progress"],
        fps=animation_state["fps"],
        latency=animation_state["latency"],
    )


@router.post("/stop")
async def stop_animation():
    """Stop animation processing."""
    if animation_state["status"] == AnimationStatus.IDLE:
        return AnimationStopResponse(
            success=True,
            message="No animation is running",
        )

    animation_state["status"] = AnimationStatus.IDLE
    animation_state["session_id"] = None
    animation_state["file_id"] = None
    animation_state["progress"] = 0.0
    animation_state["fps"] = 0.0
    animation_state["latency"] = 0.0

    return AnimationStopResponse(
        success=True,
        message="Animation stopped successfully",
    )


@router.get("/settings")
async def get_animation_settings():
    """Get current animation settings."""
    return {
        "smoothing": 0.5,
        "fidelity": 0.7,
        "style": "natural",
        "preserve_background": True,
        "available_styles": ["natural", "stylized", "cartoon"],
    }


@router.post("/settings")
async def update_animation_settings(settings: dict):
    """Update animation settings."""
    return {
        "success": True,
        "message": "Settings updated (placeholder)",
        "settings": settings,
    }


def _get_status_message(status: AnimationStatus) -> str:
    """Get human-readable status message."""
    messages = {
        AnimationStatus.IDLE: "Animation is idle. Start an animation to begin.",
        AnimationStatus.INITIALIZING: "Initializing animation engine...",
        AnimationStatus.PROCESSING: "Processing animation frames...",
        AnimationStatus.READY: "Animation is ready and running.",
        AnimationStatus.ERROR: "An error occurred during animation processing.",
    }
    return messages.get(status, "Unknown status")
