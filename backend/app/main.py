from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import (
    upload, camera, animation, status, session, recording, admin, virtual_camera
)
from app.services.session_service import init_session_service, shutdown_session_service

# Import for psutil in admin endpoints
try:
    import psutil
except ImportError:
    psutil = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    await init_session_service(timeout_minutes=30)
    yield
    # Shutdown
    await shutdown_session_service()


app = FastAPI(
    title="JAGGER SWAP API",
    description="Backend API for JAGGER SWAP - Real-Time Portrait Animation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration - restricted for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://jagger-swap.vercel.app",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(camera.router, prefix="/api/camera", tags=["Camera"])
app.include_router(animation.router, prefix="/api/animation", tags=["Animation"])
app.include_router(status.router, prefix="/api/status", tags=["Status"])
app.include_router(session.router, prefix="/api/session", tags=["Session"])
app.include_router(recording.router, prefix="/api/recording", tags=["Recording"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(virtual_camera.router, prefix="/api/vcam", tags=["Virtual Camera"])


@app.get("/")
async def root():
    """Root endpoint returning API information."""
    return {
        "name": "JAGGER SWAP API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
