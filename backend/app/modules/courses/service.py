from __future__ import annotations

from fastapi import status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode, raise_not_found
from app.modules.courses.models import CourseModel, LearningSpaceModel
from app.schemas.common import Pagination
from app.schemas.courses import (
    Course,
    CourseCreateRequest,
    CourseUpdateRequest,
    LearningSpace,
    LearningSpaceCreateRequest,
    LearningSpaceUpdateRequest,
)


class CourseService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_courses(self, *, owner_id: str, page: int, page_size: int) -> tuple[list[Course], Pagination]:
        base_query = select(CourseModel).where(
            CourseModel.owner_id == owner_id,
            CourseModel.deleted_at.is_(None),
        )
        total = self._count(base_query)
        courses = self.db.execute(
            base_query.order_by(CourseModel.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars().all()
        return (
            [to_course_schema(course) for course in courses],
            Pagination(page=page, page_size=page_size, total=total),
        )

    def create_course(self, *, owner_id: str, request: CourseCreateRequest) -> Course:
        course = CourseModel(
            owner_id=owner_id,
            name=request.name,
            subject=request.subject,
            description=request.description,
        )
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return to_course_schema(course)

    def get_course(self, *, owner_id: str, course_id: str) -> Course:
        return to_course_schema(self.get_course_model(owner_id=owner_id, course_id=course_id))

    def update_course(self, *, owner_id: str, course_id: str, request: CourseUpdateRequest) -> Course:
        course = self.get_course_model(owner_id=owner_id, course_id=course_id)
        changes = request.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(course, field, value)

        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return to_course_schema(course)

    def archive_course(self, *, owner_id: str, course_id: str) -> None:
        course = self.get_course_model(owner_id=owner_id, course_id=course_id)
        course.mark_deleted()
        self.db.add(course)
        self.db.commit()

    def list_learning_spaces(
        self,
        *,
        owner_id: str,
        course_id: str,
        page: int,
        page_size: int,
    ) -> tuple[list[LearningSpace], Pagination]:
        self.get_course_model(owner_id=owner_id, course_id=course_id)
        base_query = select(LearningSpaceModel).where(
            LearningSpaceModel.owner_id == owner_id,
            LearningSpaceModel.course_id == course_id,
            LearningSpaceModel.deleted_at.is_(None),
        )
        total = self._count(base_query)
        spaces = self.db.execute(
            base_query.order_by(LearningSpaceModel.position.asc(), LearningSpaceModel.created_at.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars().all()
        return (
            [to_learning_space_schema(space) for space in spaces],
            Pagination(page=page, page_size=page_size, total=total),
        )

    def create_learning_space(
        self,
        *,
        owner_id: str,
        course_id: str,
        request: LearningSpaceCreateRequest,
    ) -> LearningSpace:
        self.get_course_model(owner_id=owner_id, course_id=course_id)
        self._validate_parent_space(owner_id=owner_id, course_id=course_id, parent_id=request.parent_id)

        space = LearningSpaceModel(
            owner_id=owner_id,
            course_id=course_id,
            parent_id=request.parent_id,
            name=request.name,
            description=request.description,
            position=request.position,
        )
        self.db.add(space)
        self.db.commit()
        self.db.refresh(space)
        return to_learning_space_schema(space)

    def get_learning_space(
        self,
        *,
        owner_id: str,
        course_id: str,
        space_id: str,
    ) -> LearningSpace:
        space = self.get_learning_space_model(
            owner_id=owner_id,
            course_id=course_id,
            space_id=space_id,
        )
        return to_learning_space_schema(space)

    def update_learning_space(
        self,
        *,
        owner_id: str,
        course_id: str,
        space_id: str,
        request: LearningSpaceUpdateRequest,
    ) -> LearningSpace:
        space = self.get_learning_space_model(
            owner_id=owner_id,
            course_id=course_id,
            space_id=space_id,
        )
        changes = request.model_dump(exclude_unset=True)
        if "parent_id" in changes:
            if changes["parent_id"] == space.id:
                raise AppError(
                    ErrorCode.VALIDATION_ERROR,
                    "学习空间不能将自己设置为父级",
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
            self._validate_parent_space(
                owner_id=owner_id,
                course_id=course_id,
                parent_id=changes["parent_id"],
                child_id=space.id,
            )

        for field, value in changes.items():
            setattr(space, field, value)

        self.db.add(space)
        self.db.commit()
        self.db.refresh(space)
        return to_learning_space_schema(space)

    def archive_learning_space(self, *, owner_id: str, course_id: str, space_id: str) -> None:
        space = self.get_learning_space_model(
            owner_id=owner_id,
            course_id=course_id,
            space_id=space_id,
        )
        space.mark_deleted()
        self.db.add(space)
        self.db.commit()

    def get_course_model(self, *, owner_id: str, course_id: str) -> CourseModel:
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

    def get_learning_space_model(
        self,
        *,
        owner_id: str,
        course_id: str,
        space_id: str,
    ) -> LearningSpaceModel:
        space = self.db.execute(
            select(LearningSpaceModel).where(
                LearningSpaceModel.id == space_id,
                LearningSpaceModel.owner_id == owner_id,
                LearningSpaceModel.course_id == course_id,
                LearningSpaceModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if space is None:
            raise_not_found("学习空间不存在")
        return space

    def _validate_parent_space(
        self,
        *,
        owner_id: str,
        course_id: str,
        parent_id: str | None,
        child_id: str | None = None,
    ) -> None:
        if parent_id is None:
            return
        visited: set[str] = set()
        current_parent_id = parent_id
        while current_parent_id is not None:
            if current_parent_id == child_id or current_parent_id in visited:
                raise AppError(
                    ErrorCode.VALIDATION_ERROR,
                    "学习空间父级不能形成循环结构",
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
            visited.add(current_parent_id)
            parent = self.get_learning_space_model(
                owner_id=owner_id,
                course_id=course_id,
                space_id=current_parent_id,
            )
            current_parent_id = parent.parent_id

    def _count(self, query: Select) -> int:
        return self.db.execute(
            select(func.count()).select_from(query.order_by(None).subquery())
        ).scalar_one()


def to_course_schema(course: CourseModel) -> Course:
    return Course(
        id=course.id,
        name=course.name,
        subject=course.subject,
        description=course.description,
        owner_id=course.owner_id,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


def to_learning_space_schema(space: LearningSpaceModel) -> LearningSpace:
    return LearningSpace(
        id=space.id,
        course_id=space.course_id,
        parent_id=space.parent_id,
        name=space.name,
        description=space.description,
        position=space.position,
        owner_id=space.owner_id,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )

