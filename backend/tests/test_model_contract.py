"""Model asset contract tests (labels, preprocessing, metrics, runtime model).

The final test loads the real ``.keras`` model and runs one prediction; it is
skipped when the runtime artifact has not been built on this machine.
"""

from __future__ import annotations

import io

import pytest
from PIL import Image

from app.ml.model_metadata import DEFAULT_MODELS_DIR, load_model_metadata


@pytest.fixture(scope="module")
def metadata():
    return load_model_metadata(DEFAULT_MODELS_DIR)


def test_labels_are_contiguous_38_classes(metadata):
    assert metadata.num_classes == 38
    assert len(metadata.labels) == 38
    assert len(set(metadata.labels)) == 38
    assert metadata.model_version == "plant-village-effnetb3-original-v1"


def test_metadata_versions_agree(metadata):
    assert metadata.preprocessing["model_version"] == metadata.model_version
    assert metadata.metrics["model_version"] == metadata.model_version


def test_preprocessing_contract_values(metadata):
    contract = metadata.preprocessing["input"]
    assert contract["resize"]["size"] == [224, 224]
    assert contract["resize"]["method"] == "NEAREST"
    assert contract["color_mode"] == "RGB"
    assert contract["scaling"]["divide_by"] == 255
    assert contract["exif_transpose"] is True


def test_thresholds_are_ordered_and_marked_provisional(metadata):
    thresholds = metadata.metrics["thresholds"]
    assert 0 < thresholds["uncertain_below"] < thresholds["high_at_or_above"] <= 1
    assert "PROVISIONAL" in thresholds["status"]
    assert metadata.metrics["metrics"]["independently_verified"] is False


def test_runtime_model_loads_and_predicts(metadata):
    if not metadata.model_path.exists():
        pytest.skip("runtime .keras artifact not built on this machine")

    from app.ml.predictor import KerasModelPredictor

    predictor = KerasModelPredictor(
        metadata, max_upload_bytes=5_000_000, max_pixels=40_000_000
    )

    buf = io.BytesIO()
    Image.new("RGB", (300, 200), (40, 120, 40)).save(buf, format="PNG")
    result = predictor.predict(buf.getvalue())

    assert result.model_version == metadata.model_version
    assert len(result.top_predictions) == 3
    scores = [t.confidence for t in result.top_predictions]
    assert scores == sorted(scores, reverse=True)
    assert 0.0 <= result.confidence <= 1.0
    assert result.confidence_state in {"high", "review_recommended", "uncertain"}
    assert result.plant and result.condition
