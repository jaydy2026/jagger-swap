from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.schemas.camera import (
    CameraStartRequest,
    CameraStartResponse,
    CameraStopResponse,
    CameraDevicesResponse,
    CameraDevice,
)

router = APIRouter()

# In-memory camera state (in production, this would be managed by WebSocket)
camera_state = {
    "is_active": False,
    "device_id": None,
    "resolution": None,
}


@router.post("/start")
async def start_camera(request: CameraStartRequest = None):
    """
    Start camera stream.
    
    In this placeholder implementation, camera is handled client-side.
    This endpoint logs the request for future server-side camera support.
    """
    if camera_state["is_active"]:
        return CameraStartResponse(
            success=True,
            message="Camera already running",
            deviceId=camera_state.get("device_id"),
            resolution=camera_state.get("resolution"),
        )

    # Update state
    device_id = request.deviceId if request else None
    resolution = request.resolution if request else "1280x720"
    
    camera_state["is_active"] = True
    camera_state["device_id"] = device_id
    camera_state["resolution"] = resolution

    return CameraStartResponse(
        success=True,
        message="Camera started successfully",
        deviceId=device_id,
        resolution=resolution,
    )


@router.post("/stop")
async def stop_camera():
    """Stop camera stream."""
    if not camera_state["is_active"]:
        return CameraStopResponse(
            success=True,
            message="Camera is not running",
        )

    camera_state["is_active"] = False
    camera_state["device_id"] = None
    camera_state["resolution"] = None

    return CameraStopResponse(
        success=True,
        message="Camera stopped successfully",
    )


@router.get("/devices")
async def get_devices():
    """
    Get list of available camera devices.
    
    Note: This requires camera permissions to be granted.
    The actual device enumeration is done client-side.
    """
    # Return placeholder devices
    return CameraDevicesResponse(
        success=True,
        devices=[
            CameraDevice(
                deviceId="default",
                label="Default Camera",
                kind="videoinput"
            )
        ],
    )


@router.get("/status")
async def get_camera_status():
    """Get current camera status."""
    return {
        "is_active": camera_state["is_active"],
        "device_id": camera_state.get("device_id"),
        "resolution": camera_state.get("resolution"),
        "timestamp": datetime.utcnow().isoformat(),
    }
