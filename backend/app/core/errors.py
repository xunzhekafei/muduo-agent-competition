import logging
from enum import StrEnum
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.responses import error_response

logger = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    RESOURCE_PARSE_FAILED = "RESOURCE_PARSE_FAILED"
    AI_TASK_FAILED = "AI_TASK_FAILED"
    IMPORT_EXPORT_FAILED = "IMPORT_EXPORT_FAILED"


class AppError(Exception):
    def __init__(
        self,
        code: ErrorCode | str,
        message: str,
        *,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any | None = None,
    ) -> None:
        self.code = str(code)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(
                ErrorCode.VALIDATION_ERROR,
                "请求参数校验失败",
                {"errors": exc.errors()},
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return _http_error_response(exc.status_code, exc.detail)

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(
        _: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _http_error_response(exc.status_code, exc.detail)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception while processing %s", request.url.path)
        settings = get_settings()
        details = {"exception": repr(exc)} if settings.debug else {}
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response(
                ErrorCode.INTERNAL_SERVER_ERROR,
                "服务器内部错误",
                details,
            ),
        )


def _http_error_response(status_code: int, detail: Any) -> JSONResponse:
    code = _http_status_to_error_code(status_code)
    message = detail if isinstance(detail, str) else "请求处理失败"
    details = {} if isinstance(detail, str) else {"detail": detail}
    return JSONResponse(
        status_code=status_code,
        content=error_response(code, message, details),
    )


def _http_status_to_error_code(status_code: int) -> str:
    if status_code == status.HTTP_401_UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED
    if status_code == status.HTTP_403_FORBIDDEN:
        return ErrorCode.FORBIDDEN
    if status_code == status.HTTP_404_NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND
    return "HTTP_ERROR"


# ── 共享工具函数（所有模块统一从这里导入） ──

def require_text(value: str, message: str) -> str:
    """校验非空文本，trim 后为空则抛 VALIDATION_ERROR"""
    normalized = value.strip()
    if not normalized:
        raise_validation_error(message)
    return normalized


def raise_not_found(message: str) -> None:
    """统一抛出 RESOURCE_NOT_FOUND 错误（404）"""
    raise AppError(ErrorCode.RESOURCE_NOT_FOUND, message, status_code=status.HTTP_404_NOT_FOUND)


def raise_validation_error(message: str) -> None:
    """统一抛出 VALIDATION_ERROR 错误（422）"""
    raise AppError(
        ErrorCode.VALIDATION_ERROR,
        message,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )
