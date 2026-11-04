from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol
from uuid import uuid4


@dataclass(slots=True)
class ObjectStorageUploadRequest:
    body: bytes
    key: str | None = None
    content_type: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class StoredObject:
    key: str
    url: str
    size_bytes: int
    content_type: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class ObjectStorageDownloadResult:
    object: StoredObject
    body: bytes


class ObjectStorageProvider(Protocol):
    def upload(self, request: ObjectStorageUploadRequest) -> StoredObject:
        """Store an object and return storage metadata."""

    def download(self, key: str) -> ObjectStorageDownloadResult:
        """Load an object by key."""

    def delete(self, key: str) -> None:
        """Delete an object by key."""

    def exists(self, key: str) -> bool:
        """Return whether an object key exists."""


class MockObjectStorageProvider:
    provider_name = "mock"

    def __init__(self, *, base_url: str = "mock://muduo-storage") -> None:
        self.base_url = base_url.rstrip("/")
        self._objects: dict[str, tuple[StoredObject, bytes]] = {}

    def upload(self, request: ObjectStorageUploadRequest) -> StoredObject:
        key = request.key or f"objects/{uuid4().hex}"
        stored = StoredObject(
            key=key,
            url=f"{self.base_url}/{key}",
            size_bytes=len(request.body),
            content_type=request.content_type,
            metadata={"provider": self.provider_name, **request.metadata},
        )
        self._objects[key] = (stored, bytes(request.body))
        return stored

    def download(self, key: str) -> ObjectStorageDownloadResult:
        try:
            stored, body = self._objects[key]
        except KeyError as exc:
            raise FileNotFoundError(key) from exc
        return ObjectStorageDownloadResult(object=stored, body=body)

    def delete(self, key: str) -> None:
        self._objects.pop(key, None)

    def exists(self, key: str) -> bool:
        return key in self._objects
