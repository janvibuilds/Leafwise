"""Test doubles shared across the backend test suite.

``FakePredictor`` produces the same ``PredictionResult`` shape as the real
predictor by reusing the production ``build_result`` helper, so API tests
exercise realistic data without importing TensorFlow.
"""

from __future__ import annotations

import numpy as np

from app.ml.model_metadata import ModelMetadata
from app.ml.predictor import PredictionResult, build_result


def stub_probs(
    top1: float = 0.94,
    top2: float = 0.03,
    top3: float = 0.01,
    top1_index: int = 30,
    top2_index: int = 29,
    top3_index: int = 31,
) -> np.ndarray:
    """Build a 38-class probability vector with a controlled top-3."""
    rest = 1.0 - (top1 + top2 + top3)
    probs = np.full(38, rest / 35, dtype=np.float64)
    probs[top1_index] = top1
    probs[top2_index] = top2
    probs[top3_index] = top3
    return probs


class FakePredictor:
    """Predictor test double implementing the ModelPredictor interface."""

    def __init__(
        self,
        metadata: ModelMetadata,
        probs: np.ndarray | None = None,
        error: Exception | None = None,
    ) -> None:
        self.metadata = metadata
        self.probs = probs if probs is not None else stub_probs()
        self.error = error
        self.calls: list[bytes] = []

    def predict(self, image_bytes: bytes) -> PredictionResult:
        self.calls.append(image_bytes)
        if self.error is not None:
            raise self.error
        return build_result(self.probs, self.metadata, inference_ms=1.0)


def make_token(
    secret: str,
    *,
    sub: str = "user-1",
    email: str = "user1@example.com",
    ttl_seconds: int = 3600,
    exp_in_the_past: bool = False,
    role: str = "authenticated",
    app_metadata: dict | None = None,
    user_metadata: dict | None = None,
) -> str:
    """Create a Supabase-shaped HS256 access token for auth tests."""
    import time

    import jwt

    now = int(time.time())
    payload: dict = {
        "sub": sub,
        "aud": "authenticated",
        "role": role,
        "exp": now - ttl_seconds if exp_in_the_past else now + ttl_seconds,
        "iat": now,
        "email": email,
        "app_metadata": app_metadata or {"provider": "email"},
        "user_metadata": user_metadata or {},
    }
    return jwt.encode(payload, secret, algorithm="HS256")
