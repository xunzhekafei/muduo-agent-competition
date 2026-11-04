from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from typing import Any, Protocol


@dataclass(slots=True)
class OCRRequest:
    image: bytes
    source_name: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class OCRPage:
    page_number: int
    text: str
    confidence: float = 1.0


@dataclass(slots=True)
class OCRResult:
    text: str
    pages: list[OCRPage]
    language: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class OCRProvider(Protocol):
    def extract_text(self, request: OCRRequest) -> OCRResult:
        """Extract text from an image or scanned document."""


class MockOCRProvider:
    provider_name = "mock"

    def extract_text(self, request: OCRRequest) -> OCRResult:
        fingerprint = sha256(request.image or b"mock-ocr").hexdigest()[:12]
        label = request.source_name or f"image-{fingerprint}"
        text = f"OCR text extracted from {label}"
        return OCRResult(
            text=text,
            pages=[OCRPage(page_number=1, text=text, confidence=0.98)],
            language=request.language,
            metadata={"provider": self.provider_name, **request.metadata},
        )
