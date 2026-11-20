"""Health and readiness endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_liveness_does_not_require_auth(make_client):
    client = make_client()
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/live").json() == {"status": "live"}
    # spec alias
    assert client.get("/health").status_code == 200


def test_readiness_reports_model_version(make_client, metadata):
    client = make_client()
    response = client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["modelVersion"] == metadata.model_version


def test_readiness_fails_when_model_assets_missing(settings, tmp_path):
    empty_settings = settings.model_copy(update={"models_dir": tmp_path})
    app = create_app(settings=empty_settings)
    client = TestClient(app)

    response = client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["detail"]  # a safe reason, not a stack trace
    # liveness must stay green even when the model is unavailable
    assert client.get("/health/live").status_code == 200


def test_settings_defaults(settings: Settings):
    assert settings.max_upload_bytes > 0
    assert settings.max_image_pixels > 0
    assert settings.prediction_bucket == "prediction-images"
    assert settings.models_dir.name == "models"
