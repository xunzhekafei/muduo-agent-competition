from fastapi import APIRouter

from app.core.config import get_settings
from app.core.responses import data_response

system_router = APIRouter(tags=["system"])


@system_router.get("/health")
async def health_check():
    settings = get_settings()
    return data_response(
        {
            "status": "ok",
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
        }
    )


@system_router.get("/capabilities")
async def capabilities():
    """报告各项 AI 能力当前使用的是真实 provider 还是 mock，供前端优雅降级。"""
    settings = get_settings()

    def status(name: str) -> dict:
        provider = getattr(settings, name).strip().lower()
        return {"provider": provider, "live": provider not in {"", "mock"}}

    return data_response(
        {
            "llm": status("llm_provider"),
            "embedding": status("embedding_provider"),
            "ocr": status("ocr_provider"),
            "asr": status("asr_provider"),
            "storage": status("object_storage_provider"),
        }
    )

