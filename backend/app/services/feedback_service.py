"""Feedback persistence: one row per (prediction, user), owner-verified."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol

from app.errors import (
    FEEDBACK_EXISTS,
    INTERNAL_ERROR,
    PREDICTION_NOT_FOUND,
    ApiError,
    FeedbackConflict,
)
from app.services.prediction_service import PredictionRepository


class FeedbackRepository(Protocol):
    def insert(self, row: dict) -> dict: ...


class FeedbackService:
    def __init__(
        self,
        *,
        predictions: PredictionRepository,
        feedback: FeedbackRepository,
    ) -> None:
        self._predictions = predictions
        self._feedback = feedback

    def submit(
        self,
        user_id: str,
        prediction_id: str,
        is_correct: bool,
        comment: str | None,
    ) -> dict:
        # Ownership is verified first: feedback only on the caller's own row.
        if self._predictions.get_for_user(user_id, prediction_id) is None:
            raise ApiError(404, PREDICTION_NOT_FOUND, "Prediction not found.")

        row = {
            "prediction_id": prediction_id,
            "user_id": user_id,
            "is_correct": is_correct,
            "comment": comment,
            "created_at": datetime.now(UTC).isoformat(),
        }
        try:
            return self._feedback.insert(row)
        except FeedbackConflict:
            raise ApiError(
                409,
                FEEDBACK_EXISTS,
                "Feedback was already submitted for this prediction.",
            ) from None
        except Exception as exc:
            raise ApiError(
                500, INTERNAL_ERROR, "Feedback could not be saved."
            ) from exc
