"""Prediction feedback route: one row per user and prediction."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user, get_feedback_service
from app.schemas.prediction import FeedbackRequest, FeedbackResponse
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/api/v1", tags=["feedback"])


@router.post(
    "/predictions/{prediction_id}/feedback",
    response_model=FeedbackResponse,
    status_code=201,
)
def submit_feedback(
    prediction_id: UUID,
    body: FeedbackRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
) -> FeedbackResponse:
    """Record the caller's correctness verdict on their own prediction."""
    stored = service.submit(
        user.id, str(prediction_id), body.is_correct, body.comment
    )
    return FeedbackResponse(
        id=stored["id"],
        prediction_id=stored["prediction_id"],
        is_correct=stored["is_correct"],
        comment=stored.get("comment"),
        created_at=stored["created_at"],
    )
