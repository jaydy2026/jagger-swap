from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime
import uuid
import os
import aiofiles
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image file.
    
    Accepts PNG, JPEG, JPG files up to 10MB.
    Returns file ID and URL for further processing.
    """
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset position
    
    if size > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size // 1024 // 1024}MB"
        )

    # Generate unique file ID
    file_id = str(uuid.uuid4())
    extension = file.filename.split(".")[-1] if file.filename else "png"
    new_filename = f"{file_id}.{extension}"
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, new_filename)

    # Save file
    try:
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # Return response
    return {
        "success": True,
        "fileId": file_id,
        "filename": new_filename,
        "url": f"/uploads/{new_filename}",
        "message": "File uploaded successfully",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/{file_id}")
async def get_file_info(file_id: str):
    """Get information about an uploaded file."""
    # Search for file
    for filename in os.listdir(settings.upload_dir):
        if filename.startswith(file_id):
            file_path = os.path.join(settings.upload_dir, filename)
            return {
                "fileId": file_id,
                "filename": filename,
                "size": os.path.getsize(file_path),
                "path": file_path,
                "exists": True,
            }
    
    raise HTTPException(status_code=404, detail="File not found")


@router.delete("/{file_id}")
async def delete_file(file_id: str):
    """Delete an uploaded file."""
    deleted = False
    
    for filename in os.listdir(settings.upload_dir):
        if filename.startswith(file_id):
            file_path = os.path.join(settings.upload_dir, filename)
            os.remove(file_path)
            deleted = True
            break
    
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "success": True,
        "message": "File deleted successfully",
        "timestamp": datetime.utcnow().isoformat(),
    }
