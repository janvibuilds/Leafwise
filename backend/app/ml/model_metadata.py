"""Model asset loading and contract validation.

Fails fast at startup when assets are missing, the label order is not
contiguous, or the preprocessing contract is incomplete.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from app.config import DEFAULT_MODELS_DIR  # re-exported for convenience

__all__ = ["DEFAULT_MODELS_DIR", "ModelContractError", "ModelMetadata",
           "PreprocessingContract", "Thresholds", "load_model_metadata"]

EXPECTED_NUM_CLASSES = 38
REQUIRED_PREPROCESSING_KEYS = (
    "input",
    "model_internal_preprocessing",
)


class ModelContractError(RuntimeError):
    """Raised when packaged model assets violate the documented contract."""


@dataclass(frozen=True)
class PreprocessingContract:
    """The exact runtime preprocessing policy from ``preprocessing.json``."""

    width: int
    height: int
    resample: str  # NEAREST
    divide_by: float  # 255.0

    @property
    def size(self) -> tuple[int, int]:
        return (self.width, self.height)


@dataclass(frozen=True)
class Thresholds:
    """Confidence thresholds from ``metrics.json`` (provisional)."""

    uncertain_below: float
    high_at_or_above: float

    def state_for(self, confidence: float) -> str:
        if confidence < self.uncertain_below:
            return "uncertain"
        if confidence >= self.high_at_or_above:
            return "high"
        return "review_recommended"


@dataclass(frozen=True)
class ModelMetadata:
    """Loaded, validated model assets."""

    model_version: str
    model_path: Path
    labels: tuple[str, ...]
    preprocessing: dict
    preprocessing_contract: PreprocessingContract
    metrics: dict
    thresholds: Thresholds

    @property
    def num_classes(self) -> int:
        return len(self.labels)

    @property
    def height(self) -> int:
        return self.preprocessing_contract.height

    @property
    def width(self) -> int:
        return self.preprocessing_contract.width


def _read_json(path: Path, asset: str) -> dict:
    if not path.exists():
        raise ModelContractError(f"missing model asset: {path.name} ({asset})")
    try:
        with path.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as exc:
        raise ModelContractError(f"invalid JSON in model asset: {path.name}") from exc
    if not isinstance(data, dict):
        raise ModelContractError(f"model asset must be an object: {path.name}")
    return data


def _load_labels(path: Path) -> tuple[str, ...]:
    data = _read_json(path, "labels")
    num_classes = data.get("num_classes")
    classes = data.get("classes")
    if not isinstance(classes, list) or not classes:
        raise ModelContractError("labels.json has no classes")
    if num_classes != EXPECTED_NUM_CLASSES or len(classes) != EXPECTED_NUM_CLASSES:
        raise ModelContractError(
            f"expected {EXPECTED_NUM_CLASSES} classes, labels.json declares "
            f"{num_classes} and contains {len(classes)}"
        )
    labels: list[str] = []
    for expected_index, entry in enumerate(classes):
        if not isinstance(entry, dict):
            raise ModelContractError("labels.json class entries must be objects")
        if entry.get("index") != expected_index:
            raise ModelContractError(
                "labels.json indexes must be contiguous from 0; "
                f"expected {expected_index}, got {entry.get('index')}"
            )
        label = entry.get("label")
        if not isinstance(label, str) or not label:
            raise ModelContractError("labels.json entries need a non-empty label")
        labels.append(label)
    if len(set(labels)) != len(labels):
        raise ModelContractError("labels.json contains duplicate labels")
    if not isinstance(data.get("model_version"), str) or not data["model_version"]:
        raise ModelContractError("labels.json is missing model_version")
    return tuple(labels)


def _load_preprocessing(path: Path) -> dict:
    data = _read_json(path, "preprocessing")
    for key in REQUIRED_PREPROCESSING_KEYS:
        if key not in data:
            raise ModelContractError(f"preprocessing.json is missing '{key}'")
    model_input = data["input"]
    for key in ("resize", "color_mode", "scaling", "exif_transpose"):
        if key not in model_input:
            raise ModelContractError(f"preprocessing.json input is missing '{key}'")
    size = model_input["resize"].get("size")
    if (
        not isinstance(size, list)
        or len(size) != 2
        or not all(isinstance(v, int) and v > 0 for v in size)
    ):
        raise ModelContractError("preprocessing.json resize.size must be [width, height]")
    if model_input["resize"].get("method") != "NEAREST":
        raise ModelContractError("runtime resize method must be NEAREST")
    if model_input.get("color_mode") != "RGB":
        raise ModelContractError("runtime color mode must be RGB")
    if model_input.get("exif_transpose") is not True:
        raise ModelContractError("EXIF orientation correction is required")
    if model_input["scaling"].get("divide_by") != 255:
        raise ModelContractError("runtime scaling must divide by 255")
    return data


def _load_metrics(path: Path) -> dict:
    data = _read_json(path, "metrics")
    if "metrics" not in data or "thresholds" not in data:
        raise ModelContractError("metrics.json needs 'metrics' and 'thresholds'")
    thresholds = data["thresholds"]
    try:
        uncertain = float(thresholds["uncertain_below"])
        high = float(thresholds["high_at_or_above"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ModelContractError("metrics.json thresholds are incomplete") from exc
    if not 0 < uncertain < high <= 1:
        raise ModelContractError(
            "metrics.json thresholds must satisfy 0 < uncertain_below < high_at_or_above <= 1"
        )
    return data


def load_model_metadata(models_dir: Path) -> ModelMetadata:
    """Load and validate every packaged model asset. Raises ModelContractError."""
    labels_path = models_dir / "labels.json"
    preprocessing_path = models_dir / "preprocessing.json"
    metrics_path = models_dir / "metrics.json"

    labels = _load_labels(labels_path)
    preprocessing = _load_preprocessing(preprocessing_path)
    metrics = _load_metrics(metrics_path)

    versions = {
        "labels.json": _read_json(labels_path, "labels")["model_version"],
        "preprocessing.json": preprocessing.get("model_version"),
        "metrics.json": metrics.get("model_version"),
    }
    unique_versions = {v for v in versions.values()}
    if len(unique_versions) != 1 or None in unique_versions:
        raise ModelContractError(
            f"model_version disagrees across assets: {versions}"
        )

    raw_size = preprocessing["input"]["resize"]["size"]
    contract = PreprocessingContract(
        width=raw_size[0],
        height=raw_size[1],
        resample=preprocessing["input"]["resize"]["method"],
        divide_by=float(preprocessing["input"]["scaling"]["divide_by"]),
    )
    thresholds = Thresholds(
        uncertain_below=float(metrics["thresholds"]["uncertain_below"]),
        high_at_or_above=float(metrics["thresholds"]["high_at_or_above"]),
    )

    return ModelMetadata(
        model_version=versions["labels.json"],
        model_path=models_dir / "plant_disease_model.keras",
        labels=labels,
        preprocessing=preprocessing,
        preprocessing_contract=contract,
        metrics=metrics,
        thresholds=thresholds,
    )
