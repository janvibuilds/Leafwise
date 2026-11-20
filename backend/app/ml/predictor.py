"""Model loading, contract validation, and single-image inference."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Protocol

import numpy as np
from pydantic import BaseModel

from app.ml.model_metadata import (
    ModelContractError,
    ModelMetadata,
)
from app.ml.preprocessing import preprocess_image


class ModelUnavailableError(RuntimeError):
    """The model could not be loaded or produced an unusable output."""


class TopPrediction(BaseModel):
    index: int
    label: str
    plant: str
    condition: str
    confidence: float


class PredictionResult(BaseModel):
    """Internal inference result (plan Task 3 interface)."""

    plant: str
    condition: str
    label: str
    confidence: float
    confidence_state: str  # "high" | "review_recommended" | "uncertain"
    top_predictions: list[TopPrediction]
    model_version: str
    inference_ms: float


class ModelPredictor(Protocol):
    def predict(self, image_bytes: bytes) -> PredictionResult: ...


def split_label(label: str) -> tuple[str, str]:
    """Split a raw model label into human-readable (plant, condition)."""
    plant, sep, condition = label.partition("___")
    plant = plant.replace("_", " ").strip()
    condition = condition.replace("_", " ").strip()
    if not sep:
        return plant, ""
    if condition.lower() == "healthy":
        condition = "Healthy"
    return plant, condition


def build_result(
    probs: np.ndarray, metadata: ModelMetadata, inference_ms: float
) -> PredictionResult:
    """Map a probability vector to the structured top-3 result."""
    values = np.asarray(probs, dtype=np.float64).reshape(-1)
    if values.shape != (metadata.num_classes,):
        raise ModelUnavailableError(
            f"model returned {values.shape[0]} probabilities, "
            f"expected {metadata.num_classes}"
        )
    if not np.all(np.isfinite(values)):
        raise ModelUnavailableError("model returned non-finite probabilities")

    order = np.argsort(values)[::-1][:3]
    top: list[TopPrediction] = []
    for index in order:
        plant, condition = split_label(metadata.labels[int(index)])
        top.append(
            TopPrediction(
                index=int(index),
                label=metadata.labels[int(index)],
                plant=plant,
                condition=condition,
                confidence=float(values[int(index)]),
            )
        )

    best = top[0]
    return PredictionResult(
        plant=best.plant,
        condition=best.condition,
        label=best.label,
        confidence=best.confidence,
        confidence_state=metadata.thresholds.state_for(best.confidence),
        top_predictions=top,
        model_version=metadata.model_version,
        inference_ms=round(inference_ms, 2),
    )


def _load_keras_model(path: Path):
    """Default loader; imports Keras lazily so fakes never pull in TensorFlow."""
    if not path.exists():
        raise ModelUnavailableError(f"model file not found: {path.name}")
    import keras  # noqa: PLC0415 - deliberate lazy import

    try:
        return keras.models.load_model(path, compile=False)
    except Exception as exc:  # pragma: no cover - depends on local artifact
        raise ModelUnavailableError("model file could not be loaded") from exc


class KerasModelPredictor:
    """Loads the packaged model once and serves single-image predictions."""

    def __init__(
        self,
        metadata: ModelMetadata,
        *,
        max_upload_bytes: int,
        max_pixels: int,
        model_loader=None,
    ) -> None:
        self._metadata = metadata
        self._max_upload_bytes = max_upload_bytes
        self._max_pixels = max_pixels
        loader = model_loader or _load_keras_model
        self._model = loader(metadata.model_path)
        self._validate_contract()

    def _validate_contract(self) -> None:
        output_shape = getattr(self._model, "output_shape", None)
        if not output_shape or output_shape[-1] != self._metadata.num_classes:
            raise ModelContractError(
                "model output count does not match labels.json: "
                f"{output_shape} vs {self._metadata.num_classes} classes"
            )
        input_shape = getattr(self._model, "input_shape", None)
        if input_shape and len(input_shape) == 4:
            actual = (input_shape[1], input_shape[2])
            expected = (self._metadata.height, self._metadata.width)
            if actual != expected:
                raise ModelContractError(
                    f"model input {actual} does not match preprocessing "
                    f"contract {expected}"
                )

    def predict(self, image_bytes: bytes) -> PredictionResult:
        batch = preprocess_image(
            image_bytes,
            contract=self._metadata.preprocessing_contract,
            max_bytes=self._max_upload_bytes,
            max_pixels=self._max_pixels,
        )
        start = time.perf_counter()
        try:
            raw = self._model.predict(batch[np.newaxis, ...], verbose=0)
        except ModelUnavailableError:
            raise
        except Exception as exc:
            raise ModelUnavailableError("model inference failed") from exc
        elapsed_ms = (time.perf_counter() - start) * 1000
        probs = np.asarray(raw)
        if probs.ndim != 2 or probs.shape[0] != 1:
            raise ModelUnavailableError("model returned an unexpected output shape")
        return build_result(probs[0], self._metadata, elapsed_ms)
