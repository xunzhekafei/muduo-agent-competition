from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.enums import ExportFormat, ImportExportJobType, ImportExportStatus, ResourceType


class ImportJobCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    course_id: str = Field(alias="courseId")
    source_type: ResourceType = Field(alias="sourceType")
    source_url: str | None = Field(default=None, alias="sourceUrl")
    resource_id: str | None = Field(default=None, alias="resourceId")
    options: dict[str, Any] = Field(default_factory=dict)


class ExportJobCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    note_ids: list[str] = Field(alias="noteIds", min_length=1)
    format: ExportFormat
    options: dict[str, Any] = Field(default_factory=dict)


class ImportExportJob(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: ImportExportJobType
    status: ImportExportStatus
    course_id: str | None = Field(default=None, alias="courseId")
    source_type: ResourceType | None = Field(default=None, alias="sourceType")
    source_url: str | None = Field(default=None, alias="sourceUrl")
    resource_id: str | None = Field(default=None, alias="resourceId")
    task_id: str | None = Field(default=None, alias="taskId")
    export_format: ExportFormat | None = Field(default=None, alias="exportFormat")
    note_ids: list[str] = Field(default_factory=list, alias="noteIds")
    options: dict[str, Any] = Field(default_factory=dict)
    result_url: str | None = Field(default=None, alias="resultUrl")
    error_code: str | None = Field(default=None, alias="errorCode")
    error_message: str | None = Field(default=None, alias="errorMessage")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


ImportExportJobResponse = DataResponse[ImportExportJob]
