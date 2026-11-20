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


def auth_header(settings, sub: str = "user-1", **kwargs) -> dict[str, str]:
    """Authorization header with a valid token for ``settings``' JWT secret."""
    token = make_token(settings.supabase_jwt_secret, sub=sub, **kwargs)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# In-memory service doubles
# ---------------------------------------------------------------------------
# app.services.* is imported lazily so this module still imports cleanly while
# Task 4 modules are being written (red phase).


class InMemoryPredictionRepository:
    def __init__(self) -> None:
        self.rows: dict[str, dict] = {}

    def insert(self, row: dict):
        from app.services.prediction_service import PredictionRecord

        self.rows[row["id"]] = dict(row)
        return PredictionRecord.from_row(row)

    def list_for_user(self, user_id: str, limit: int, offset: int) -> list:
        from app.services.prediction_service import PredictionRecord

        rows = [r for r in self.rows.values() if r["user_id"] == user_id]
        rows.sort(key=lambda r: r["created_at"], reverse=True)
        return [PredictionRecord.from_row(r) for r in rows[offset : offset + limit]]

    def get_for_user(self, user_id: str, prediction_id: str):
        from app.services.prediction_service import PredictionRecord

        row = self.rows.get(prediction_id)
        if row is None or row["user_id"] != user_id:
            return None
        return PredictionRecord.from_row(row)

    def delete_for_user(self, user_id: str, prediction_id: str) -> bool:
        row = self.rows.get(prediction_id)
        if row is None or row["user_id"] != user_id:
            return False
        del self.rows[prediction_id]
        return True


class FakeStorageService:
    def __init__(self) -> None:
        self.uploaded: dict[str, bytes] = {}
        self.deleted: list[str] = []
        self.signed_urls: list[str] = []

    def upload(self, path: str, data: bytes, content_type: str) -> None:
        if path in self.uploaded:
            raise RuntimeError(f"object already exists: {path}")
        self.uploaded[path] = data

    def delete(self, path: str) -> None:
        self.deleted.append(path)
        self.uploaded.pop(path, None)

    def create_signed_url(self, path: str, expires_in: int) -> str:
        url = f"https://storage.test/signed/{path}?ttl={expires_in}"
        self.signed_urls.append(url)
        return url


class InMemoryFeedbackRepository:
    def __init__(self) -> None:
        self.rows: dict[tuple[str, str], dict] = {}

    def insert(self, row: dict) -> dict:
        from app.errors import FeedbackConflict

        key = (row["prediction_id"], row["user_id"])
        if key in self.rows:
            raise FeedbackConflict()
        stored = {**row, "id": f"fb-{len(self.rows) + 1}"}
        self.rows[key] = stored
        return stored


class InMemoryDiseaseRepository:
    def __init__(self, rows: list[dict] | None = None) -> None:
        self.rows: list[dict] = list(rows or [])

    def list_rows(self) -> list[dict]:
        return list(self.rows)

    def get_by_id(self, disease_id: str) -> dict | None:
        return next((r for r in self.rows if r.get("id") == disease_id), None)

    def get_by_names(self, plant: str, condition: str) -> dict | None:
        return next(
            (
                r
                for r in self.rows
                if r.get("plant_name") == plant and r.get("disease_name") == condition
            ),
            None,
        )


def build_services(
    settings,
    metadata,
    predictor,
    *,
    repo=None,
    storage=None,
    disease_repo=None,
    feedback_repo=None,
):
    """Wire the real service classes around in-memory doubles."""
    from types import SimpleNamespace

    from app.services.disease_service import DiseaseService
    from app.services.feedback_service import FeedbackService
    from app.services.prediction_service import PredictionService

    repo = repo or InMemoryPredictionRepository()
    storage = storage or FakeStorageService()
    disease_repo = (
        disease_repo if disease_repo is not None else InMemoryDiseaseRepository()
    )
    feedback_repo = feedback_repo or InMemoryFeedbackRepository()
    return SimpleNamespace(
        predictor=predictor,
        repo=repo,
        storage=storage,
        disease_repo=disease_repo,
        feedback_repo=feedback_repo,
        prediction_service=PredictionService(
            repository=repo,
            storage=storage,
            predictor=predictor,
            settings=settings,
        ),
        disease_service=DiseaseService(metadata=metadata, repository=disease_repo),
        feedback_service=FeedbackService(predictions=repo, feedback=feedback_repo),
    )
