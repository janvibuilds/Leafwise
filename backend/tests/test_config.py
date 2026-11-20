"""Settings validation tests."""

from __future__ import annotations

import pytest

from app.config import Settings, SettingsError


@pytest.fixture(autouse=True)
def supabase_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-jwt-secret")


def test_publishable_key_is_rejected_for_server_client(monkeypatch):
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_not_a_server_key")

    with pytest.raises(SettingsError, match="sb_secret"):
        Settings.from_env()


def test_secret_key_is_accepted_for_server_client(monkeypatch):
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_server_key")

    settings = Settings.from_env()

    assert settings.supabase_service_role_key == "sb_secret_server_key"
