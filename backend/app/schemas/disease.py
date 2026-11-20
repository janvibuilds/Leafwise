"""Disease information and supported-class response models."""

from __future__ import annotations

from datetime import datetime

from app.schemas.prediction import CamelModel


class DiseaseInformation(CamelModel):
    id: str
    label: str  # raw model label (authoritative class identity)
    plant: str
    condition: str
    description: str | None = None
    symptoms: str | None = None
    prevention: str | None = None
    treatment_note: str | None = None
    source: str | None = None
    updated_at: datetime | None = None


class DiseaseListResponse(CamelModel):
    count: int
    diseases: list[DiseaseInformation]
