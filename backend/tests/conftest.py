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
os.environ.setdefault(
    "SUPABASE_JWT_SECRET", "unit-test-jwt-secret-0123456789-abcdef"
)

from app.config import Settings  # noqa: E402
from app.ml.model_metadata import load_model_metadata  # noqa: E402

# Sentinel meaning "build the real object instead of injecting a fake".
DEFAULT = object()


@pytest.fixture
def settings() -> Settings:
    return Settings(
        supabase_url="http://localhost:54321",
        supabase_service_role_key="test-service-role-key",
        supabase_jwt_secret="unit-test-jwt-secret-0123456789-abcdef",
    )


@pytest.fixture
def metadata(settings: Settings):
    return load_model_metadata(settings.models_dir)


@pytest.fixture
def services(settings: Settings, metadata):
    """In-memory service bundle (fake predictor, repos, storage)."""
    from fakes import FakePredictor, build_services

    return build_services(settings, metadata, FakePredictor(metadata))


@pytest.fixture
def make_client(settings: Settings, metadata, services):
    """Build a TestClient with in-memory services injected.

    - ``make_client()`` — fake services, no TensorFlow, no Supabase.
    - ``make_client(predictor=custom)`` — rebuilds the prediction service
      around ``custom`` while keeping the same repositories/storage.
    - ``make_client(services=False)`` — build the real services (supabase).
    """
    from fastapi.testclient import TestClient

    from app.main import create_app
    from fakes import build_services

    def _make(
        *,
        services_ns=DEFAULT,
        predictor=None,
        app_settings: Settings | None = None,
        **kwargs,
    ):
        ns = services if services_ns is DEFAULT else services_ns
        if ns is False:
            if predictor is not None:
                kwargs["predictor"] = predictor
        else:
            if predictor is not None:
                ns = build_services(
                    settings,
                    metadata,
                    predictor,
                    repo=ns.repo,
                    storage=ns.storage,
                    disease_repo=ns.disease_repo,
                    feedback_repo=ns.feedback_repo,
                )
            kwargs.update(
                predictor=ns.predictor,
                prediction_service=ns.prediction_service,
                disease_service=ns.disease_service,
                feedback_service=ns.feedback_service,
            )
        return TestClient(create_app(settings=app_settings or settings, **kwargs))

    return _make
