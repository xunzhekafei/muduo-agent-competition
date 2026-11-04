from fastapi import FastAPI

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import register_middlewares
from app.core.responses import data_response


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )

    register_middlewares(app, settings)
    register_exception_handlers(app)

    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["system"])
    async def health_check():
        return data_response(
            {
                "status": "ok",
                "service": settings.app_name,
                "version": settings.app_version,
                "environment": settings.environment,
            }
        )

    return app


app = create_app()
