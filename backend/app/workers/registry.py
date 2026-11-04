from __future__ import annotations

from collections.abc import Callable

from .models import TaskStatus, WorkerResult, WorkerTask, WorkerTaskType, utc_now

WorkerHandler = Callable[[dict[str, object]], dict[str, object]]


class WorkerRegistry:
    def __init__(self) -> None:
        self._handlers: dict[WorkerTaskType, WorkerHandler] = {}

    def register(self, task_type: WorkerTaskType, handler: WorkerHandler) -> None:
        self._handlers[task_type] = handler

    def run(self, task: WorkerTask) -> WorkerResult:
        handler = self._handlers.get(task.task_type)
        if handler is None:
            task.status = TaskStatus.FAILED
            task.error = f"no worker registered for {task.task_type.value}"
            task.updated_at = utc_now()
            return WorkerResult(task_id=task.id, status=task.status, error=task.error)

        task.status = TaskStatus.RUNNING
        task.updated_at = utc_now()
        try:
            data = handler(task.payload)
        except Exception as exc:
            task.status = TaskStatus.FAILED
            task.error = str(exc)
            task.updated_at = utc_now()
            return WorkerResult(task_id=task.id, status=task.status, error=task.error)

        task.status = TaskStatus.SUCCEEDED
        task.updated_at = utc_now()
        return WorkerResult(task_id=task.id, status=task.status, data=data)
