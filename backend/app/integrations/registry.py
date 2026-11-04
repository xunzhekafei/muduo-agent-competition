from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from app.core.config import Settings, get_settings
from app.integrations.asr import ASRProvider, FunASRProvider, MockASRProvider
from app.integrations.embedding import EmbeddingProvider, MockEmbeddingProvider, ZhipuEmbeddingProvider
from app.integrations.llm import DeepSeekProvider, LLMProvider, MockLLMProvider, ZhipuProvider
from app.integrations.ocr import MockOCRProvider, OCRProvider
from app.integrations.storage import MockObjectStorageProvider, ObjectStorageProvider


SUPPORTED_LLM_PROVIDERS = {"mock", "deepseek", "zhipu"}


@dataclass(slots=True)
class IntegrationBundle:
    llm: LLMProvider
    ocr: OCRProvider
    asr: ASRProvider
    embedding: EmbeddingProvider
    object_storage: ObjectStorageProvider


def build_integrations(settings: Settings | None = None) -> IntegrationBundle:
    settings = settings or get_settings()

    # LLM provider
    llm_name = settings.llm_provider.strip().lower()
    if llm_name == "deepseek":
        llm = DeepSeekProvider()
    elif llm_name == "zhipu":
        llm = ZhipuProvider()
    elif llm_name == "mock":
        llm = MockLLMProvider()
    else:
        raise ValueError(
            f"LLM provider '{llm_name}' 不支持，可选: {', '.join(sorted(SUPPORTED_LLM_PROVIDERS))}"
        )

    _ensure_supported("OCR", settings.ocr_provider, {"mock"})
    _ensure_supported("Embedding", settings.embedding_provider, {"mock", "zhipu"})
    _ensure_supported("Object storage", settings.object_storage_provider, {"mock"})

    # ASR provider
    asr_name = settings.asr_provider.strip().lower()
    if asr_name == "funasr":
        asr = FunASRProvider()
    elif asr_name == "mock":
        asr = MockASRProvider()
    else:
        raise ValueError(f"ASR provider '{asr_name}' 不支持，可选: mock, funasr")

    embedding_name = settings.embedding_provider.strip().lower()
    if embedding_name == "zhipu":
        embedding: EmbeddingProvider = ZhipuEmbeddingProvider()
    else:
        embedding = MockEmbeddingProvider()

    return IntegrationBundle(
        llm=llm,
        ocr=MockOCRProvider(),
        asr=asr,
        embedding=embedding,
        object_storage=MockObjectStorageProvider(),
    )


def _build_llm(provider_name: str) -> LLMProvider:
    name = provider_name.strip().lower()

    if name == "deepseek":
        from app.integrations.llm import DeepSeekProvider
        return DeepSeekProvider()

    if name == "zhipu":
        from app.integrations.llm import ZhipuProvider
        return ZhipuProvider()

    if name == "mock":
        return MockLLMProvider()

    raise ValueError(
        f"LLM provider '{provider_name}' 不支持，可选: {', '.join(sorted(SUPPORTED_LLM_PROVIDERS))}"
    )


@lru_cache
def get_default_integrations() -> IntegrationBundle:
    return build_integrations()


def _ensure_supported(label: str, provider_name: str, supported: set[str]) -> None:
    if provider_name.strip().lower() not in supported:
        raise ValueError(
            f"{label} provider '{provider_name}' 不支持，可选: {', '.join(sorted(supported))}"
        )


def get_asr_provider() -> ASRProvider:
    """获取 ASR Provider（供其他模块调用）"""
    return get_default_integrations().asr


def get_storage_provider() -> ObjectStorageProvider:
    """获取存储 Provider（供其他模块调用）"""
    return get_default_integrations().object_storage


def get_llm_provider() -> LLMProvider:
    """获取 LLM Provider（供其他模块调用）"""
    return get_default_integrations().llm


def get_embedding_provider() -> EmbeddingProvider:
    """获取 Embedding Provider（供其他模块调用）"""
    return get_default_integrations().embedding
