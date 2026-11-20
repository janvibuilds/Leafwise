"""Pydantic response/request models for the prediction API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    """Base model: snake_case fields, camelCase wire format (spec §10.3)."""

    model_config = ConfigDict(alias_generator=lambda f: _to_camel(f), populate_by_name=True)


def _to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.capitalize() for part in rest)


ConfidenceState = Literal["high", "review_recommended", "uncertain"]


class TopPredictionResponse(CamelModel):
    condition: str
    score: float = Field(ge=0.0, le=1.0)


class PredictionResponse(CamelModel):
    id: str
    plant: str
    condition: str
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_state: ConfidenceState
    top_predictions: list[TopPredictionResponse]
    model_version: str
    created_at: datetime
    image_url: str | None = None


class PredictionSummary(CamelModel):
    id: str
    plant: str
    condition: str
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_state: ConfidenceState
    model_version: str
    created_at: datetime


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    is_correct: bool
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackResponse(CamelModel):
    id: str
    prediction_id: str
    is_correct: bool
    comment: str | None
    created_at: datetime


class LivenessResponse(CamelModel):
    status: Literal["live"]


class ReadinessResponse(CamelModel):
    status: Literal["ready", "not_ready"]
    model_version: str | None = None
    detail: str | None = None
