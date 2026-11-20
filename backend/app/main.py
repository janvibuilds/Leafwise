"""FastAPI application factory.

Model assets are loaded once when the application is created (i.e. at process
start), never per request. Failures are captured so liveness stays green and
readiness reports the reason instead of crashing the process.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import diseases, feedback, health, predictions, profiles
from app.config import Settings, SettingsError
from app.errors import register_error_handlers
from app.ml.model_metadata import ModelContractError, load_model_metadata
from app.ml.predictor import KerasModelPredictor, ModelUnavailableError

# Sentinel: "not provided, build the real thing".
_UNSET: Any = object()

_APP_STATE: dict[str, Any] = {}


def _build_supabase(settings: Settings):
    """Create the server-side supabase client (service-role key)."""
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _build_services(app: FastAPI, settings: Settings, metadata, predictor) -> None:
    """Construct real services; leave them None (→ 503) when dependencies fail."""
    from app.services.disease_service import DiseaseService
    from app.services.feedback_service import FeedbackService
    from app.services.prediction_service import PredictionService
    from app.services.storage_service import SupabaseStorageService
    from app.services.supabase_repositories import (
        SupabaseDiseaseRepository,
        SupabaseFeedbackRepository,
        SupabasePredictionRepository,
    )

    try:
        client = _build_supabase(settings)
    except Exception:
        app.state.prediction_service = None
        app.state.disease_service = None
        app.state.feedback_service = None
        return

    storage = SupabaseStorageService(
        client,
        settings.prediction_bucket,
        settings.signed_url_ttl_seconds,
    )
    predictions_repo = SupabasePredictionRepository(client)
    app.state.prediction_service = PredictionService(
        repository=predictions_repo,
        storage=storage,
        predictor=predictor,
        settings=settings,
    )
    # disease routes need validated metadata; without it they fail closed (503)
    app.state.disease_service = (
        DiseaseService(
            metadata=metadata,
            repository=SupabaseDiseaseRepository(client),
        )
        if metadata is not None
        else None
    )
    app.state.feedback_service = FeedbackService(
        predictions=predictions_repo,
        feedback=SupabaseFeedbackRepository(client),
    )


def create_app(
    settings: Settings | None = None,
    *,
    predictor: Any = _UNSET,
    prediction_service: Any = _UNSET,
    disease_service: Any = _UNSET,
    feedback_service: Any = _UNSET,
) -> FastAPI:
    """Build the FastAPI app.

    ``predictor`` and the services accept test doubles; when omitted the real
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

    # --- Services ---------------------------------------------------------
    if prediction_service is _UNSET:
        # nothing injected -> build the real services from settings
        _build_services(app, settings, metadata, app.state.predictor)
    else:
        # injection mode: anything not explicitly provided fails closed (503)
        app.state.prediction_service = (
            None if prediction_service is None else prediction_service
        )
        app.state.disease_service = (
            None if disease_service in (None, _UNSET) else disease_service
        )
        app.state.feedback_service = (
            None if feedback_service in (None, _UNSET) else feedback_service
        )

    # --- Routes and error handlers ---------------------------------------
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(profiles.router)
    app.include_router(diseases.router)
    app.include_router(predictions.router)
    app.include_router(feedback.router)
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
