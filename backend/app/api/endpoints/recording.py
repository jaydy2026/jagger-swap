"""
Recording API Endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import List
from app.models.recording import (
    Recording, RecordingCreate, RecordingResponse, RecordingList, 
    SnapshotResponse, RecordingFormat
)
from app.services.recording_service import get_recording_service

router = APIRouter()


@router.post("/", response_model=RecordingResponse, status_code=201)
async def create_recording(
    session_id: str,
    format: RecordingFormat = RecordingFormat.WEBM,
    resolution_width: int = 1920,
    resolution_height: int = 1080,
    fps: float = 30.0,
    bitrate: int = 2500000
):
    """
    Create a new recording.
    """
    service = get_recording_service()
    
    recording = service.create_recording(
        session_id=session_id,
        format=format,
        resolution_width=resolution_width,
        resolution_height=resolution_height,
        fps=fps,
        bitrate=bitrate
    )
    
    return RecordingResponse(
        id=recording.id,
        session_id=recording.session_id,
        status=recording.status,
        format=recording.format,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes,
        created_at=recording.created_at
    )


@router.get("/", response_model=RecordingList)
async def list_recordings(session_id: str):
    """
    List all recordings for a session.
    """
    service = get_recording_service()
    recordings = service.get_session_recordings(session_id)
    
    return RecordingList(
        recordings=[
            RecordingResponse(
                id=r.id,
                session_id=r.session_id,
                status=r.status,
                format=r.format,
                duration_seconds=r.duration_seconds,
                file_size_bytes=r.file_size_bytes,
                created_at=r.created_at
            )
            for r in recordings
        ],
        total=len(recordings)
    )


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str):
    """
    Get recording details.
    """
    service = get_recording_service()
    recording = service.get_recording(recording_id)
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    return RecordingResponse(
        id=recording.id,
        session_id=recording.session_id,
        status=recording.status,
        format=recording.format,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes,
        created_at=recording.created_at
    )


@router.delete("/{recording_id}")
async def delete_recording(recording_id: str):
    """
    Delete a recording.
    """
    service = get_recording_service()
    deleted = service.delete_recording(recording_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    return {"message": "Recording deleted", "recording_id": recording_id}


@router.post("/{recording_id}/upload")
async def upload_recording(recording_id: str, file: UploadFile = File(...)):
    """
    Upload a recording file.
    """
    service = get_recording_service()
    recording = service.get_recording(recording_id)
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Validate file type
    content = await file.read()
    file_size = len(content)
    
    # Save file
    storage_path = f"./recordings/videos/{recording_id}.{recording.format}"
    with open(storage_path, "wb") as f:
        f.write(content)
    
    # Update recording
    service.set_recording_ready(
        recording_id=recording_id,
        file_path=storage_path,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=file_size
    )
    
    return {
        "message": "Recording uploaded",
        "recording_id": recording_id,
        "file_size": file_size
    }


@router.get("/{recording_id}/download")
async def download_recording(recording_id: str):
    """
    Download a recording.
    """
    service = get_recording_service()
    recording = service.get_recording(recording_id)
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    if recording.status != "ready" or not recording.file_path:
        raise HTTPException(status_code=400, detail="Recording not ready")
    
    return FileResponse(
        path=recording.file_path,
        filename=f"recording_{recording_id}.{recording.format}",
        media_type="video/webm" if recording.format == "webm" else "video/mp4"
    )


# Snapshot endpoints
@router.post("/snapshot", response_model=SnapshotResponse, status_code=201)
async def create_snapshot(session_id: str, file: UploadFile = File(...)):
    """
    Upload a snapshot.
    """
    content = await file.read()
    
    # Validate PNG/JPEG
    if not file.content_type in ["image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    snapshot_id = f"snapshot_{session_id}_{len(content)}"
    storage_path = f"./recordings/snapshots/{snapshot_id}.png"
    
    with open(storage_path, "wb") as f:
        f.write(content)
    
    service = get_recording_service()
    snapshot = service.create_snapshot(session_id=session_id, file_path=storage_path)
    
    return SnapshotResponse(
        id=snapshot.id,
        session_id=session_id,
        created_at=snapshot.created_at
    )


@router.get("/snapshot/{snapshot_id}")
async def get_snapshot(snapshot_id: str):
    """
    Get snapshot details.
    """
    service = get_recording_service()
    snapshot = service.get_snapshot(snapshot_id)
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return SnapshotResponse(
        id=snapshot.id,
        session_id=snapshot.session_id,
        created_at=snapshot.created_at
    )


@router.get("/snapshot/{snapshot_id}/download")
async def download_snapshot(snapshot_id: str):
    """
    Download a snapshot.
    """
    service = get_recording_service()
    snapshot = service.get_snapshot(snapshot_id)
    
    if not snapshot or not snapshot.file_path:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return FileResponse(
        path=snapshot.file_path,
        filename=f"snapshot_{snapshot_id}.png",
        media_type="image/png"
    )


@router.delete("/snapshot/{snapshot_id}")
async def delete_snapshot(snapshot_id: str):
    """
    Delete a snapshot.
    """
    service = get_recording_service()
    deleted = service.delete_snapshot(snapshot_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return {"message": "Snapshot deleted", "snapshot_id": snapshot_id}


@router.get("/stats")
async def get_recording_stats():
    """
    Get recording storage statistics.
    """
    service = get_recording_service()
    return service.get_storage_stats()
