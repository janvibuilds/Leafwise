"""Request dependencies: settings, services, and Bearer-token auth."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Header, Request

from app.config import Settings
from app.errors import (
    SERVICE_UNAVAILABLE,
    UNAUTHENTICATED,
    ApiError,
)


@dataclass(frozen=True)
class CurrentUser:
    """Identity extracted from a verified Supabase access token."""

    id: str
    email: str | None
    role: str
    full_name: str | None


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

    Supabase access tokens are HS256-signed with the project JWT secret, so
    verification is a local decode (no network call) and fails closed.
    """
    settings = get_settings(request)
    if not authorization:
        raise ApiError(401, UNAUTHENTICATED, "Authentication required.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, UNAUTHENTICATED, "Authentication required.")

    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise ApiError(401, UNAUTHENTICATED, "Session expired.") from None
    except jwt.InvalidTokenError:
        raise ApiError(401, UNAUTHENTICATED, "Invalid session token.") from None

    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}
    return CurrentUser(
        id=claims["sub"],
        email=claims.get("email"),
        role=app_metadata.get("role") or "user",
        full_name=user_metadata.get("full_name"),
    )
