"""Supabase asymmetric (ES256) token verification tests."""

from __future__ import annotations

import time
from types import SimpleNamespace

import jwt as pyjwt
from cryptography.hazmat.primitives.asymmetric import ec


def test_es256_token_is_verified_against_jwks(make_client, monkeypatch):
    private_key = ec.generate_private_key(ec.SECP256R1())
    now = int(time.time())
    token = pyjwt.encode(
        {
            "sub": "asymmetric-user",
            "aud": "authenticated",
            "role": "authenticated",
            "exp": now + 3600,
            "iat": now,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": "test-kid"},
    )

    fake_client = SimpleNamespace(
        get_signing_key_from_jwt=lambda _token: SimpleNamespace(
            key=private_key.public_key()
        )
    )
    monkeypatch.setattr(
        "app.dependencies._jwks_client", lambda _url: fake_client
    )

    client = make_client()
    response = client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["id"] == "asymmetric-user"


def test_unsupported_token_algorithm_is_rejected(make_client):
    token = pyjwt.encode(
        {"sub": "user", "aud": "authenticated", "exp": int(time.time()) + 3600},
        "secret",
        algorithm="HS512",
    )
    client = make_client()
    response = client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
