from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, ListResponse


class Course(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    subject: str
    description: str | None = None
    owner_id: str = Field(alias="ownerId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CourseCreateRequest(BaseModel):
    name: str
    subject: str
    description: str | None = None


class CourseUpdateRequest(BaseModel):
    name: str | None = None
    subject: str | None = None
    description: str | None = None


class LearningSpace(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    course_id: str = Field(alias="courseId")
    parent_id: str | None = Field(default=None, alias="parentId")
    name: str
    description: str | None = None
    position: int
    owner_id: str = Field(alias="ownerId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class LearningSpaceCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    parent_id: str | None = Field(default=None, alias="parentId")
    name: str
    description: str | None = None
    position: int = 0


class LearningSpaceUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    parent_id: str | None = Field(default=None, alias="parentId")
    name: str | None = None
    description: str | None = None
    position: int | None = None


CourseResponse = DataResponse[Course]
CourseListResponse = ListResponse[Course]
LearningSpaceResponse = DataResponse[LearningSpace]
LearningSpaceListResponse = ListResponse[LearningSpace]
