from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.users.models import UserModel
from app.modules.users.service import UserService, to_user_schema
from app.schemas.users import UserPreferencesUpdateRequest, UserUpdateRequest


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_current_user_profile(
    current_user: UserModel = Depends(get_current_user),
):
    return data_response(to_user_schema(current_user).model_dump(by_alias=True))


@router.patch("/me")
async def update_current_user_profile(
    request: UserUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    user = UserService(db).update_user(current_user, request)
    return data_response(user.model_dump(by_alias=True))


@router.get("/me/preferences")
async def get_current_user_preferences(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    preferences = UserService(db).get_preferences(current_user)
    return data_response(preferences.model_dump(by_alias=True))


@router.patch("/me/preferences")
async def update_current_user_preferences(
    request: UserPreferencesUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    preferences = UserService(db).update_preferences(current_user, request)
    return data_response(preferences.model_dump(by_alias=True))
