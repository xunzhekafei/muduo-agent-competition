import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "Muduo API"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+pysqlite:///./muduo_dev.sqlite3"
    database_echo: bool = False
    auth_secret_key: str = "muduo-dev-secret-change-me"
    access_token_expires_minutes: int = 30
    refresh_token_expires_days: int = 14
    dev_user_email: str = "dev@muduo.local"
    dev_user_password: str = "muduo123456"
    dev_user_name: str = "Muduo Dev User"
    llm_provider: str = "mock"
    ocr_provider: str = "mock"
    asr_provider: str = "mock"
    embedding_provider: str = "mock"
    object_storage_provider: str = "mock"
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )


@lru_cache
def get_settings() -> Settings:
    _load_dotenv()

    return Settings(
        app_name=_getenv("MUDUO_APP_NAME", "Muduo API"),
        app_version=_getenv("MUDUO_APP_VERSION", "0.1.0"),
        environment=_getenv("MUDUO_ENVIRONMENT", "development"),
        debug=_parse_bool(_getenv("MUDUO_DEBUG", "false")),
        log_level=_getenv("MUDUO_LOG_LEVEL", "INFO"),
        api_v1_prefix=_getenv("MUDUO_API_V1_PREFIX", "/api/v1"),
        database_url=_getenv("MUDUO_DATABASE_URL", "sqlite+pysqlite:///./muduo_dev.sqlite3"),
        database_echo=_parse_bool(_getenv("MUDUO_DATABASE_ECHO", "false")),
        auth_secret_key=_getenv("MUDUO_AUTH_SECRET_KEY", "muduo-dev-secret-change-me"),
        access_token_expires_minutes=_parse_int("MUDUO_ACCESS_TOKEN_EXPIRES_MINUTES", 30),
        refresh_token_expires_days=_parse_int("MUDUO_REFRESH_TOKEN_EXPIRES_DAYS", 14),
        dev_user_email=_getenv("MUDUO_DEV_USER_EMAIL", "dev@muduo.local"),
        dev_user_password=_getenv("MUDUO_DEV_USER_PASSWORD", "muduo123456"),
        dev_user_name=_getenv("MUDUO_DEV_USER_NAME", "Muduo Dev User"),
        llm_provider=_getenv("MUDUO_LLM_PROVIDER", "mock"),
        ocr_provider=_getenv("MUDUO_OCR_PROVIDER", "mock"),
        asr_provider=_getenv("MUDUO_ASR_PROVIDER", "mock"),
        embedding_provider=_getenv("MUDUO_EMBEDDING_PROVIDER", "mock"),
        object_storage_provider=_getenv("MUDUO_OBJECT_STORAGE_PROVIDER", "mock"),
        cors_origins=tuple(
            origin.strip()
            for origin in _getenv(
                "MUDUO_CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ),
    )


def _getenv(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_int(name: str, default: int) -> int:
    raw_value = _getenv(name, str(default))
    try:
        return int(raw_value)
    except ValueError:
        return default


def _load_dotenv() -> None:
    for path in _dotenv_candidates():
        if path.exists():
            _apply_dotenv(path)


def _dotenv_candidates() -> tuple[Path, ...]:
    cwd = Path.cwd()
    return (cwd / ".env", cwd.parent / ".env")


def _apply_dotenv(path: Path) -> None:
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
