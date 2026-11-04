from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from typing import Any, Protocol


@dataclass(slots=True)
class EmbeddingRequest:
    inputs: list[str]
    model: str = ""  # 留空则使用 provider 的默认模型
    dimensions: int = 8
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class EmbeddingResult:
    model: str
    vectors: list[list[float]]
    dimensions: int
    metadata: dict[str, Any] = field(default_factory=dict)


class EmbeddingProvider(Protocol):
    def embed(self, request: EmbeddingRequest) -> EmbeddingResult:
        """Embed one or more text inputs into dense vectors."""


class MockEmbeddingProvider:
    provider_name = "mock"

    def embed(self, request: EmbeddingRequest) -> EmbeddingResult:
        dimensions = max(1, request.dimensions)
        model = request.model or "mock-embedding-1"
        return EmbeddingResult(
            model=model,
            vectors=[
                _deterministic_vector(text=text, model=model, dimensions=dimensions)
                for text in request.inputs
            ],
            dimensions=dimensions,
            metadata={"provider": self.provider_name, **request.metadata},
        )


class ZhipuEmbeddingProvider:
    """智谱 GLM 向量化（open.bigmodel.cn），默认 embedding-3。"""

    provider_name = "zhipu"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://open.bigmodel.cn/api/paas/v4",
        model: str = "embedding-3",
    ) -> None:
        import os

        self._api_key = api_key or os.environ.get("ZHIPU_API_KEY")
        if not self._api_key:
            raise RuntimeError("ZHIPU_API_KEY 环境变量未设置，请在 .env 中添加")
        self._base_url = base_url
        self._model = model

    def embed(self, request: EmbeddingRequest) -> EmbeddingResult:
        import json
        import urllib.error
        import urllib.request

        body = {"model": request.model or self._model, "input": request.inputs}
        data = json.dumps(body).encode("utf-8")
        http_request = urllib.request.Request(
            f"{self._base_url}/embeddings", data=data, method="POST"
        )
        http_request.add_header("Authorization", f"Bearer {self._api_key}")
        http_request.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(http_request, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8") if exc.fp else str(exc)
            raise RuntimeError(f"Zhipu embedding error {exc.code}: {error_body}") from exc

        items = sorted(result.get("data", []), key=lambda item: item.get("index", 0))
        vectors = [item["embedding"] for item in items]
        return EmbeddingResult(
            model=result.get("model", self._model),
            vectors=vectors,
            dimensions=len(vectors[0]) if vectors else 0,
            metadata={"provider": self.provider_name, **request.metadata},
        )


def _deterministic_vector(*, text: str, model: str, dimensions: int) -> list[float]:
    seed = f"{model}:{text}".encode("utf-8")
    digest = sha256(seed).digest()
    values: list[float] = []
    while len(values) < dimensions:
        values.extend(round(byte / 255, 6) for byte in digest)
        digest = sha256(digest).digest()
    return values[:dimensions]
