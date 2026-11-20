"""Convert the original legacy H5 model into a modern .keras runtime artifact.

The original file (saved by Keras 3.5.0) cannot be loaded by Keras 3.12 because the
nested Functional block stores `input_layers`/`output_layers` as a single-element
list, which deserializes to a list-wrapped tensor and makes the following Dense
layer receive `[(None, 1536)]` instead of `(None, 1536)`.

This script applies that minimal structural fix in memory, rebuilds the model from
the stored config, re-assigns every weight matched *by name* against the original
file, verifies the match, and writes `backend/models/plant_disease_model.keras`.

Usage (from the repository root):

    python backend/tools/convert_legacy_h5.py

The source `.h5` is a research reference and is never modified or committed.
"""

import json
import sys
from pathlib import Path

import h5py
import keras
import numpy as np
from keras.src.legacy.saving import saving_utils

# backend/tools/ -> backend/ -> repository root
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "Plant_Village_Detection_Model.h5"
OUT_DIR = ROOT / "backend" / "models"
OUT = OUT_DIR / "plant_disease_model.keras"


def unwrap_single_ref(node):
    """[[name, i, j]] -> [name, i, j] so map_tensors() returns a bare tensor."""
    if (
        isinstance(node, list)
        and len(node) == 1
        and isinstance(node[0], list)
        and len(node[0]) == 3
        and isinstance(node[0][0], str)
    ):
        return node[0]
    return node


def patch_config(cfg):
    """Recursively unwrap single input/output layer references."""
    changed = 0

    def walk(obj):
        nonlocal changed
        if isinstance(obj, dict):
            for key in ("input_layers", "output_layers"):
                if key in obj:
                    new = unwrap_single_ref(obj[key])
                    if new is not obj[key]:
                        changed += 1
                        obj[key] = new
            for value in obj.values():
                walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)

    walk(cfg)
    return cfg, changed


def collect_model_weights(model):
    """Flatten model weights to `{layer/weight}` keys, recursing into sub-models."""
    out = {}

    def add(prefix, layer):
        if hasattr(layer, "layers") and layer is not model:
            for sub in layer.layers:
                add(f"{prefix}{layer.name}/", sub)
        else:
            for w in layer.weights:
                out[f"{prefix}{layer.name}/{w.name}"] = w

    for layer in model.layers:
        add("", layer)
    return out


def collect_file_weights(path, model_name):
    """Flatten every dataset under model_weights/ to `{layer/weight}` keys.

    Top-level layer groups store weight names as `{model_name}/{layer}/{weight}`,
    nested model groups store them relative to the group (`{layer}/{weight}`).
    """
    out = {}
    with h5py.File(path, "r") as f:
        root = f["model_weights"]
        layer_groups = [
            k for k in root.keys() if isinstance(root[k], h5py.Group)
        ]
        for group_name in layer_groups:
            group = root[group_name]
            names = [
                n.decode() if isinstance(n, bytes) else n
                for n in group.attrs.get("weight_names", [])
            ]
            for name in names:
                key_name = name
                for prefix in (f"{model_name}/{group_name}/", f"{group_name}/"):
                    if key_name.startswith(prefix):
                        key_name = key_name[len(prefix):]
                        break
                out[f"{group_name}/{key_name}"] = np.asarray(group[name][()])
    return out


def main():
    if not SRC.exists():
        sys.exit(f"FAIL: source model not found: {SRC}")

    with h5py.File(SRC, "r") as f:
        raw = f.attrs["model_config"]
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8")
        cfg = json.loads(raw)

    cfg, changed = patch_config(cfg)
    print(f"patched {changed} single-output/input reference(s)")

    model = saving_utils.model_from_config(cfg)
    print(f"rebuilt model: input={model.input_shape} output={model.output_shape}")
    if model.output_shape[-1] != 38:
        sys.exit(f"FAIL: expected 38 outputs, got {model.output_shape}")

    model_w = collect_model_weights(model)
    file_w = collect_file_weights(SRC, cfg["config"]["name"])
    print(f"model weights: {len(model_w)}  file weights: {len(file_w)}")

    missing = sorted(set(file_w) - set(model_w))
    extra = sorted(set(model_w) - set(file_w))
    if missing or extra:
        print("MISSING in model:", missing[:10])
        print("EXTRA in model:", extra[:10])
        sys.exit("FAIL: weight key mismatch")

    for key, arr in file_w.items():
        w = model_w[key]
        if tuple(w.shape) != tuple(arr.shape):
            sys.exit(f"FAIL: shape mismatch for {key}: {w.shape} vs {arr.shape}")
        w.assign(arr.astype(w.dtype))

    # independent value verification after assignment
    bad = [
        key
        for key, w in model_w.items()
        if not np.allclose(np.asarray(w), file_w[key], rtol=0, atol=0)
    ]
    if bad:
        sys.exit(f"FAIL: {len(bad)} weights differ after assignment, e.g. {bad[:5]}")
    print("all weights matched by name, shape and exact value")

    # structural facts needed for the preprocessing contract
    inner = model.get_layer("efficientnetb3")
    rescale = [layer for layer in inner.layers if type(layer).__name__ == "Rescaling"]
    print(
        "internal rescaling layers:",
        [(layer.name, layer.get_config().get("scale")) for layer in rescale],
    )

    x = np.random.default_rng(0).integers(0, 256, (224, 224, 3)).astype("float32") / 255.0
    probs = model.predict(np.expand_dims(x, 0), verbose=0)
    print(
        f"smoke predict: shape={probs.shape} sum={probs.sum():.4f} "
        f"max={probs.max():.4f} argmax={int(np.argmax(probs))}"
    )
    if probs.shape != (1, 38) or not np.isclose(probs.sum(), 1.0, atol=1e-4):
        sys.exit("FAIL: smoke prediction invalid")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    model.save(OUT)
    print(f"saved {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")

    # reload check
    reloaded = keras.models.load_model(OUT, compile=False)
    ok = all(
        np.allclose(np.asarray(a), np.asarray(b), rtol=0, atol=0)
        for a, b in zip(model.weights, reloaded.weights, strict=False)
    )
    print("reload round-trip identical:", ok)
    if not ok:
        sys.exit("FAIL: reload mismatch")
    print("CONVERSION OK")


if __name__ == "__main__":
    main()
