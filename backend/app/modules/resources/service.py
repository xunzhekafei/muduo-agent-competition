from __future__ import annotations

from fastapi import status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, ErrorCode, raise_not_found
from app.modules.ai_tasks.service import AiTaskService
from app.modules.courses.models import CourseModel, LearningSpaceModel
from app.modules.resources.models import (
    ParsedResourceModel,
    ResourceModel,
)
from app.schemas.common import Pagination, TaskAccepted
from app.schemas.enums import AiTaskType, ResourceStatus
from app.schemas.resources import (
    ParsedChapter,
    ParsedResource,
    Resource,
    ResourceCreateRequest,
    ResourceParseRequest,
)


class ResourceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_resources(
        self,
        *,
        owner_id: str,
        page: int,
        page_size: int,
        course_id: str | None = None,
        learning_space_id: str | None = None,
    ) -> tuple[list[Resource], Pagination]:
        base_query = select(ResourceModel).where(
            ResourceModel.owner_id == owner_id,
            ResourceModel.deleted_at.is_(None),
        )
        if course_id is not None:
            self._get_course(owner_id=owner_id, course_id=course_id)
            base_query = base_query.where(ResourceModel.course_id == course_id)
        if learning_space_id is not None:
            self._get_learning_space(
                owner_id=owner_id,
                course_id=course_id,
                learning_space_id=learning_space_id,
            )
            base_query = base_query.where(ResourceModel.learning_space_id == learning_space_id)

        total = self._count(base_query)
        resources = self.db.execute(
            base_query.order_by(ResourceModel.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars().all()
        return (
            [to_resource_schema(resource) for resource in resources],
            Pagination(page=page, page_size=page_size, total=total),
        )

    def create_resource(self, *, owner_id: str, request: ResourceCreateRequest) -> Resource:
        self._get_course(owner_id=owner_id, course_id=request.course_id)
        self._get_learning_space(
            owner_id=owner_id,
            course_id=request.course_id,
            learning_space_id=request.learning_space_id,
        )

        resource = ResourceModel(
            owner_id=owner_id,
            course_id=request.course_id,
            learning_space_id=request.learning_space_id,
            name=request.name,
            resource_type=request.type,
            status=ResourceStatus.UPLOADED,
            size_bytes=request.size_bytes,
            source_url=request.source_url,
            storage_key=request.storage_key,
        )
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)
        return to_resource_schema(resource)

    def get_resource(self, *, owner_id: str, resource_id: str) -> Resource:
        return to_resource_schema(self.get_resource_model(owner_id=owner_id, resource_id=resource_id))

    def archive_resource(self, *, owner_id: str, resource_id: str) -> None:
        resource = self.get_resource_model(owner_id=owner_id, resource_id=resource_id)
        resource.status = ResourceStatus.ARCHIVED
        resource.mark_deleted()
        self.db.add(resource)
        self.db.commit()

    def create_parse_task(
        self,
        *,
        owner_id: str,
        resource_id: str,
        request: ResourceParseRequest,
    ) -> TaskAccepted:
        resource = self.get_resource_model(owner_id=owner_id, resource_id=resource_id)
        task = AiTaskService(self.db).create_task_model(
            owner_id=owner_id,
            task_type=AiTaskType.RESOURCE_PARSE,
            course_id=resource.course_id,
            resource_id=resource.id,
            input_payload={
                "resourceId": resource.id,
                "courseId": resource.course_id,
                "learningSpaceId": resource.learning_space_id,
                "targetNoteId": request.target_note_id,
                "options": request.options,
            },
        )
        self.db.commit()
        return TaskAccepted(task_id=task.id, status=task.status)

    def get_parsed_result(self, *, owner_id: str, resource_id: str) -> ParsedResource:
        resource = self.get_resource_model(owner_id=owner_id, resource_id=resource_id)
        parsed = self.db.execute(
            select(ParsedResourceModel)
            .options(selectinload(ParsedResourceModel.chapters))
            .where(
                ParsedResourceModel.owner_id == owner_id,
                ParsedResourceModel.resource_id == resource.id,
            )
        ).scalar_one_or_none()
        if parsed is None:
            raise_not_found("资源解析结果不存在")
        return to_parsed_resource_schema(parsed)

    def get_resource_model(self, *, owner_id: str, resource_id: str) -> ResourceModel:
        resource = self.db.execute(
            select(ResourceModel).where(
                ResourceModel.id == resource_id,
                ResourceModel.owner_id == owner_id,
                ResourceModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if resource is None:
            raise_not_found("资源不存在")
        return resource

    def _get_course(self, *, owner_id: str, course_id: str) -> CourseModel:
        course = self.db.execute(
            select(CourseModel).where(
                CourseModel.id == course_id,
                CourseModel.owner_id == owner_id,
                CourseModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if course is None:
            raise_not_found("课程不存在")
        return course

    def _get_learning_space(
        self,
        *,
        owner_id: str,
        course_id: str | None,
        learning_space_id: str | None,
    ) -> LearningSpaceModel | None:
        if learning_space_id is None:
            return None
        query = select(LearningSpaceModel).where(
            LearningSpaceModel.id == learning_space_id,
            LearningSpaceModel.owner_id == owner_id,
            LearningSpaceModel.deleted_at.is_(None),
        )
        if course_id is not None:
            query = query.where(LearningSpaceModel.course_id == course_id)
        space = self.db.execute(query).scalar_one_or_none()
        if space is None:
            raise_not_found("学习空间不存在")
        return space

    def _count(self, query: Select) -> int:
        return self.db.execute(
            select(func.count()).select_from(query.order_by(None).subquery())
        ).scalar_one()


def to_resource_schema(resource: ResourceModel) -> Resource:
    return Resource(
        id=resource.id,
        course_id=resource.course_id,
        learning_space_id=resource.learning_space_id,
        name=resource.name,
        type=resource.resource_type,
        status=resource.status,
        size_bytes=resource.size_bytes,
        source_url=resource.source_url,
        storage_key=resource.storage_key,
        parse_task_id=resource.parse_task_id,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
    )


def to_parsed_resource_schema(parsed: ParsedResourceModel) -> ParsedResource:
    chapters = sorted(parsed.chapters, key=lambda chapter: chapter.position)
    return ParsedResource(
        resource_id=parsed.resource_id,
        title=parsed.title,
        chapters=[
            ParsedChapter(title=chapter.title, content=chapter.content)
            for chapter in chapters
        ],
        core_concepts=parsed.core_concepts,
        note_draft_id=parsed.note_draft_id,
    )

