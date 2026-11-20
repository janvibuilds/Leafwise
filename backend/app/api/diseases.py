"""Disease catalog routes (public: marketing pages list supported classes)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_disease_service
from app.errors import DISEASE_NOT_FOUND, ApiError
from app.schemas.disease import DiseaseInformation, DiseaseListResponse
from app.services.disease_service import DiseaseService

router = APIRouter(prefix="/api/v1", tags=["diseases"])


@router.get("/diseases", response_model=DiseaseListResponse)
def list_diseases(
    service: Annotated[DiseaseService, Depends(get_disease_service)],
) -> DiseaseListResponse:
    """All 38 supported classes with reviewed content when seeded."""
    return service.list_diseases()


@router.get("/diseases/{disease_id}", response_model=DiseaseInformation)
def get_disease(
    disease_id: str,
    service: Annotated[DiseaseService, Depends(get_disease_service)],
) -> DiseaseInformation:
    """Detail by database id or by raw model label."""
    information = service.get_disease(disease_id)
    if information is None:
        raise ApiError(404, DISEASE_NOT_FOUND, "Disease not found.")
    return information
