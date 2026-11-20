"""Predictor contract tests using a stub model (no TensorFlow import)."""

from __future__ import annotations

import io

import numpy as np
import pytest
from PIL import Image

from app.ml.model_metadata import DEFAULT_MODELS_DIR, ModelContractError, load_model_metadata
from app.ml.predictor import KerasModelPredictor, split_label
from app.ml.preprocessing import InvalidImageError


@pytest.fixture(scope="module")
def metadata():
    return load_model_metadata(DEFAULT_MODELS_DIR)


class StubModel:
    def __init__(
        self,
        probs: np.ndarray,
        output_shape: tuple = (None, 38),
        input_shape: tuple = (None, 224, 224, 3),
    ) -> None:
        self._probs = np.asarray(probs, dtype=np.float64)
        self.output_shape = output_shape
        self.input_shape = input_shape

    def predict(self, batch, verbose=0):  # noqa: ANN001, ARG002
        assert tuple(batch.shape) == (1, 224, 224, 3)
        return self._probs.reshape(1, -1)


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 48), (5, 100, 200)).save(buf, format="PNG")
    return buf.getvalue()


def make_predictor(metadata, model: StubModel) -> KerasModelPredictor:
    return KerasModelPredictor(
        metadata,
        max_upload_bytes=1_000_000,
        max_pixels=10_000_000,
        model_loader=lambda _path: model,
    )


def test_predict_returns_top_three_sorted_predictions(metadata):
    probs = np.full(38, 0.05 / 35, dtype=np.float64)
    probs[30], probs[29], probs[31] = 0.70, 0.20, 0.05
    predictor = make_predictor(metadata, StubModel(probs))

    result = predictor.predict(png_bytes())

    assert len(result.top_predictions) == 3
    indexes = [t.index for t in result.top_predictions]
    assert indexes == [30, 29, 31]
    scores = [t.confidence for t in result.top_predictions]
    assert scores == sorted(scores, reverse=True)
    assert [t.label for t in result.top_predictions] == [
        metadata.labels[i] for i in indexes
    ]
    assert result.plant == "Tomato"
    assert result.condition == "Late blight"
    assert result.label == metadata.labels[30]
    assert result.confidence == pytest.approx(0.70)
    assert result.confidence_state == "review_recommended"
    assert result.model_version == metadata.model_version
    assert result.inference_ms >= 0


def test_high_score_returns_high_state(metadata):
    probs = np.full(38, 0.025, dtype=np.float64)
    probs[30] = 0.95
    probs[29] = 0.02
    probs[31] = 0.005
    predictor = make_predictor(metadata, StubModel(probs))

    assert predictor.predict(png_bytes()).confidence_state == "high"


def test_low_score_returns_uncertain(metadata):
    probs = np.full(38, 0.0125, dtype=np.float64)
    probs[30] = 0.55
    probs[29] = 0.25
    probs[31] = 0.10
    predictor = make_predictor(metadata, StubModel(probs))

    assert predictor.predict(png_bytes()).confidence_state == "uncertain"


def test_predictor_rejects_label_count_mismatch(metadata):
    probs = np.full(37, 1 / 37, dtype=np.float64)
    with pytest.raises(ModelContractError):
        make_predictor(metadata, StubModel(probs, output_shape=(None, 37)))


def test_predictor_rejects_corrupt_image(metadata):
    probs = np.full(38, 1 / 38, dtype=np.float64)
    predictor = make_predictor(metadata, StubModel(probs))
    with pytest.raises(InvalidImageError):
        predictor.predict(b"not an image")


@pytest.mark.parametrize(
    ("label", "expected"),
    [
        ("Apple___Apple_scab", ("Apple", "Apple scab")),
        ("Apple___healthy", ("Apple", "Healthy")),
        ("Corn_(maize)___Common_rust_", ("Corn (maize)", "Common rust")),
        ("Potato___Early_blight", ("Potato", "Early blight")),
    ],
)
def test_split_label_humanizes_raw_labels(label, expected):
    assert split_label(label) == expected
