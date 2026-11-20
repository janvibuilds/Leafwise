"""Current-user profile route."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.schemas.profile import ProfileResponse

router = APIRouter(prefix="/api/v1", tags=["profile"])


@router.get("/me", response_model=ProfileResponse)
def me(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ProfileResponse:
    """Identity of the caller from the verified access token."""
    return ProfileResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
    )
