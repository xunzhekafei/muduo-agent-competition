from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.users.models import UserModel
from app.schemas.import_export import ImportJobCreateRequest
from app.schemas.workflows import CompleteResourceParseRequest
from app.services.resource_note_workflow import ResourceNoteWorkflowService


router = APIRouter(prefix="/workflows/resource-notes", tags=["workflows"])


@router.post("/import", status_code=status.HTTP_202_ACCEPTED)
async def create_resource_note_import(
    request: ImportJobCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    job = ResourceNoteWorkflowService(db).create_import_job(
        owner_id=current_user.id,
        request=request,
    )
    return data_response(job.model_dump(by_alias=True))


@router.get("/context")
async def get_resource_note_context(
    course_id: str | None = Query(default=None, alias="courseId"),
    resource_id: str | None = Query(default=None, alias="resourceId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    context = ResourceNoteWorkflowService(db).get_context(
        current_user=current_user,
        course_id=course_id,
        resource_id=resource_id,
    )
    return data_response(context.model_dump(by_alias=True))


@router.post("/parse-tasks/{taskId}/complete")
async def complete_resource_parse_task(
    request: CompleteResourceParseRequest,
    task_id: str = Path(alias="taskId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    result = ResourceNoteWorkflowService(db).complete_resource_parse(
        owner_id=current_user.id,
        task_id=task_id,
        request=request,
    )
    return data_response(result.model_dump(by_alias=True))
