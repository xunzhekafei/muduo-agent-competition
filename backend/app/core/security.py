from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import status

from app.core.config import Settings, get_settings
from app.core.errors import AppError, ErrorCode


PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 390_000
TOKEN_ALGORITHM = "HS256"


def hash_password(password: str, *, salt: str | None = None) -> str:
    active_salt = salt or secrets.token_urlsafe(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        active_salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    )
    encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${active_salt}${encoded_digest}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False

    try:
        algorithm, iterations, salt, expected_digest = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != PASSWORD_ALGORITHM:
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    )
    encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return hmac.compare_digest(encoded_digest, expected_digest)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    *,
    subject: str,
    session_id: str,
    settings: Settings | None = None,
    now: datetime | None = None,
) -> str:
    active_settings = settings or get_settings()
    issued_at = now or utc_now()
    expires_at = issued_at + timedelta(minutes=active_settings.access_token_expires_minutes)
    return _sign_token(
        {
            "sub": subject,
            "sid": session_id,
            "typ": "access",
            "iat": int(issued_at.timestamp()),
            "exp": int(expires_at.timestamp()),
        },
        active_settings.auth_secret_key,
    )


def decode_access_token(token: str, settings: Settings | None = None) -> dict[str, Any]:
    active_settings = settings or get_settings()
    payload = _decode_token(token, active_settings.auth_secret_key)

    if payload.get("typ") != "access":
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "无效的访问 token",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or expires_at < int(utc_now().timestamp()):
        raise AppError(
            ErrorCode.TOKEN_EXPIRED,
            "访问 token 已过期",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return payload


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _sign_token(payload: dict[str, Any], secret: str) -> str:
    header = {"alg": TOKEN_ALGORITHM, "typ": "JWT"}
    signing_input = ".".join(
        [
            _base64url_json(header),
            _base64url_json(payload),
        ]
    )
    signature = hmac.new(
        secret.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_base64url_bytes(signature)}"


def _decode_token(token: str, secret: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise_invalid_token()

    signing_input = ".".join(parts[:2])
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    actual_signature = _base64url_decode(parts[2])
    if not hmac.compare_digest(actual_signature, expected_signature):
        raise_invalid_token()

    try:
        return json.loads(_base64url_decode(parts[1]))
    except json.JSONDecodeError:
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "无效的认证凭据",
            status_code=status.HTTP_401_UNAUTHORIZED,
        ) from None


def raise_invalid_token() -> None:
    raise AppError(
        ErrorCode.UNAUTHORIZED,
        "无效的认证凭据",
        status_code=status.HTTP_401_UNAUTHORIZED,
    )


def _base64url_json(data: dict[str, Any]) -> str:
    raw = json.dumps(data, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return _base64url_bytes(raw)


def _base64url_bytes(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _base64url_decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(padded.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        raise_invalid_token()
