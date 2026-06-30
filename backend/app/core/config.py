from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "JAGGER SWAP"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # API settings
    api_prefix: str = "/api/v1"
    
    # CORS settings
    cors_origins: list[str] = ["*"]
    
    # Security settings
    rate_limit_requests: int = 100  # requests per minute
    rate_limit_burst: int = 20  # burst size
    
    # File upload settings
    upload_dir: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list[str] = ["png", "jpg", "jpeg"]
    
    # Session settings
    session_timeout_minutes: int = 30
    session_cleanup_interval_seconds: int = 60
    
    # Camera settings
    default_resolution: str = "1280x720"
    target_fps: int = 30
    
    # Recording settings
    recording_dir: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "recordings")
    max_recording_duration_seconds: int = 300  # 5 minutes
    
    # Animation settings (placeholders for future AI modules)
    animation_model_path: str = ""
    animation_enabled: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
