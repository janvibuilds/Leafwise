"""Preprocessing contract tests: EXIF/RGB/NEAREST-224/÷255 and input guards."""

from __future__ import annotations

import io

import numpy as np
import pytest
from PIL import Image

from app.ml.model_metadata import DEFAULT_MODELS_DIR, load_model_metadata
from app.ml.preprocessing import ImageTooLargeError, InvalidImageError, preprocess_image

MAX_BYTES = 1_000_000
MAX_PIXELS = 10_000_000


@pytest.fixture(scope="module")
def contract():
    return load_model_metadata(DEFAULT_MODELS_DIR).preprocessing_contract


def image_bytes(
    width: int = 300,
    height: int = 200,
    color: tuple[int, int, int] = (10, 20, 30),
    fmt: str = "PNG",
) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format=fmt)
    return buf.getvalue()


def test_preprocess_returns_224_rgb_float_tensor(contract):
    out = preprocess_image(
        image_bytes(), contract=contract, max_bytes=MAX_BYTES, max_pixels=MAX_PIXELS
    )
    assert out.shape == (224, 224, 3)
    assert out.dtype == np.float32
    assert out.min() >= 0.0
    assert out.max() <= 1.0
    # solid colour survives a NEAREST resize and is scaled by exactly 1/255
    expected = np.broadcast_to(
        np.array([10, 20, 30], dtype=np.float32) / 255.0, out.shape
    )
    np.testing.assert_allclose(out, expected, atol=1e-6)


def test_corrupt_bytes_raise_invalid_image_error(contract):
    with pytest.raises(InvalidImageError):
        preprocess_image(
            b"this is not an image", contract=contract, max_bytes=MAX_BYTES, max_pixels=MAX_PIXELS
        )


def test_oversized_payload_rejected(contract):
    with pytest.raises(ImageTooLargeError):
        preprocess_image(
            image_bytes(64, 64), contract=contract, max_bytes=10, max_pixels=MAX_PIXELS
        )


def test_disallowed_format_rejected_by_content(contract):
    # decodable content, but outside the JPEG/PNG/WEBP allowlist
    with pytest.raises(InvalidImageError):
        preprocess_image(
            image_bytes(64, 64, fmt="GIF"),
            contract=contract,
            max_bytes=MAX_BYTES,
            max_pixels=MAX_PIXELS,
        )


def test_dimension_limit_enforced_before_resize(contract):
    with pytest.raises(ImageTooLargeError):
        preprocess_image(
            image_bytes(2000, 2000),
            contract=contract,
            max_bytes=MAX_BYTES,
            max_pixels=1_000_000,
        )
