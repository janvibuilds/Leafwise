"""Current-user profile response model."""

from __future__ import annotations

from app.schemas.prediction import CamelModel


class ProfileResponse(CamelModel):
    id: str
    email: str | None
    role: str
    full_name: str | None
