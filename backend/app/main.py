from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import upload, camera, animation, status

app = FastAPI(
    title="JAGGER SWAP API",
    description="Backend API for JAGGER SWAP - Real-Time Portrait Animation",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(camera.router, prefix="/camera", tags=["Camera"])
app.include_router(animation.router, prefix="/animation", tags=["Animation"])
app.include_router(status.router, prefix="/status", tags=["Status"])


@app.get("/")
async def root():
    """Root endpoint returning API information."""
    return {
        "name": "JAGGER SWAP API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
