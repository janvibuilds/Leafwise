"""Request dependencies: settings, services, and Bearer-token auth."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Header, Request
from jwt.types import Options

from app.config import Settings
from app.errors import (
    SERVICE_UNAVAILABLE,
    UNAUTHENTICATED,
    ApiError,
)

logger = logging.getLogger("app.auth")


@dataclass(frozen=True)
class CurrentUser:
    """Identity extracted from a verified Supabase access token."""

    id: str
    email: str | None
    role: str
    full_name: str | None


# Supabase projects using asymmetric signing keys (ES256/RS256) publish a JWKS.
# Projects using the legacy JWT secret issue HS256 tokens.
_ASYMMETRIC_ALGORITHMS = frozenset(
    {"ES256", "ES384", "ES512", "RS256", "RS384", "RS512"}
)


@lru_cache(maxsize=8)
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
    )


def decode_access_token(token: str, settings: Settings) -> dict:
    """Verify a Supabase access token with the project's configured algorithm."""
    algorithm = jwt.get_unverified_header(token).get("alg")
    # iat is issued by Supabase's clock; small skew between hosts is normal.
    # exp/aud/sub are still verified.
    shared_options: Options = {"require": ["exp", "sub"], "verify_iat": False}

    if algorithm == "HS256":
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options=shared_options,
        )

    if algorithm in _ASYMMETRIC_ALGORITHMS:
        signing_key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(
            token
        )
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience="authenticated",
            options=shared_options,
        )

    raise jwt.InvalidTokenError(f"unsupported token algorithm: {algorithm}")


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def _service(request: Request, name: str):
    service = getattr(request.app.state, name, None)
    if service is None:
        raise ApiError(
            503, SERVICE_UNAVAILABLE, "This service is temporarily unavailable."
        )
    return service


def get_prediction_service(request: Request):
    return _service(request, "prediction_service")


def get_disease_service(request: Request):
    return _service(request, "disease_service")


def get_feedback_service(request: Request):
    return _service(request, "feedback_service")


def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """Verify ``Authorization: Bearer <Supabase access token>`` locally.

    Supabase projects may issue HS256 tokens (verified locally with the JWT
    secret) or asymmetric ES256/RS256 tokens (verified against the project
    JWKS, cached per URL). Both paths fail closed.
    """
    settings = get_settings(request)
    if not authorization:
        raise ApiError(401, UNAUTHENTICATED, "Authentication required.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, UNAUTHENTICATED, "Authentication required.")

    try:
        claims = decode_access_token(token, settings)
    except jwt.ExpiredSignatureError:
        raise ApiError(401, UNAUTHENTICATED, "Session expired.") from None
    except (jwt.InvalidTokenError, jwt.PyJWKClientError) as exc:
        logger.warning("rejected access token: %s", exc)
        raise ApiError(401, UNAUTHENTICATED, "Invalid session token.") from None
    except Exception as exc:  # network/DNS failures while fetching JWKS
        logger.warning("could not verify access token: %s", exc)
        raise ApiError(401, UNAUTHENTICATED, "Invalid session token.") from None

    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}
    return CurrentUser(
        id=claims["sub"],
        email=claims.get("email"),
        role=app_metadata.get("role") or "user",
        full_name=user_metadata.get("full_name"),
    )
