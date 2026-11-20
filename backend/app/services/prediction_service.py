"""Prediction workflow: validate -> infer -> upload -> persist (spec §10.2)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import Protocol

from app.config import Settings
from app.errors import (
    IMAGE_TOO_LARGE,
    INTERNAL_ERROR,
    INVALID_IMAGE,
    MODEL_UNAVAILABLE,
    PREDICTION_NOT_FOUND,
    STORAGE_ERROR,
    ApiError,
)
from app.ml.predictor import ModelPredictor, ModelUnavailableError
from app.ml.preprocessing import ALLOWED_CONTENT_TYPES

_CONTENT_TYPE_EXTENSION = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


@dataclass
class PredictionRecord:
    """A persisted prediction row (spec §11.1 ``predictions`` columns)."""

    id: str
    user_id: str
    image_path: str
    plant_name: str
    disease_name: str
    confidence: float
    confidence_state: str
    top_predictions: list[dict]
    model_version: str
    inference_ms: float
    created_at: datetime
    image_url: str | None = field(default=None)

    @classmethod
    def from_row(cls, row: dict) -> PredictionRecord:
        raw_created_at = row["created_at"]
        created_at = (
            raw_created_at
            if isinstance(raw_created_at, datetime)
            else datetime.fromisoformat(raw_created_at)
        )
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            image_path=row.get("image_path") or "",
            plant_name=row["plant_name"],
            disease_name=row["disease_name"],
            confidence=float(row["confidence"]),
            confidence_state=row["confidence_state"],
            top_predictions=list(row.get("top_predictions") or []),
            model_version=row.get("model_version") or "",
            inference_ms=float(row.get("inference_ms") or 0.0),
            created_at=created_at,
        )


class PredictionRepository(Protocol):
    def insert(self, row: dict) -> PredictionRecord: ...

    def list_for_user(self, user_id: str, limit: int, offset: int) -> list[
        PredictionRecord
    ]: ...

    def get_for_user(self, user_id: str, prediction_id: str) -> PredictionRecord | None: ...

    def delete_for_user(self, user_id: str, prediction_id: str) -> bool: ...


class StorageService(Protocol):
    def upload(self, path: str, data: bytes, content_type: str) -> None: ...

    def delete(self, path: str) -> None: ...

    def create_signed_url(self, path: str, expires_in: int) -> str: ...


class PredictionService:
    """Orchestrates the authenticated prediction transaction.

    Order (plan Task 4, step 4): authenticate (dependency) -> validate ->
    infer -> upload -> insert, with storage compensation when insert fails.
    """

    def __init__(
        self,
        *,
        repository: PredictionRepository,
        storage: StorageService,
        predictor: ModelPredictor | None,
        settings: Settings,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._predictor = predictor
        self._settings = settings

    def create(
        self, user_id: str, image_bytes: bytes, content_type: str
    ) -> PredictionRecord:
        content_type = (content_type or "").lower()
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ApiError(
                400, INVALID_IMAGE, "Only JPEG, PNG or WEBP images are accepted."
            )
        if not image_bytes:
            raise ApiError(400, INVALID_IMAGE, "The uploaded file is empty.")
        if len(image_bytes) > self._settings.max_upload_bytes:
            raise ApiError(
                413,
                IMAGE_TOO_LARGE,
                f"Image exceeds the {self._settings.max_upload_bytes} byte limit.",
            )
        if self._predictor is None:
            raise ApiError(
                503, MODEL_UNAVAILABLE, "The classifier is temporarily unavailable."
            )

        # 1. Inference before anything durable happens.
        try:
            result = self._predictor.predict(image_bytes)
        except ModelUnavailableError:
            raise

        prediction_id = str(uuid.uuid4())
        extension = _CONTENT_TYPE_EXTENSION[content_type]
        image_path = str(PurePosixPath(user_id, f"{prediction_id}.{extension}"))

        # 2. Private, user-scoped upload.
        try:
            self._storage.upload(image_path, image_bytes, content_type)
        except Exception as exc:
            raise ApiError(
                502, STORAGE_ERROR, "The uploaded image could not be stored."
            ) from exc

        # 3. Persist; compensate by deleting the upload if persistence fails.
        row = {
            "id": prediction_id,
            "user_id": user_id,
            "image_path": image_path,
            "plant_name": result.plant,
            "disease_name": result.condition,
            "confidence": result.confidence,
            "confidence_state": result.confidence_state,
            "top_predictions": [
                {
                    "index": top.index,
                    "label": top.label,
                    "plant": top.plant,
                    "condition": top.condition,
                    "confidence": top.confidence,
                }
                for top in result.top_predictions
            ],
            "model_version": result.model_version,
            "inference_ms": result.inference_ms,
            "created_at": datetime.now(UTC).isoformat(),
        }
        try:
            return self._repository.insert(row)
        except Exception as exc:
            try:
                self._storage.delete(image_path)
            except Exception:  # pragma: no cover - best-effort compensation
                pass
            raise ApiError(
                500, INTERNAL_ERROR, "The prediction could not be saved."
            ) from exc

    def list(self, user_id: str, limit: int, offset: int) -> list[PredictionRecord]:
        return self._repository.list_for_user(user_id, limit, offset)

    def get(
        self, user_id: str, prediction_id: str, *, include_image: bool = False
    ) -> PredictionRecord:
        record = self._repository.get_for_user(user_id, prediction_id)
        if record is None:
            raise ApiError(
                404, PREDICTION_NOT_FOUND, "Prediction not found."
            )
        if include_image and record.image_path:
            record.image_url = self._storage.create_signed_url(
                record.image_path, self._settings.signed_url_ttl_seconds
            )
        return record

    def delete(self, user_id: str, prediction_id: str) -> None:
        record = self._repository.get_for_user(user_id, prediction_id)
        if record is None:
            raise ApiError(404, PREDICTION_NOT_FOUND, "Prediction not found.")
        # Storage first: a failure leaves everything intact and retryable.
        if record.image_path:
            try:
                self._storage.delete(record.image_path)
            except Exception as exc:
                raise ApiError(
                    502, STORAGE_ERROR, "The stored image could not be removed."
                ) from exc
        if not self._repository.delete_for_user(user_id, prediction_id):
            raise ApiError(404, PREDICTION_NOT_FOUND, "Prediction not found.")
