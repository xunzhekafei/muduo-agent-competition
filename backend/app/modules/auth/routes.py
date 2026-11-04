from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_current_auth_context
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.auth.service import AuthService
from app.schemas.auth import LoginRequest, RefreshTokenRequest
from app.schemas.common import EmptyDataResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    request: LoginRequest,
    http_request: Request,
    db: Session = Depends(get_db_session),
):
    auth_session = AuthService(db).login(
        request,
        user_agent=http_request.headers.get("user-agent"),
        ip_address=http_request.client.host if http_request.client else None,
    )
    return data_response(auth_session.model_dump(by_alias=True))


@router.post("/refresh")
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db_session),
):
    auth_session = AuthService(db).refresh(request.refresh_token)
    return data_response(auth_session.model_dump(by_alias=True))


@router.post("/logout")
async def logout(
    context: AuthContext = Depends(get_current_auth_context),
    db: Session = Depends(get_db_session),
):
    AuthService(db).logout(context.session)
    return EmptyDataResponse().model_dump()
