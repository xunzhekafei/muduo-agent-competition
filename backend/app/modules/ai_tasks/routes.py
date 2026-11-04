from __future__ import annotations

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.ai_tasks.service import AiTaskService
from app.modules.users.models import UserModel
from app.schemas.ai_tasks import (
    AiTaskCreateRequest,
    AiTaskUpdateRequest,
    OpenAiChatCompletionRequest,
)


router = APIRouter(tags=["ai-tasks"])


@router.post("/ai-tasks", status_code=status.HTTP_202_ACCEPTED)
async def create_ai_task(
    request: AiTaskCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    accepted = AiTaskService(db).create_task(owner_id=current_user.id, request=request)
    return data_response(accepted.model_dump(by_alias=True))


@router.get("/ai-tasks/{taskId}")
async def get_ai_task(
    task_id: str = Path(alias="taskId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    task = AiTaskService(db).get_task(owner_id=current_user.id, task_id=task_id)
    return data_response(task.model_dump(by_alias=True))


@router.patch("/ai-tasks/{taskId}")
async def update_ai_task(
    request: AiTaskUpdateRequest,
    task_id: str = Path(alias="taskId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    task = AiTaskService(db).update_task(
        owner_id=current_user.id,
        task_id=task_id,
        request=request,
    )
    return data_response(task.model_dump(by_alias=True))


@router.post("/ai-tasks/{taskId}/cancel")
async def cancel_ai_task(
    task_id: str = Path(alias="taskId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    task = AiTaskService(db).cancel_task(owner_id=current_user.id, task_id=task_id)
    return data_response(task.model_dump(by_alias=True))


@router.post("/ai/openai/chat/completions", status_code=status.HTTP_202_ACCEPTED)
async def create_openai_chat_completion_task(
    request: OpenAiChatCompletionRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    accepted = AiTaskService(db).create_openai_chat_completion_task(
        owner_id=current_user.id,
        request=request,
    )
    return data_response(accepted.model_dump(by_alias=True))
