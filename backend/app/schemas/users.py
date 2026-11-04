from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.enums import AiGuidanceLevel, ThemePreference, UserRole


class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    email: str
    avatar_url: str | None = Field(default=None, alias="avatarUrl")
    role: UserRole
    created_at: datetime = Field(alias="createdAt")


class UserUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    avatar_url: str | None = Field(default=None, alias="avatarUrl")


class UserPreferences(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    theme: ThemePreference = ThemePreference.SYSTEM
    language: str = "zh-CN"
    daily_review_reminder: bool = Field(default=True, alias="dailyReviewReminder")
    reminder_time: str | None = Field(default=None, alias="reminderTime")
    ai_guidance_level: AiGuidanceLevel = Field(
        default=AiGuidanceLevel.BALANCED,
        alias="aiGuidanceLevel",
    )


class UserPreferencesUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    theme: ThemePreference | None = None
    language: str | None = None
    daily_review_reminder: bool | None = Field(default=None, alias="dailyReviewReminder")
    reminder_time: str | None = Field(default=None, alias="reminderTime")
    ai_guidance_level: AiGuidanceLevel | None = Field(default=None, alias="aiGuidanceLevel")


UserResponse = DataResponse[User]
UserPreferencesResponse = DataResponse[UserPreferences]
