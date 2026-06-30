"""
Virtual Camera Service

Provides a modular output pipeline for virtual camera integration.
Supports OBS Virtual Camera and other VCam implementations.
"""

import io
import asyncio
import logging
from typing import Optional, Callable, Protocol
from enum import Enum
import numpy as np

logger = logging.getLogger(__name__)


class OutputFormat(str, Enum):
    """Supported output formats for virtual camera."""
    MJPEG = "mjpeg"
    WEBM = "webm"
    H264 = "h264"
    RAW = "raw"


class VirtualCameraOutput:
    """
    Virtual Camera Output Pipeline
    
    This provides a modular interface for outputting animated frames
    to virtual camera devices or streaming protocols.
    
    Design Principles:
    - Not tightly coupled to any specific VCam implementation
    - Supports multiple output formats
    - Can be extended for OBS, Zoom, Teams, etc.
    """
    
    def __init__(
        self,
        width: int = 1920,
        height: int = 1080,
        fps: int = 30,
        format: OutputFormat = OutputFormat.MJPEG
    ):
        self.width = width
        self.height = height
        self.fps = fps
        self.format = format
        
        # Frame buffer
        self._current_frame: Optional[bytes] = None
        self._frame_lock = asyncio.Lock()
        
        # Output handlers
        self._handlers: list = []
        
        # Stream state
        self._is_streaming = False
        self._stream_start_time: Optional[float] = None
        
    @property
    def is_streaming(self) -> bool:
        """Check if currently streaming."""
        return self._is_streaming
    
    async def start_stream(self):
        """Start the virtual camera stream."""
        if self._is_streaming:
            logger.warning("Stream already active")
            return
        
        self._is_streaming = True
        self._stream_start_time = asyncio.get_event_loop().time()
        logger.info(f"Virtual camera stream started ({self.width}x{self.height} @ {self.fps} FPS)")
        
        # Notify all handlers
        for handler in self._handlers:
            try:
                await handler.on_stream_start()
            except Exception as e:
                logger.error(f"Handler error: {e}")
    
    async def stop_stream(self):
        """Stop the virtual camera stream."""
        if not self._is_streaming:
            return
        
        self._is_streaming = False
        duration = 0
        if self._stream_start_time:
            duration = asyncio.get_event_loop().time() - self._stream_start_time
        
        logger.info(f"Virtual camera stream stopped (duration: {duration:.1f}s)")
        
        # Notify all handlers
        for handler in self._handlers:
            try:
                await handler.on_stream_stop()
            except Exception as e:
                logger.error(f"Handler error: {e}")
    
    async def push_frame(self, frame_data: bytes) -> bool:
        """
        Push a new frame to the output pipeline.
        
        Args:
            frame_data: Raw frame bytes (PNG, JPEG, or raw RGB)
            
        Returns:
            True if frame was accepted
        """
        async with self._frame_lock:
            self._current_frame = frame_data
        
        # Push to all handlers
        for handler in self._handlers:
            try:
                await handler.on_frame(frame_data)
            except Exception as e:
                logger.error(f"Handler error: {e}")
        
        return True
    
    async def get_current_frame(self) -> Optional[bytes]:
        """Get the current frame."""
        async with self._frame_lock:
            return self._current_frame
    
    def register_handler(self, handler: 'OutputHandler'):
        """Register an output handler."""
        self._handlers.append(handler)
        logger.info(f"Registered handler: {handler.name}")
    
    def unregister_handler(self, handler: 'OutputHandler'):
        """Unregister an output handler."""
        if handler in self._handlers:
            self._handlers.remove(handler)
            logger.info(f"Unregistered handler: {handler.name}")
    
    def get_info(self) -> dict:
        """Get stream information."""
        return {
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "format": self.format,
            "is_streaming": self._is_streaming,
            "handlers": [h.name for h in self._handlers]
        }


