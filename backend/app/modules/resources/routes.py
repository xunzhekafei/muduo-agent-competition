from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.resources.service import ResourceService
from app.modules.users.models import UserModel
from app.schemas.common import EmptyDataResponse
from app.schemas.resources import ResourceCreateRequest, ResourceParseRequest


router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("")
async def list_resources(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    course_id: str | None = Query(default=None, alias="courseId"),
    learning_space_id: str | None = Query(default=None, alias="learningSpaceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    resources, pagination = ResourceService(db).list_resources(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        course_id=course_id,
        learning_space_id=learning_space_id,
    )
    return {
        "data": [resource.model_dump(by_alias=True) for resource in resources],
        "pagination": pagination.model_dump(by_alias=True),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_resource(
    request: ResourceCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    resource = ResourceService(db).create_resource(owner_id=current_user.id, request=request)
    return data_response(resource.model_dump(by_alias=True))


@router.get("/{resourceId}")
async def get_resource(
    resource_id: str = Path(alias="resourceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    resource = ResourceService(db).get_resource(owner_id=current_user.id, resource_id=resource_id)
    return data_response(resource.model_dump(by_alias=True))


@router.delete("/{resourceId}")
async def delete_resource(
    resource_id: str = Path(alias="resourceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    ResourceService(db).archive_resource(owner_id=current_user.id, resource_id=resource_id)
    return EmptyDataResponse().model_dump()


@router.post("/{resourceId}/parse", status_code=status.HTTP_202_ACCEPTED)
async def create_resource_parse_task(
    resource_id: str = Path(alias="resourceId"),
    request: ResourceParseRequest | None = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    accepted = ResourceService(db).create_parse_task(
        owner_id=current_user.id,
        resource_id=resource_id,
        request=request or ResourceParseRequest(),
    )
    return data_response(accepted.model_dump(by_alias=True))


@router.get("/{resourceId}/parsed-result")
async def get_resource_parsed_result(
    resource_id: str = Path(alias="resourceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    parsed = ResourceService(db).get_parsed_result(
        owner_id=current_user.id,
        resource_id=resource_id,
    )
    return data_response(parsed.model_dump(by_alias=True))
