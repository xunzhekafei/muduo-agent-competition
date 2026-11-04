from __future__ import annotations

from datetime import timedelta

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import AppError, ErrorCode
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    normalize_datetime,
    utc_now,
    verify_password,
)
from app.modules.auth.models import AuthSessionModel
from app.modules.users.models import UserModel, UserPreferenceModel
from app.modules.users.service import to_user_schema
from app.schemas.auth import AuthSession, LoginRequest
from app.schemas.enums import UserRole


class AuthService:
    def __init__(self, db: Session, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    def login(
        self,
        request: LoginRequest,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthSession:
        email = normalize_email(request.email)
        self._ensure_development_user(email, request.password)

        user = self._get_active_user_by_email(email)
        if user is None or not verify_password(request.password, user.password_hash):
            raise AppError(
                ErrorCode.INVALID_CREDENTIALS,
                "邮箱或密码错误",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        return self._create_session_response(
            user,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    def refresh(self, refresh_token: str) -> AuthSession:
        token_hash = hash_token(refresh_token)
        auth_session = self.db.execute(
            select(AuthSessionModel).where(AuthSessionModel.refresh_token_hash == token_hash)
        ).scalar_one_or_none()

        if auth_session is None or auth_session.revoked_at is not None:
            raise AppError(
                ErrorCode.UNAUTHORIZED,
                "refresh token 无效",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if normalize_datetime(auth_session.expires_at) <= utc_now():
            raise AppError(
                ErrorCode.TOKEN_EXPIRED,
                "refresh token 已过期",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        user = self.db.get(UserModel, auth_session.user_id)
        if user is None or user.deleted_at is not None:
            raise AppError(
                ErrorCode.UNAUTHORIZED,
                "当前用户不存在或已停用",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        return self._rotate_session_response(auth_session, user)

    def logout(self, auth_session: AuthSessionModel) -> None:
        auth_session = self.db.merge(auth_session)
        auth_session.revoked_at = utc_now()
        self.db.add(auth_session)
        self.db.commit()

    def _create_session_response(
        self,
        user: UserModel,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthSession:
        raw_refresh_token = create_refresh_token()
        auth_session = AuthSessionModel(
            user_id=user.id,
            refresh_token_hash=hash_token(raw_refresh_token),
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=utc_now() + timedelta(days=self.settings.refresh_token_expires_days),
        )
        self.db.add(auth_session)
        self.db.flush()

        access_token = create_access_token(
            subject=user.id,
            session_id=auth_session.id,
            settings=self.settings,
        )
        self.db.commit()
        self.db.refresh(auth_session)
        self.db.refresh(user)

        return AuthSession(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            expires_in=self.settings.access_token_expires_minutes * 60,
            user=to_user_schema(user),
        )

    def _rotate_session_response(
        self,
        auth_session: AuthSessionModel,
        user: UserModel,
    ) -> AuthSession:
        raw_refresh_token = create_refresh_token()
        auth_session.refresh_token_hash = hash_token(raw_refresh_token)
        auth_session.expires_at = utc_now() + timedelta(days=self.settings.refresh_token_expires_days)
        self.db.add(auth_session)
        self.db.flush()

        access_token = create_access_token(
            subject=user.id,
            session_id=auth_session.id,
            settings=self.settings,
        )
        self.db.commit()
        self.db.refresh(auth_session)
        self.db.refresh(user)

        return AuthSession(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            expires_in=self.settings.access_token_expires_minutes * 60,
            user=to_user_schema(user),
        )

    def _get_active_user_by_email(self, email: str) -> UserModel | None:
        return self.db.execute(
            select(UserModel).where(UserModel.email == email, UserModel.deleted_at.is_(None))
        ).scalar_one_or_none()

    def _ensure_development_user(self, email: str, password: str) -> None:
        if self.settings.environment != "development":
            return
        if email != normalize_email(self.settings.dev_user_email):
            return
        if password != self.settings.dev_user_password:
            return
        if self._get_active_user_by_email(email) is not None:
            return

        user = UserModel(
            name=self.settings.dev_user_name,
            email=email,
            role=UserRole.STUDENT,
            password_hash=hash_password(password),
        )
        user.preferences = UserPreferenceModel()
        self.db.add(user)
        self.db.commit()


def normalize_email(email: str) -> str:
    return email.strip().lower()
