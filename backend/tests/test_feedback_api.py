"""Feedback API tests (ownership and uniqueness live in test_ownership)."""

from __future__ import annotations

import io

from PIL import Image

from fakes import auth_header


def create_prediction(client, settings, sub: str = "user-1") -> dict:
    buf = io.BytesIO()
    Image.new("RGB", (80, 60), (10, 90, 120)).save(buf, format="PNG")
    response = client.post(
        "/api/v1/predictions",
        files={"file": ("leaf.png", buf.getvalue(), "image/png")},
        headers=auth_header(settings, sub=sub),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_feedback_is_persisted_with_correct_flag(
    make_client, settings, services
):
    client = make_client()
    created = create_prediction(client, settings)
    response = client.post(
        f"/api/v1/predictions/{created['id']}/feedback",
        json={"isCorrect": False, "comment": "looks like a different disease"},
        headers=auth_header(settings),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["predictionId"] == created["id"]
    assert body["isCorrect"] is False
    assert body["comment"] == "looks like a different disease"

    stored = services.feedback_repo.rows[(created["id"], "user-1")]
    assert stored["is_correct"] is False


def test_feedback_requires_is_correct_field(make_client, settings):
    client = make_client()
    created = create_prediction(client, settings)
    response = client.post(
        f"/api/v1/predictions/{created['id']}/feedback",
        json={"comment": "no flag"},
        headers=auth_header(settings),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_feedback_comment_length_is_bounded(make_client, settings):
    client = make_client()
    created = create_prediction(client, settings)
    response = client.post(
        f"/api/v1/predictions/{created['id']}/feedback",
        json={"isCorrect": True, "comment": "x" * 2001},
        headers=auth_header(settings),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
