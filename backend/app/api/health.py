"""Health and readiness endpoints (no authentication required)."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.schemas.prediction import LivenessResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get("/health/live", response_model=LivenessResponse)
def liveness() -> LivenessResponse:
    """Process liveness: the service is up, regardless of model state."""
    return LivenessResponse(status="live")


@router.get("/health", response_model=LivenessResponse, include_in_schema=False)
def health_alias() -> LivenessResponse:
    """Spec alias for /health/live."""
    return LivenessResponse(status="live")


@router.get("/health/ready", response_model=ReadinessResponse)
def readiness(request: Request):
    """Readiness: fails when model assets cannot load (spec: never ready
    with a missing or invalid model)."""
    predictor = getattr(request.app.state, "predictor", None)
    error = getattr(request.app.state, "predictor_error", None)
    if predictor is None:
        return JSONResponse(
            status_code=503,
            content=ReadinessResponse(
                status="not_ready", detail=error or "model unavailable"
            ).model_dump(by_alias=True),
        )
    metadata = request.app.state.metadata
    return ReadinessResponse(status="ready", model_version=metadata.model_version)
