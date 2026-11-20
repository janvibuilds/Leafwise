"""Authentication tests: Bearer token verification for protected routes."""

from __future__ import annotations

from fakes import auth_header, make_token


def test_missing_bearer_token_returns_401(make_client):
    client = make_client()
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_malformed_authorization_header_returns_401(make_client, settings):
    client = make_client()
    response = client.get(
        "/api/v1/me", headers={"Authorization": "Token abc"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_invalid_token_returns_401(make_client):
    client = make_client()
    response = client.get(
        "/api/v1/me", headers={"Authorization": "Bearer not-a-token"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_token_signed_with_wrong_secret_returns_401(make_client, settings):
    client = make_client()
    token = make_token("some-other-secret-0123456789-abcdefgh")
    response = client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


def test_expired_token_returns_401(make_client, settings):
    client = make_client()
    token = make_token(settings.supabase_jwt_secret, exp_in_the_past=True)
    response = client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_valid_token_returns_profile(make_client, settings):
    client = make_client()
    headers = auth_header(
        settings,
        sub="user-42",
        email="u42@example.com",
        app_metadata={"role": "researcher"},
        user_metadata={"full_name": "U42"},
    )
    response = client.get("/api/v1/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "user-42"
    assert body["email"] == "u42@example.com"
    assert body["role"] == "researcher"
    assert body["fullName"] == "U42"


def test_prediction_routes_require_auth(make_client):
    client = make_client()
    assert client.get("/api/v1/predictions").status_code == 401
    assert client.post("/api/v1/predictions").status_code == 401
    assert client.delete("/api/v1/predictions/anything").status_code == 401


def test_disease_catalog_is_public(make_client):
    # marketing pages list supported classes without a session
    client = make_client()
    assert client.get("/api/v1/diseases").status_code == 200
