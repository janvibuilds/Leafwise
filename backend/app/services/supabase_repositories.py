"""Supabase/PostgREST-backed repository implementations.

The FastAPI service role bypasses RLS, so every query is filtered by
``user_id`` explicitly — ownership is enforced in code, not by policy alone
(spec §11.2). These classes are exercised against a live project in the
integration profile; unit tests use the in-memory doubles in tests/fakes.py.
"""

from __future__ import annotations

import logging

from app.errors import FeedbackConflict
from app.services.prediction_service import PredictionRecord

logger = logging.getLogger("app.services.supabase")


def create_supabase_client(url: str, service_role_key: str):
    """Create the server-side supabase client (service-role key)."""
    from supabase import create_client

    return create_client(url, service_role_key)


def _data(response) -> list[dict]:
    return list(response.data or [])


class SupabasePredictionRepository:
    def __init__(self, client) -> None:
        self._table = client.table("predictions")

    def insert(self, row: dict) -> PredictionRecord:
        response = self._table.insert(row).execute()
        rows = _data(response)
        if not rows:
            raise RuntimeError("prediction insert returned no row")
        return PredictionRecord.from_row(rows[0])

    def list_for_user(
        self, user_id: str, limit: int, offset: int
    ) -> list[PredictionRecord]:
        response = (
            self._table.select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [PredictionRecord.from_row(r) for r in _data(response)]

    def get_for_user(
        self, user_id: str, prediction_id: str
    ) -> PredictionRecord | None:
        response = (
            self._table.select("*")
            .eq("id", prediction_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = _data(response)
        return PredictionRecord.from_row(rows[0]) if rows else None

    def delete_for_user(self, user_id: str, prediction_id: str) -> bool:
        response = (
            self._table.delete()
            .eq("id", prediction_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(_data(response))


class SupabaseDiseaseRepository:
    def __init__(self, client) -> None:
        self._table = client.table("disease_information")

    def list_rows(self) -> list[dict]:
        response = self._table.select("*").execute()
        return _data(response)

    def get_by_id(self, disease_id: str) -> dict | None:
        response = (
            self._table.select("*").eq("id", disease_id).limit(1).execute()
        )
        rows = _data(response)
        return rows[0] if rows else None

    def get_by_names(self, plant: str, condition: str) -> dict | None:
        response = (
            self._table.select("*")
            .eq("plant_name", plant)
            .eq("disease_name", condition)
            .limit(1)
            .execute()
        )
        rows = _data(response)
        return rows[0] if rows else None


class SupabaseFeedbackRepository:
    def __init__(self, client) -> None:
        self._table = client.table("prediction_feedback")

    def insert(self, row: dict) -> dict:
        try:
            response = self._table.insert(row).execute()
        except Exception as exc:
            # unique (prediction_id, user_id) violation surfaces from Postgres
            if "23505" in str(exc) or "duplicate key" in str(exc).lower():
                raise FeedbackConflict() from exc
            raise
        rows = _data(response)
        if not rows:
            raise RuntimeError("feedback insert returned no row")
        return rows[0]
