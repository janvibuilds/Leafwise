"""Prediction API tests: upload validation, persistence, history, delete."""

from __future__ import annotations

import io

from PIL import Image

from app.ml.predictor import ModelUnavailableError
from fakes import FakePredictor, auth_header, stub_probs


def png_bytes(width: int = 300, height: int = 200) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (40, 150, 40)).save(buf, format="PNG")
    return buf.getvalue()


def upload(client, settings, data: bytes, content_type: str, sub: str = "user-1"):
    return client.post(
        "/api/v1/predictions",
        files={"file": ("leaf.png", data, content_type)},
        headers=auth_header(settings, sub=sub),
    )


def test_prediction_upload_rejects_non_image(make_client, settings):
    client = make_client()
    response = upload(client, settings, b"hello world", "text/plain")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_IMAGE"


def test_prediction_upload_rejects_decodable_but_unsupported_format(
    make_client, settings
):
    client = make_client()
    buf = io.BytesIO()
    Image.new("RGB", (32, 32)).save(buf, format="GIF")
    response = upload(client, settings, buf.getvalue(), "image/gif")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_IMAGE"


def test_prediction_upload_rejects_oversized_file(make_client, settings):
    client = make_client()
    big = b"x" * (settings.max_upload_bytes + 1)
    response = upload(client, settings, big, "image/png")
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "IMAGE_TOO_LARGE"


def test_prediction_is_persisted_with_authenticated_user_id(
    make_client, settings, services, metadata
):
    client = make_client()
    response = upload(client, settings, png_bytes(), "image/png")
    assert response.status_code == 201, response.text

    body = response.json()
    assert body["plant"] == "Tomato"
    assert body["condition"] == "Late blight"
    assert body["confidenceState"] == "high"
    assert body["modelVersion"] == metadata.model_version
    assert len(body["topPredictions"]) == 3
    scores = [t["score"] for t in body["topPredictions"]]
    assert scores == sorted(scores, reverse=True)
    assert body["createdAt"]

    # persisted under the authenticated user, not whoever the client claims
    record = services.repo.get_for_user("user-1", body["id"])
    assert record is not None
    assert record.user_id == "user-1"
    assert record.confidence_state == "high"

    # private, user-scoped storage path
    expected_path = f"user-1/{body['id']}.png"
    assert record.image_path == expected_path
    assert expected_path in services.storage.uploaded


def test_low_confidence_result_is_persisted_as_uncertain(
    make_client, settings, metadata, services
):
    client = make_client(
        predictor=FakePredictor(
            metadata, probs=stub_probs(top1=0.55, top2=0.25, top3=0.10)
        )
    )
    response = upload(client, settings, png_bytes(), "image/png")
    assert response.status_code == 201
    body = response.json()
    assert body["confidenceState"] == "uncertain"

    record = services.repo.get_for_user("user-1", body["id"])
    assert record is not None
    assert record.confidence_state == "uncertain"


def test_model_failure_returns_safe_error(make_client, settings, metadata, services):
    from fakes import build_services

    failing = build_services(
        settings,
        metadata,
        FakePredictor(metadata, error=ModelUnavailableError("boom")),
        repo=services.repo,
        storage=services.storage,
    )
    client = make_client(services_ns=failing)
    response = upload(client, settings, png_bytes(), "image/png")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MODEL_UNAVAILABLE"
    # nothing persisted, nothing uploaded
    assert services.repo.rows == {}
    assert services.storage.uploaded == {}


def test_list_detail_and_signed_url(make_client, settings, services):
    client = make_client()
    created = upload(client, settings, png_bytes(), "image/png").json()
    prediction_id = created["id"]

    listing = client.get(
        "/api/v1/predictions", headers=auth_header(settings)
    )
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 1
    assert items[0]["id"] == prediction_id
    assert "topPredictions" not in items[0]

    detail = client.get(
        f"/api/v1/predictions/{prediction_id}", headers=auth_header(settings)
    )
    assert detail.status_code == 200
    assert detail.json()["id"] == prediction_id
    assert detail.json()["imageUrl"] is None

    with_image = client.get(
        f"/api/v1/predictions/{prediction_id}?include_image=true",
        headers=auth_header(settings),
    )
    assert with_image.status_code == 200
    assert "signed" in with_image.json()["imageUrl"]


def test_delete_removes_record_and_private_image(
    make_client, settings, services
):
    client = make_client()
    created = upload(client, settings, png_bytes(), "image/png").json()
    prediction_id = created["id"]
    path = f"user-1/{prediction_id}.png"
    assert path in services.storage.uploaded

    response = client.delete(
        f"/api/v1/predictions/{prediction_id}", headers=auth_header(settings)
    )
    assert response.status_code == 204
    assert services.repo.get_for_user("user-1", prediction_id) is None
    assert path in services.storage.deleted
    assert path not in services.storage.uploaded


def test_delete_unknown_prediction_returns_404(make_client, settings):
    client = make_client()
    response = client.delete(
        "/api/v1/predictions/00000000-0000-0000-0000-000000000000",
        headers=auth_header(settings),
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PREDICTION_NOT_FOUND"
