from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class WorkerTaskType(str, Enum):
    RESOURCE_PARSE = "resource_parse"
    MEMORY_CARD_GENERATION = "memory_card_generation"
    FEYNMAN_EVALUATION = "feynman_evaluation"
    KNOWLEDGE_GRAPH_UPDATE = "knowledge_graph_update"
    COMMUNITY_INDEXING = "community_indexing"
    TRANSCRIBE_AUDIO = "transcribe_audio"
    TIMELINE_INTEGRATION = "timeline_integration"


@dataclass(slots=True)
class WorkerTask:
    task_type: WorkerTaskType
    payload: dict[str, object]
    id: str = field(default_factory=lambda: new_id("task"))
    status: TaskStatus = TaskStatus.QUEUED
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    error: str | None = None


@dataclass(slots=True)
class WorkerResult:
    task_id: str
    status: TaskStatus
    data: dict[str, object] = field(default_factory=dict)
    error: str | None = None
