"""Compatibility tests for Supabase Storage signed URL responses."""

from __future__ import annotations

import pytest

from app.services.storage_service import SupabaseStorageService


class FakeBucket:
    def __init__(self, response: dict) -> None:
        self.response = response

    def create_signed_url(self, path: str, expires_in: int) -> dict:
        assert path == "user-1/image.jpg"
        assert expires_in == 300
        return self.response


class FakeStorage:
    def __init__(self, response: dict) -> None:
        self.bucket = FakeBucket(response)

    def from_(self, name: str) -> FakeBucket:
        assert name == "prediction-images"
        return self.bucket


class FakeClient:
    def __init__(self, response: dict) -> None:
        self.storage = FakeStorage(response)


@pytest.mark.parametrize("key", ["signedURL", "signedUrl", "signed_url"])
def test_create_signed_url_accepts_sdk_and_legacy_key_shapes(key: str):
    service = SupabaseStorageService(
        FakeClient({key: "https://signed.example/image.jpg"}),
        "prediction-images",
        300,
    )

    assert (
        service.create_signed_url("user-1/image.jpg")
        == "https://signed.example/image.jpg"
    )