class OutputHandler(Protocol):
    """
    Protocol for output handlers.
    
    Implement this to create custom output handlers for:
    - OBS Virtual Camera
    - RTMP streaming
    - WebRTC
    - File recording
    - etc.
    """
    
    @property
    def name(self) -> str:
        """Handler name."""
        ...
    
    async def on_stream_start(self):
        """Called when stream starts."""
        ...
    
    async def on_stream_stop(self):
        """Called when stream stops."""
        ...
    
    async def on_frame(self, frame_data: bytes):
        """Called for each frame."""
        ...


class WebSocketHandler:
    """
    WebSocket-based output handler.
    
    Streams frames to connected WebSocket clients.
    Can be used with OBS or other applications via browser.
    """
    
    def __init__(self, websocket_manager: 'WebSocketManager'):
        self.websocket_manager = websocket_manager
        self._clients: set = set()
    
    @property
    def name(self) -> str:
        return "websocket"
    
    async def on_stream_start(self):
        """Start broadcasting to clients."""
        await self.websocket_manager.start_broadcast()
    
    async def on_stream_stop(self):
        """Stop broadcasting."""
        await self.websocket_manager.stop_broadcast()
    
    async def on_frame(self, frame_data: bytes):
        """Broadcast frame to all clients."""
        await self.websocket_manager.broadcast_frame(frame_data)


class RTMPHandler:
    """
    RTMP streaming handler.
    
    Outputs to an RTMP server (e.g., YouTube, Twitch, custom).
    
    Note: Requires ffmpeg-python or similar for actual RTMP output.
    """
    
    def __init__(self, rtmp_url: str, width: int = 1920, height: int = 1080, fps: int = 30):
        self.rtmp_url = rtmp_url
        self.width = width
        self.height = height
        self.fps = fps
        self._process = None
    
    @property
    def name(self) -> str:
        return "rtmp"
    
    async def on_stream_start(self):
        """Start FFmpeg process for RTMP output."""
        # Placeholder - actual implementation would use subprocess
        logger.info(f"RTMP stream would start: {self.rtmp_url}")
    
    async def on_stream_stop(self):
        """Stop FFmpeg process."""
        if self._process:
            self._process.terminate()
            self._process = None
    
    async def on_frame(self, frame_data: bytes):
        """Send frame to FFmpeg."""
        # Placeholder - actual implementation would pipe to FFmpeg
        pass


class FileOutputHandler:
    """
    File output handler for recording.
    """
    
    def __init__(self, output_path: str, format: str = "webm"):
        self.output_path = output_path
        self.format = format
        self._file = None
        self._frame_count = 0
    
    @property
    def name(self) -> str:
        return f"file:{self.output_path}"
    
    async def on_stream_start(self):
        """Open output file."""
        self._file = open(self.output_path, 'wb')
        self._frame_count = 0
        logger.info(f"Recording to {self.output_path}")
    
    async def on_stream_stop(self):
        """Close output file."""
        if self._file:
            self._file.close()
            self._file = None
        logger.info(f"Recording stopped. Frames: {self._frame_count}")
    
    async def on_frame(self, frame_data: bytes):
        """Write frame to file."""
        if self._file:
            self._file.write(frame_data)
            self._frame_count += 1


# Global virtual camera instance
_virtual_camera: Optional[VirtualCameraOutput] = None


def get_virtual_camera() -> VirtualCameraOutput:
    """Get the global virtual camera instance."""
    global _virtual_camera
    if _virtual_camera is None:
        _virtual_camera = VirtualCameraOutput()
    return _virtual_camera


async def init_virtual_camera(
    width: int = 1920,
    height: int = 1080,
    fps: int = 30
) -> VirtualCameraOutput:
    """Initialize the global virtual camera."""
    global _virtual_camera
    _virtual_camera = VirtualCameraOutput(
        width=width,
        height=height,
        fps=fps
    )
    return _virtual_camera
