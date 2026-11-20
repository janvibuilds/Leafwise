"""Shared test fixtures.

Environment defaults are set before any application import so ``Settings.from_env``
never depends on the developer's shell.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")

from app.config import Settings  # noqa: E402
from app.ml.model_metadata import load_model_metadata  # noqa: E402

# Sentinel meaning "build the real object instead of injecting a fake".
DEFAULT = object()


@pytest.fixture
def settings() -> Settings:
    return Settings(
        supabase_url="http://localhost:54321",
        supabase_service_role_key="test-service-role-key",
        supabase_jwt_secret="test-jwt-secret",
    )


@pytest.fixture
def metadata(settings: Settings):
    return load_model_metadata(settings.models_dir)


@pytest.fixture
def make_client(settings: Settings, metadata):
    """Build a TestClient. By default a FakePredictor is injected so no
    TensorFlow import happens; pass ``predictor=None`` to build the real one
    and any other object to inject a specific predictor/services."""
    from fastapi.testclient import TestClient

    from app.main import create_app
    from fakes import FakePredictor

    def _make(
        *,
        predictor=DEFAULT,
        app_settings: Settings | None = None,
        **kwargs,
    ):
        if predictor is DEFAULT:
            kwargs["predictor"] = FakePredictor(metadata)
        elif predictor is not None:
            kwargs["predictor"] = predictor
        # predictor=None -> omit, so create_app builds the real one
        return TestClient(create_app(settings=app_settings or settings, **kwargs))

    return _make
