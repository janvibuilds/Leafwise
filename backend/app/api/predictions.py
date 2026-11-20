"""Prediction routes: create, history, detail, delete (spec §10.2)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile

from app.config import Settings
from app.dependencies import (
    CurrentUser,
    get_current_user,
    get_prediction_service,
    get_settings,
)
from app.errors import IMAGE_TOO_LARGE, VALIDATION_ERROR, ApiError
from app.schemas.prediction import (
    PredictionResponse,
    PredictionSummary,
    TopPredictionResponse,
)
from app.services.prediction_service import PredictionRecord, PredictionService

router = APIRouter(prefix="/api/v1", tags=["predictions"])


def record_to_response(record: PredictionRecord) -> PredictionResponse:
    return PredictionResponse(
        id=record.id,
        plant=record.plant_name,
        condition=record.disease_name,
        confidence=record.confidence,
        confidence_state=record.confidence_state,  # type: ignore[arg-type]
        top_predictions=[
            TopPredictionResponse(
                condition=f"{t['plant']} {t['condition']}",
                score=float(t["confidence"]),
            )
            for t in record.top_predictions
        ],
        model_version=record.model_version,
        created_at=record.created_at,
        image_url=record.image_url,
    )


def record_to_summary(record: PredictionRecord) -> PredictionSummary:
    return PredictionSummary(
        id=record.id,
        plant=record.plant_name,
        condition=record.disease_name,
        confidence=record.confidence,
        confidence_state=record.confidence_state,  # type: ignore[arg-type]
        model_version=record.model_version,
        created_at=record.created_at,
    )


@router.post("/predictions", response_model=PredictionResponse, status_code=201)
async def create_prediction(
    file: Annotated[UploadFile, File()],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[PredictionService, Depends(get_prediction_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PredictionResponse:
    """Classify an uploaded image and persist the prediction.

    The multipart field must be named ``file``. Reading is bounded by
    ``MAX_UPLOAD_BYTES`` so an oversized upload is rejected without buffering
    the whole payload.
    """
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise ApiError(
            413,
            IMAGE_TOO_LARGE,
            f"Image exceeds the {settings.max_upload_bytes} byte limit.",
        )
    record = service.create(user.id, data, file.content_type or "")
    return record_to_response(record)


@router.get("/predictions", response_model=list[PredictionSummary])
def list_predictions(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[PredictionService, Depends(get_prediction_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    limit: Annotated[int | None, Query(ge=1)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[PredictionSummary]:
    resolved = settings.history_default_limit if limit is None else limit
    if resolved > settings.history_max_limit:
        raise ApiError(
            422,
            VALIDATION_ERROR,
            f"limit must be <= {settings.history_max_limit}",
        )
    return [
        record_to_summary(r) for r in service.list(user.id, resolved, offset)
    ]


@router.get("/predictions/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[PredictionService, Depends(get_prediction_service)],
    include_image: Annotated[bool, Query()] = False,
) -> PredictionResponse:
    record = service.get(
        user.id, str(prediction_id), include_image=include_image
    )
    return record_to_response(record)


@router.delete("/predictions/{prediction_id}", status_code=204)
def delete_prediction(
    prediction_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[PredictionService, Depends(get_prediction_service)],
) -> Response:
    service.delete(user.id, str(prediction_id))
    return Response(status_code=204)
