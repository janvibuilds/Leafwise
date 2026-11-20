"""Disease information reads: labels.json identity + reviewed DB content.

Prediction labels and content stay separate (spec §9.4): the model predicts a
class; ``disease_information`` supplies reviewed explanatory text. Nothing is
invented when the seed row is missing — content fields stay null.
"""

from __future__ import annotations

from typing import Protocol

from app.ml.model_metadata import ModelMetadata
from app.ml.predictor import split_label
from app.schemas.disease import DiseaseInformation, DiseaseListResponse


class DiseaseRepository(Protocol):
    def list_rows(self) -> list[dict]: ...

    def get_by_id(self, disease_id: str) -> dict | None: ...

    def get_by_names(self, plant: str, condition: str) -> dict | None: ...


class DiseaseService:
    def __init__(self, *, metadata: ModelMetadata, repository: DiseaseRepository) -> None:
        self._metadata = metadata
        self._repository = repository

    @staticmethod
    def _to_information(
        label: str, plant: str, condition: str, row: dict | None
    ) -> DiseaseInformation:
        row = row or {}
        return DiseaseInformation(
            id=row.get("id") or label,
            label=label,
            plant=plant,
            condition=condition,
            description=row.get("description"),
            symptoms=row.get("symptoms"),
            prevention=row.get("prevention"),
            treatment_note=row.get("treatment_note"),
            source=row.get("source"),
            updated_at=row.get("updated_at"),
        )

    def list_diseases(self) -> DiseaseListResponse:
        rows = self._repository.list_rows()
        by_names = {
            (r.get("plant_name"), r.get("disease_name")): r for r in rows
        }
        diseases = []
        for label in self._metadata.labels:
            plant, condition = split_label(label)
            diseases.append(
                self._to_information(
                    label, plant, condition, by_names.get((plant, condition))
                )
            )
        return DiseaseListResponse(count=len(diseases), diseases=diseases)

    def get_disease(self, disease_id: str) -> DiseaseInformation | None:
        # 1) the raw model label is a stable public identifier
        if disease_id in self._metadata.labels:
            plant, condition = split_label(disease_id)
            row = self._repository.get_by_names(plant, condition)
            return self._to_information(disease_id, plant, condition, row)

        # 2) a seeded database id
        row = self._repository.get_by_id(disease_id)
        if row is None:
            return None
        plant = row.get("plant_name") or ""
        condition = row.get("disease_name") or ""
        label = self._label_for_names(plant, condition) or ""
        return self._to_information(label, plant, condition, row)

    def _label_for_names(self, plant: str, condition: str) -> str | None:
        for label in self._metadata.labels:
            if split_label(label) == (plant, condition):
                return label
        return None
