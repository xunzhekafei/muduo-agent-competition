from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, TaskAccepted
from app.schemas.enums import AiTaskStatus, AiTaskType


class AiTask(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: AiTaskType
    status: AiTaskStatus
    progress: int = Field(default=0, ge=0, le=100)
    course_id: str | None = Field(default=None, alias="courseId")
    resource_id: str | None = Field(default=None, alias="resourceId")
    input: dict[str, Any] = Field(default_factory=dict)
    output: dict[str, Any] | None = None
    error_code: str | None = Field(default=None, alias="errorCode")
    error_message: str | None = Field(default=None, alias="errorMessage")
    started_at: datetime | None = Field(default=None, alias="startedAt")
    finished_at: datetime | None = Field(default=None, alias="finishedAt")
    canceled_at: datetime | None = Field(default=None, alias="canceledAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class AiTaskCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: AiTaskType
    course_id: str | None = Field(default=None, alias="courseId")
    resource_id: str | None = Field(default=None, alias="resourceId")
    input: dict[str, Any] = Field(default_factory=dict)


class AiTaskUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: AiTaskStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    output: dict[str, Any] | None = None
    error_code: str | None = Field(default=None, alias="errorCode")
    error_message: str | None = Field(default=None, alias="errorMessage")


class OpenAiChatMessage(BaseModel):
    role: str
    content: str | list[dict[str, Any]] | None = None
    name: str | None = None


class OpenAiChatCompletionRequest(BaseModel):
    model: str
    messages: list[OpenAiChatMessage] = Field(min_length=1)
    temperature: float | None = None
    max_tokens: int | None = Field(default=None, ge=1)
    top_p: float | None = None
    stream: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


AiTaskResponse = DataResponse[AiTask]
TaskAcceptedResponse = DataResponse[TaskAccepted]
