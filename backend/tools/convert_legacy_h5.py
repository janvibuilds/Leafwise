"""Rebuild the runtime Keras model from the original H5 weights.

The original artifact was saved by Keras 3.5 with a nested Functional block
that Keras 3.12 cannot deserialize faithfully: its ``input_layers`` /
``output_layers`` references are list-wrapped, and unwrapping them produces a
graph whose intermediate tensors cannot be resolved. That graph loads and even
predicts, but its top layers are connected to the wrong activation and the
resulting classifier is effectively constant.

This script avoids deserializing that graph. It rebuilds the documented
architecture in the current Keras version:

    EfficientNetB3(include_top=False, pooling="max")  # imagenet preprocessing
    -> Dense(256, relu) -> Dropout(0.3) -> Dense(38, softmax)

and copies every weight from the original H5 **by name and shape**, with an
explicit alias for the two top Dense layers whose auto-generated names differ
between the two Keras versions. It then verifies the values, checks that
different inputs produce different predictions, exports a TensorFlow SavedModel
to ``plant_disease_model_tf/``, and verifies a round-trip through the frozen graph.

Usage (from the repository root):

    python backend/tools/convert_legacy_h5.py

The source ``.h5`` is a research reference and is never modified or committed.
"""

import contextlib
import io
import shutil
import sys
from pathlib import Path

import h5py
import keras
import numpy as np
import tensorflow as tf

# backend/tools/ -> backend/ -> repository root
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "Plant_Village_Detection_Model.h5"
OUT_DIR = ROOT / "backend" / "models"
# SavedModel freezes the concrete computation graph. Keras `.keras` round-trips
# mis-serialize this EfficientNet sub-model in Keras 3.12 and silently change
# the predictions, so the runtime artifact is a SavedModel directory.
OUT = OUT_DIR / "plant_disease_model_tf"

# Keras auto-numbered the top Dense layers differently in the original file.
_TOP_LAYER_ALIASES = {"dense_5": "dense", "dense_6": "dense_1"}


def collect_model_weights(model):
    """Return ``{layer/weight: Variable}`` including nested sub-models."""
    out = {}

    def add(prefix, layer):
        if hasattr(layer, "layers") and layer is not model:
            for sub in layer.layers:
                add(f"{prefix}{layer.name}/", sub)
        else:
            for weight in layer.weights:
                out[f"{prefix}{layer.name}/{weight.name}"] = weight

    for layer in model.layers:
        add("", layer)
    return out


def collect_file_weights(path):
    """Return ``{layer/weight: ndarray}`` from the legacy H5 file."""
    out = {}
    with h5py.File(path, "r") as file:
        root = file["model_weights"]
        groups = [key for key, value in root.items() if isinstance(value, h5py.Group)]
        for group_name in groups:
            group = root[group_name]
            names = [
                name.decode() if isinstance(name, bytes) else name
                for name in group.attrs.get("weight_names", [])
            ]
            for name in names:
                key = name
                for prefix in (f"efficientnetb3/{group_name}/", f"{group_name}/"):
                    if key.startswith(prefix):
                        key = key[len(prefix) :]
                        break
                out[f"{group_name}/{key}"] = np.asarray(group[name][()])
    return out


def build_model():
    base = keras.applications.EfficientNetB3(
        include_top=False,
        weights=None,
        input_shape=(224, 224, 3),
        pooling="max",
    )
    return keras.Sequential(
        [
            base,
            keras.layers.Dense(256, activation="relu"),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(38, activation="softmax"),
        ]
    )


def main():
    if not SRC.exists():
        sys.exit(f"FAIL: source model not found: {SRC}")

    file_weights = collect_file_weights(SRC)
    model = build_model()
    model_weights = collect_model_weights(model)
    print(f"model weights: {len(model_weights)}  file weights: {len(file_weights)}")

    def target_key(key: str) -> str:
        prefix, _, rest = key.partition("/")
        if prefix in _TOP_LAYER_ALIASES:
            # H5 nests these as `dense_5/sequential_2/dense_5/kernel`;
            # the rebuilt Sequential exposes them as `dense/kernel`.
            return f"{_TOP_LAYER_ALIASES[prefix]}/{key.rsplit('/', 1)[-1]}"
        return f"{prefix}/{rest}"

    missing = [key for key in file_weights if target_key(key) not in model_weights]
    if missing:
        sys.exit(f"FAIL: unmapped weights: {missing[:10]}")

    for key, array in file_weights.items():
        weight = model_weights[target_key(key)]
        if tuple(weight.shape) != tuple(array.shape):
            sys.exit(f"FAIL: shape mismatch for {key}: {weight.shape} vs {array.shape}")
        weight.assign(array.astype(weight.dtype))

    mismatches = [
        key
        for key in file_weights
        if not np.array_equal(np.asarray(model_weights[target_key(key)]), file_weights[key])
    ]
    if mismatches:
        sys.exit(f"FAIL: {len(mismatches)} weights differ after assignment: {mismatches[:5]}")
    print("all weights matched by name, shape and exact value")

    # Smoke predictions must differ for clearly different inputs.
    rng = np.random.default_rng(0)
    samples = {
        "zeros": np.zeros((1, 224, 224, 3), dtype="float32"),
        "ones": np.ones((1, 224, 224, 3), dtype="float32"),
        "random": rng.random((1, 224, 224, 3)).astype("float32"),
    }
    predictions = {}
    for name, batch in samples.items():
        probs = model.predict(batch, verbose=0)
        if probs.shape != (1, 38) or not np.isclose(probs.sum(), 1.0, atol=1e-4):
            sys.exit(f"FAIL: invalid prediction for {name}: {probs.shape}")
        predictions[name] = probs[0]
        print(
            f"smoke predict {name}: argmax={int(probs.argmax())} "
            f"max={probs.max():.4f}"
        )

    if np.allclose(predictions["zeros"], predictions["random"], atol=1e-3):
        sys.exit("FAIL: model output is constant across inputs")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.rmtree(OUT, ignore_errors=True)
    with contextlib.redirect_stdout(io.StringIO()):
        model.export(OUT)
    size_mb = sum(path.stat().st_size for path in OUT.rglob("*") if path.is_file()) / 1e6
    print(f"saved SavedModel {OUT} ({size_mb:.1f} MB)")

    reloaded = tf.saved_model.load(str(OUT))
    signature = reloaded.signatures["serving_default"]
    input_key = next(iter(signature.structured_input_signature[1]))
    check = list(signature(**{input_key: tf.constant(samples["random"])}).values())[
        0
    ].numpy()
    if not np.allclose(check, predictions["random"], rtol=0, atol=1e-5):
        sys.exit("FAIL: SavedModel round-trip changed predictions")
    print("SavedModel round-trip identical")
    print("CONVERSION OK")


if __name__ == "__main__":
    main()
