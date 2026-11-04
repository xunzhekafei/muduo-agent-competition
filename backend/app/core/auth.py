from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode
from app.core.security import decode_access_token, normalize_datetime, utc_now
from app.db.session import get_db_session
from app.modules.auth.models import AuthSessionModel
from app.modules.users.models import UserModel
from app.schemas.enums import UserRole


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user: UserModel
    session: AuthSessionModel
    claims: dict


def get_current_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db_session),
) -> AuthContext:
    if credentials is None:
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "缺少认证凭据",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    claims = decode_access_token(credentials.credentials)
    user_id = claims.get("sub")
    session_id = claims.get("sid")
    if not isinstance(user_id, str) or not isinstance(session_id, str):
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "无效的认证凭据",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    auth_session = db.get(AuthSessionModel, session_id)
    user = db.get(UserModel, user_id)
    if user is None or user.deleted_at is not None:
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "当前用户不存在或已停用",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if auth_session is None or auth_session.user_id != user.id:
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "认证会话不存在",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if auth_session.revoked_at is not None:
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "认证会话已失效",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if normalize_datetime(auth_session.expires_at) <= utc_now():
        raise AppError(
            ErrorCode.TOKEN_EXPIRED,
            "认证会话已过期",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return AuthContext(user=user, session=auth_session, claims=claims)


def get_current_user(context: AuthContext = Depends(get_current_auth_context)) -> UserModel:
    return context.user


def require_roles(*roles: UserRole):
    def dependency(user: UserModel = Depends(get_current_user)) -> UserModel:
        if user.role not in roles:
            raise AppError(
                ErrorCode.FORBIDDEN,
                "当前用户没有访问权限",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return user

    return dependency
