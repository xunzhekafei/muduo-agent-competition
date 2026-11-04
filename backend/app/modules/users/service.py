from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.users.models import UserModel, UserPreferenceModel
from app.schemas.users import (
    User,
    UserPreferences,
    UserPreferencesUpdateRequest,
    UserUpdateRequest,
)


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def update_user(self, user: UserModel, request: UserUpdateRequest) -> User:
        user = self.db.merge(user)
        changes = request.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] is not None:
            user.name = changes["name"]
        if "avatar_url" in changes:
            user.avatar_url = changes["avatar_url"]

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return to_user_schema(user)

    def get_preferences(self, user: UserModel) -> UserPreferences:
        user = self.db.merge(user)
        preferences = self.get_or_create_preferences(user)
        return to_preferences_schema(preferences)

    def update_preferences(
        self,
        user: UserModel,
        request: UserPreferencesUpdateRequest,
    ) -> UserPreferences:
        user = self.db.merge(user)
        preferences = self.get_or_create_preferences(user)
        changes = request.model_dump(exclude_unset=True)

        for field, value in changes.items():
            setattr(preferences, field, value)

        self.db.add(preferences)
        self.db.commit()
        self.db.refresh(preferences)
        return to_preferences_schema(preferences)

    def get_or_create_preferences(self, user: UserModel) -> UserPreferenceModel:
        if user.preferences is not None:
            return user.preferences

        preferences = UserPreferenceModel(user_id=user.id)
        self.db.add(preferences)
        self.db.flush()
        user.preferences = preferences
        return preferences


def to_user_schema(user: UserModel) -> User:
    return User(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        role=user.role,
        created_at=user.created_at,
    )


def to_preferences_schema(preferences: UserPreferenceModel) -> UserPreferences:
    return UserPreferences(
        theme=preferences.theme,
        language=preferences.language,
        daily_review_reminder=preferences.daily_review_reminder,
        reminder_time=preferences.reminder_time,
        ai_guidance_level=preferences.ai_guidance_level,
    )
