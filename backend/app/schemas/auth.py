from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.users import User


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refresh_token: str = Field(alias="refreshToken")


class AuthSession(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    expires_in: int = Field(alias="expiresIn")
    user: User


AuthSessionResponse = DataResponse[AuthSession]
