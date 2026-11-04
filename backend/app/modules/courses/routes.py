from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.courses.service import CourseService
from app.modules.users.models import UserModel
from app.schemas.common import EmptyDataResponse
from app.schemas.courses import (
    CourseCreateRequest,
    CourseUpdateRequest,
    LearningSpaceCreateRequest,
    LearningSpaceUpdateRequest,
)


router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
async def list_courses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    courses, pagination = CourseService(db).list_courses(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
    )
    return {
        "data": [course.model_dump(by_alias=True) for course in courses],
        "pagination": pagination.model_dump(by_alias=True),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_course(
    request: CourseCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    course = CourseService(db).create_course(owner_id=current_user.id, request=request)
    return data_response(course.model_dump(by_alias=True))


@router.get("/{courseId}")
async def get_course(
    course_id: str = Path(alias="courseId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    course = CourseService(db).get_course(owner_id=current_user.id, course_id=course_id)
    return data_response(course.model_dump(by_alias=True))


@router.patch("/{courseId}")
async def update_course(
    request: CourseUpdateRequest,
    course_id: str = Path(alias="courseId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    course = CourseService(db).update_course(
        owner_id=current_user.id,
        course_id=course_id,
        request=request,
    )
    return data_response(course.model_dump(by_alias=True))


@router.delete("/{courseId}")
async def delete_course(
    course_id: str = Path(alias="courseId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    CourseService(db).archive_course(owner_id=current_user.id, course_id=course_id)
    return EmptyDataResponse().model_dump()


@router.get("/{courseId}/learning-spaces")
async def list_learning_spaces(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    course_id: str = Path(alias="courseId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    spaces, pagination = CourseService(db).list_learning_spaces(
        owner_id=current_user.id,
        course_id=course_id,
        page=page,
        page_size=page_size,
    )
    return {
        "data": [space.model_dump(by_alias=True) for space in spaces],
        "pagination": pagination.model_dump(by_alias=True),
    }


@router.post("/{courseId}/learning-spaces", status_code=status.HTTP_201_CREATED)
async def create_learning_space(
    request: LearningSpaceCreateRequest,
    course_id: str = Path(alias="courseId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    space = CourseService(db).create_learning_space(
        owner_id=current_user.id,
        course_id=course_id,
        request=request,
    )
    return data_response(space.model_dump(by_alias=True))


@router.get("/{courseId}/learning-spaces/{spaceId}")
async def get_learning_space(
    course_id: str = Path(alias="courseId"),
    space_id: str = Path(alias="spaceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    space = CourseService(db).get_learning_space(
        owner_id=current_user.id,
        course_id=course_id,
        space_id=space_id,
    )
    return data_response(space.model_dump(by_alias=True))


@router.patch("/{courseId}/learning-spaces/{spaceId}")
async def update_learning_space(
    request: LearningSpaceUpdateRequest,
    course_id: str = Path(alias="courseId"),
    space_id: str = Path(alias="spaceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    space = CourseService(db).update_learning_space(
        owner_id=current_user.id,
        course_id=course_id,
        space_id=space_id,
        request=request,
    )
    return data_response(space.model_dump(by_alias=True))


@router.delete("/{courseId}/learning-spaces/{spaceId}")
async def delete_learning_space(
    course_id: str = Path(alias="courseId"),
    space_id: str = Path(alias="spaceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    CourseService(db).archive_learning_space(
        owner_id=current_user.id,
        course_id=course_id,
        space_id=space_id,
    )
    return EmptyDataResponse().model_dump()
