from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode, raise_not_found, raise_validation_error
from app.db.mixins import utc_now
from app.modules.ai_tasks.models import AiTaskModel
from app.modules.courses.models import CourseModel
from app.modules.resources.models import ResourceModel
from app.schemas.ai_tasks import (
    AiTask,
    AiTaskCreateRequest,
    AiTaskUpdateRequest,
    OpenAiChatCompletionRequest,
)
from app.schemas.common import TaskAccepted
from app.schemas.enums import AiTaskStatus, AiTaskType, ResourceStatus


TERMINAL_STATUSES = {
    AiTaskStatus.SUCCEEDED,
    AiTaskStatus.FAILED,
    AiTaskStatus.CANCELED,
}


class AiTaskService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_task(self, *, owner_id: str, request: AiTaskCreateRequest) -> TaskAccepted:
        task = self.create_task_model(
            owner_id=owner_id,
            task_type=request.type,
            course_id=request.course_id,
            resource_id=request.resource_id,
            input_payload=request.input,
        )
        self.db.commit()
        return TaskAccepted(task_id=task.id, status=task.status)

    def create_task_model(
        self,
        *,
        owner_id: str,
        task_type: AiTaskType,
        course_id: str | None = None,
        resource_id: str | None = None,
        input_payload: dict[str, Any] | None = None,
    ) -> AiTaskModel:
        if course_id is not None:
            self._get_course(owner_id=owner_id, course_id=course_id)
        if resource_id is not None:
            resource = self._get_resource(owner_id=owner_id, resource_id=resource_id)
            if course_id is None:
                course_id = resource.course_id
            elif resource.course_id != course_id:
                raise_validation_error("资源不属于指定课程")

        task = AiTaskModel(
            owner_id=owner_id,
            task_type=task_type,
            status=AiTaskStatus.QUEUED,
            progress=0,
            course_id=course_id,
            resource_id=resource_id,
            input_payload=input_payload or {},
        )
        self.db.add(task)
        self.db.flush()
        self._sync_resource_status(task)
        return task

    def get_task(self, *, owner_id: str, task_id: str) -> AiTask:
        return to_ai_task_schema(self.get_task_model(owner_id=owner_id, task_id=task_id))

    def update_task(
        self,
        *,
        owner_id: str,
        task_id: str,
        request: AiTaskUpdateRequest,
    ) -> AiTask:
        task = self.get_task_model(owner_id=owner_id, task_id=task_id)
        changes = request.model_dump(exclude_unset=True)
        status_value = changes.get("status")

        if task.status in TERMINAL_STATUSES and status_value is not None:
            raise_validation_error("已结束的任务不能再次变更状态")

        if "progress" in changes:
            task.progress = changes["progress"]
        if "output" in changes:
            task.output_payload = changes["output"]
        if "error_code" in changes:
            task.error_code = changes["error_code"]
        if "error_message" in changes:
            task.error_message = changes["error_message"]
        if status_value is not None:
            self._apply_status(task, status_value)

        self._sync_resource_status(task)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return to_ai_task_schema(task)

    def cancel_task(self, *, owner_id: str, task_id: str) -> AiTask:
        task = self.get_task_model(owner_id=owner_id, task_id=task_id)
        if task.status == AiTaskStatus.CANCELED:
            return to_ai_task_schema(task)
        if task.status in {AiTaskStatus.SUCCEEDED, AiTaskStatus.FAILED}:
            raise_validation_error("已完成或失败的任务不能取消")

        self._apply_status(task, AiTaskStatus.CANCELED)
        self._sync_resource_status(task)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return to_ai_task_schema(task)

    def create_openai_chat_completion_task(
        self,
        *,
        owner_id: str,
        request: OpenAiChatCompletionRequest,
    ) -> TaskAccepted:
        course_id = _metadata_string(request.metadata, "courseId")
        resource_id = _metadata_string(request.metadata, "resourceId")
        task_type = _metadata_task_type(request.metadata)
        task = self.create_task_model(
            owner_id=owner_id,
            task_type=task_type,
            course_id=course_id,
            resource_id=resource_id,
            input_payload={
                "providerFormat": "openai.chat.completions",
                "request": request.model_dump(exclude_none=True),
            },
        )
        self.db.commit()
        return TaskAccepted(task_id=task.id, status=task.status)

    def get_task_model(self, *, owner_id: str, task_id: str) -> AiTaskModel:
        task = self.db.execute(
            select(AiTaskModel).where(
                AiTaskModel.id == task_id,
                AiTaskModel.owner_id == owner_id,
            )
        ).scalar_one_or_none()
        if task is None:
            raise_not_found("AI 任务不存在")
        return task

    def _apply_status(self, task: AiTaskModel, next_status: AiTaskStatus) -> None:
        now = utc_now()
        task.status = next_status
        if next_status == AiTaskStatus.RUNNING and task.started_at is None:
            task.started_at = now
        if next_status == AiTaskStatus.SUCCEEDED:
            task.progress = 100
            task.finished_at = now
        if next_status == AiTaskStatus.FAILED:
            task.finished_at = now
        if next_status == AiTaskStatus.CANCELED:
            task.canceled_at = now
            task.finished_at = now

    def _sync_resource_status(self, task: AiTaskModel) -> None:
        if task.task_type != AiTaskType.RESOURCE_PARSE or task.resource_id is None:
            return
        resource = self.db.execute(
            select(ResourceModel).where(
                ResourceModel.id == task.resource_id,
                ResourceModel.owner_id == task.owner_id,
                ResourceModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if resource is None:
            return
        resource.parse_task_id = task.id
        if task.status in {AiTaskStatus.QUEUED, AiTaskStatus.RUNNING}:
            resource.status = ResourceStatus.PARSING
        if task.status == AiTaskStatus.SUCCEEDED:
            resource.status = ResourceStatus.PARSED
        if task.status == AiTaskStatus.FAILED:
            resource.status = ResourceStatus.FAILED
        if task.status == AiTaskStatus.CANCELED:
            resource.status = ResourceStatus.UPLOADED
        self.db.add(resource)

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

    def _get_resource(self, *, owner_id: str, resource_id: str) -> ResourceModel:
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


def to_ai_task_schema(task: AiTaskModel) -> AiTask:
    return AiTask(
        id=task.id,
        type=task.task_type,
        status=task.status,
        progress=task.progress,
        course_id=task.course_id,
        resource_id=task.resource_id,
        input=task.input_payload,
        output=task.output_payload,
        error_code=task.error_code,
        error_message=task.error_message,
        started_at=task.started_at,
        finished_at=task.finished_at,
        canceled_at=task.canceled_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _metadata_string(metadata: dict[str, Any], key: str) -> str | None:
    value = metadata.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise_validation_error(f"metadata.{key} 必须是字符串")
    return value.strip()


def _metadata_task_type(metadata: dict[str, Any]) -> AiTaskType:
    value = metadata.get("taskType", AiTaskType.LLM_SUMMARY)
    try:
        return AiTaskType(value)
    except ValueError as exc:
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            "metadata.taskType 不是支持的 AI 任务类型",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        ) from exc

