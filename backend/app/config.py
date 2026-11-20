"""Validated environment settings for the FastAPI service."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field

# backend/app/config.py -> backend/app -> backend
BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MODELS_DIR = BACKEND_DIR / "models"

_REQUIRED_ENV = (
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
)


class SettingsError(RuntimeError):
    """Raised when required environment configuration is missing or invalid."""


class Settings(BaseModel):
    """Application settings.

    The three Supabase values are required: the service-role key is server-only
    and the JWT secret is needed to verify browser access tokens locally.
    """

    environment: str = "development"
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    models_dir: Path = Field(default=DEFAULT_MODELS_DIR)
    max_upload_bytes: int = Field(default=5 * 1024 * 1024, gt=0)
    max_image_pixels: int = Field(default=40_000_000, gt=0)
    prediction_bucket: str = "prediction-images"
    signed_url_ttl_seconds: int = Field(default=300, gt=0)
    history_default_limit: int = Field(default=20, gt=0)
    history_max_limit: int = Field(default=100, gt=0)
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @classmethod
    def from_env(cls) -> Settings:
        missing = [name for name in _REQUIRED_ENV if not os.environ.get(name)]
        if missing:
            raise SettingsError(
                "Missing required environment variables: " + ", ".join(missing)
            )
        models_dir = os.environ.get("MODELS_DIR")
        return cls(
            environment=os.environ.get("ENVIRONMENT", "development"),
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            supabase_jwt_secret=os.environ["SUPABASE_JWT_SECRET"],
            models_dir=Path(models_dir) if models_dir else DEFAULT_MODELS_DIR,
            max_upload_bytes=int(
                os.environ.get("MAX_UPLOAD_BYTES", 5 * 1024 * 1024)
            ),
            max_image_pixels=int(os.environ.get("MAX_IMAGE_PIXELS", 40_000_000)),
            prediction_bucket=os.environ.get(
                "PREDICTION_BUCKET", "prediction-images"
            ),
            signed_url_ttl_seconds=int(
                os.environ.get("SIGNED_URL_TTL_SECONDS", 300)
            ),
            cors_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000"),
        )
