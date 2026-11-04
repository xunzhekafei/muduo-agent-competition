from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


DataT = TypeVar("DataT")


class DataResponse(BaseModel, Generic[DataT]):
    data: DataT


class EmptyDataResponse(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class Pagination(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    page: int = Field(ge=1)
    page_size: int = Field(alias="pageSize", ge=1, le=100)
    total: int = Field(ge=0)


class ListResponse(BaseModel, Generic[DataT]):
    data: list[DataT]
    pagination: Pagination


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorBody


class TaskAccepted(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    status: str
