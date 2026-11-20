"""Cross-user ownership isolation tests."""

from __future__ import annotations

import io

from PIL import Image

from fakes import auth_header


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (120, 90), (90, 40, 160)).save(buf, format="PNG")
    return buf.getvalue()


def create_prediction(client, settings, sub: str = "user-1") -> dict:
    response = client.post(
        "/api/v1/predictions",
        files={"file": ("leaf.png", png_bytes(), "image/png")},
        headers=auth_header(settings, sub=sub),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_user_cannot_read_another_users_prediction(make_client, settings):
    client = make_client()
    created = create_prediction(client, settings, sub="user-1")

    response = client.get(
        f"/api/v1/predictions/{created['id']}",
        headers=auth_header(settings, sub="user-2"),
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PREDICTION_NOT_FOUND"


def test_user_cannot_delete_another_users_prediction(
    make_client, settings, services
):
    client = make_client()
    created = create_prediction(client, settings, sub="user-1")

    response = client.delete(
        f"/api/v1/predictions/{created['id']}",
        headers=auth_header(settings, sub="user-2"),
    )
    assert response.status_code == 404
    # owner's record and image are untouched
    assert services.repo.get_for_user("user-1", created["id"]) is not None
    assert f"user-1/{created['id']}.png" in services.storage.uploaded


def test_user_cannot_submit_feedback_on_another_users_prediction(
    make_client, settings
):
    client = make_client()
    created = create_prediction(client, settings, sub="user-1")

    response = client.post(
        f"/api/v1/predictions/{created['id']}/feedback",
        json={"isCorrect": True},
        headers=auth_header(settings, sub="user-2"),
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PREDICTION_NOT_FOUND"


def test_history_only_contains_own_predictions(make_client, settings):
    client = make_client()
    create_prediction(client, settings, sub="user-1")
    create_prediction(client, settings, sub="user-2")

    listing = client.get(
        "/api/v1/predictions", headers=auth_header(settings, sub="user-2")
    )
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 1


def test_feedback_is_unique_per_user_and_prediction(make_client, settings):
    client = make_client()
    created = create_prediction(client, settings, sub="user-1")
    headers = auth_header(settings, sub="user-1")

    first = client.post(
        f"/api/v1/predictions/{created['id']}/feedback",
        json={"isCorrect": True, "comment": "looks right"},
        headers=headers,
    )
    assert first.status_code == 201, first.text

    duplicate = client.post(
        f"/api/v1/predictions/{created['id']}/feedback",
        json={"isCorrect": False},
        headers=headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "FEEDBACK_EXISTS"
