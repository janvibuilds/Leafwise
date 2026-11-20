"""Private Supabase Storage operations for uploaded prediction images."""

from __future__ import annotations

from typing import Protocol


class StorageClient(Protocol):
    """Subset of the supabase-py client used here (duck-typed for tests)."""

    def upload(self, path: str, file: bytes, file_options: dict | None = None): ...

    def remove(self, paths: list[str]): ...

    def create_signed_url(self, path: str, expires_in: int) -> dict: ...


class SupabaseStorageService:
    """User-scoped objects in a private bucket, viewed via signed URLs."""

    def __init__(self, client, bucket: str, signed_url_ttl_seconds: int) -> None:
        self._bucket = bucket
        self._ttl = signed_url_ttl_seconds
        self._storage = client.storage.from_(bucket)

    def upload(self, path: str, data: bytes, content_type: str) -> None:
        # path is always "{user_id}/{prediction_id}.{ext}" — user-scoped.
        self._storage.upload(
            path,
            data,
            file_options={"content-type": content_type, "x-upsert": "false"},
        )

    def delete(self, path: str) -> None:
        self._storage.remove([path])

    def create_signed_url(self, path: str, expires_in: int | None = None) -> str:
        ttl = expires_in if expires_in is not None else self._ttl
        result = self._storage.create_signed_url(path, ttl)
        # storage3 currently returns both camel-case forms; keep the snake
        # case fallback for compatible clients and test doubles.
        signed_url = (
            (result or {}).get("signedURL")
            or (result or {}).get("signedUrl")
            or (result or {}).get("signed_url")
        )
        if not signed_url:
            raise RuntimeError("supabase did not return a signed URL")
        return signed_url
