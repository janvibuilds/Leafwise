"""FastAPI application factory.

Model assets are loaded once when the application is created (i.e. at process
start), never per request. Failures are captured so liveness stays green and
readiness reports the reason instead of crashing the process.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.config import Settings, SettingsError
from app.ml.model_metadata import ModelContractError, load_model_metadata
from app.ml.predictor import KerasModelPredictor, ModelUnavailableError

# Sentinel: "not provided, build the real thing".
_UNSET: Any = object()

_APP_STATE: dict[str, Any] = {}


def create_app(
    settings: Settings | None = None,
    *,
    predictor: Any = _UNSET,
    **services: Any,
) -> FastAPI:
    """Build the FastAPI app.

    ``predictor`` and ``services`` accept test doubles; when omitted the real
    implementations are constructed from ``settings``.
    """
    settings = settings or Settings.from_env()

    app = FastAPI(
        title="Plant Disease Classification API",
        version="0.1.0",
        docs_url="/docs" if settings.environment != "production" else None,
    )
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Model assets -----------------------------------------------------
    metadata = None
    predictor_error: str | None = None
    try:
        metadata = load_model_metadata(settings.models_dir)
        app.state.metadata = metadata
    except (ModelContractError, OSError) as exc:
        predictor_error = str(exc)
        app.state.metadata = None

    if predictor is _UNSET:
        if metadata is None:
            app.state.predictor = None
            app.state.predictor_error = predictor_error
        else:
            try:
                app.state.predictor = KerasModelPredictor(
                    metadata,
                    max_upload_bytes=settings.max_upload_bytes,
                    max_pixels=settings.max_image_pixels,
                )
                app.state.predictor_error = None
            except (ModelContractError, ModelUnavailableError) as exc:
                predictor_error = str(exc)
                app.state.predictor = None
                app.state.predictor_error = predictor_error
    else:
        # Injected (possibly None to force a not-ready state in tests).
        app.state.predictor = predictor
        app.state.predictor_error = predictor_error if predictor is None else None

    # --- Services (Task 4 extends this block) -----------------------------
    app.state.services = services

    app.include_router(health.router)
    return app


def __getattr__(name: str):
    """Lazy module-level ``app`` so importing create_app never loads the model."""
    if name == "app":
        if "app" not in _APP_STATE:
            try:
                _APP_STATE["app"] = create_app()
            except SettingsError:
                raise RuntimeError(
                    "uvicorn app.main:app requires SUPABASE_URL, "
                    "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET"
                ) from None
        return _APP_STATE["app"]
    raise AttributeError(name)
