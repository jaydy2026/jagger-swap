"""
Virtual Camera API Endpoints

Provides endpoints for virtual camera output.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import asyncio
import io
from app.services.virtual_camera import (
    get_virtual_camera, OutputFormat, OutputHandler
)

router = APIRouter()


class WebSocketManager:
    """Manages WebSocket connections for frame streaming."""
    
    def __init__(self):
        self.active_connections: list = []
        self.is_broadcasting = False
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def start_broadcast(self):
        self.is_broadcasting = True
    
    async def stop_broadcast(self):
        self.is_broadcasting = False
    
    async def broadcast_frame(self, frame_data: bytes):
        if not self.active_connections:
            return
        
        # Convert to base64 for WebSocket transport
        import base64
        encoded = base64.b64encode(frame_data).decode('utf-8')
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json({
                    "type": "frame",
                    "data": encoded
                })
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected
        for conn in disconnected:
            self.disconnect(conn)


# Global WebSocket manager
ws_manager = WebSocketManager()


@router.get("/info")
async def get_vcam_info():
    """
    Get virtual camera information.
    """
    vcam = get_virtual_camera()
    return vcam.get_info()


@router.post("/start")
async def start_vcam_stream():
    """
    Start the virtual camera stream.
    """
    vcam = get_virtual_camera()
    await vcam.start_stream()
    return {"status": "started"}


@router.post("/stop")
async def stop_vcam_stream():
    """
    Stop the virtual camera stream.
    """
    vcam = get_virtual_camera()
    await vcam.stop_stream()
    return {"status": "stopped"}


@router.post("/frame")
async def push_frame(
    session_id: str,
    image: bytes
):
    """
    Push a frame to the virtual camera output.
    """
    vcam = get_virtual_camera()
    
    if not vcam.is_streaming:
        raise HTTPException(status_code=400, detail="Stream not started")
    
    await vcam.push_frame(image)
    return {"status": "pushed"}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for receiving frames.
    
    Clients can connect via WebSocket to receive frames
    for OBS or other virtual camera integration.
    """
    await ws_manager.connect(websocket)
    
    # Register with virtual camera
    vcam = get_virtual_camera()
    vcam.register_handler(WebSocketHandler(ws_manager))
    
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            
            # Handle commands
            if data == "ping":
                await websocket.send_text("pong")
            elif data == "start":
                await vcam.start_stream()
            elif data == "stop":
                await vcam.stop_stream()
                
    except WebSocketDisconnect:
        pass
    finally:
        vcam.unregister_handler(WebSocketHandler(ws_manager))
        ws_manager.disconnect(websocket)


@router.get("/stream")
async def get_vcam_stream():
    """
    Get a MJPEG stream from the virtual camera.
    
    This can be used as a source for OBS Virtual Camera.
    """
    vcam = get_virtual_camera()
    
    async def generate():
        while vcam.is_streaming:
            frame = await vcam.get_current_frame()
            if frame:
                # MJPEG format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            await asyncio.sleep(1/30)  # 30 FPS
    
    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
