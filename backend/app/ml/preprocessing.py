"""Exact runtime preprocessing: EXIF -> RGB -> NEAREST 224x224 -> /255.

Replicates the training pipeline deliberately. The model applies its own
``Rescaling(1/255) -> Normalization -> Rescaling`` internally, so training used
double scaling; ``keras.applications.efficientnet.preprocess_input`` must never
be used with this model.
"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from app.ml.model_metadata import PreprocessingContract

# Content-based allowlist (validated by decoding, not by filename extension).
ALLOWED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})


class InvalidImageError(ValueError):
    """The payload is not a decodable, supported image."""


class ImageTooLargeError(ValueError):
    """The payload exceeds the configured byte or pixel limits."""


def _pillow_resample(name: str):
    if name == "NEAREST":
        return Image.Resampling.NEAREST
    raise InvalidImageError(f"unsupported resize method: {name}")


def preprocess_image(
    image_bytes: bytes,
    *,
    contract: PreprocessingContract,
    max_bytes: int,
    max_pixels: int,
) -> np.ndarray:
    """Decode and preprocess one image to a float32 (H, W, 3) array in [0, 1]."""
    if not image_bytes:
        raise InvalidImageError("empty image payload")
    if len(image_bytes) > max_bytes:
        raise ImageTooLargeError(
            f"image is {len(image_bytes)} bytes; limit is {max_bytes}"
        )

    try:
        with Image.open(io.BytesIO(image_bytes)) as opened:
            image_format = opened.format
            if image_format not in ALLOWED_FORMATS:
                raise InvalidImageError(
                    f"unsupported image format: {image_format or 'unknown'}"
                )
            # EXIF orientation correction before any pixel work (spec contract).
            image = ImageOps.exif_transpose(opened)
            image.load()
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError("image could not be decoded") from exc

    width, height = image.size
    if width * height > max_pixels:
        raise ImageTooLargeError(
            f"image is {width}x{height} ({width * height} pixels); "
            f"limit is {max_pixels}"
        )

    rgb = image.convert("RGB")
    resized = rgb.resize(contract.size, _pillow_resample(contract.resample))
    array = np.asarray(resized, dtype=np.float32) / np.float32(contract.divide_by)
    return np.clip(array, 0.0, 1.0)
