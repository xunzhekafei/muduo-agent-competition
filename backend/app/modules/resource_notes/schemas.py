"""
资源转笔记 —— 请求与响应 Schema

字段名使用 camelCase 别名，与前端保持一致。
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


# ═══════════════════════════════════════════════════════════
# 任务状态枚举
# ═══════════════════════════════════════════════════════════

class ParseTaskStatus(StrEnum):
    PENDING = "pending"
    PARSING = "parsing"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    FAILED = "failed"


# ═══════════════════════════════════════════════════════════
# Upload
# ═══════════════════════════════════════════════════════════

class UploadedFileInfo(BaseModel):
    """单个上传文件的响应"""
    model_config = ConfigDict(populate_by_name=True)

    file_id: str = Field(alias="fileId")
    filename: str
    file_type: str = Field(alias="fileType")
    size_bytes: int = Field(alias="sizeBytes")
    upload_time: datetime = Field(default_factory=datetime.utcnow, alias="uploadTime")


class UploadResponse(BaseModel):
    """上传接口响应"""
    model_config = ConfigDict(populate_by_name=True)

    files: list[UploadedFileInfo]
    total_count: int = Field(alias="totalCount")


# ═══════════════════════════════════════════════════════════
# Parse
# ═══════════════════════════════════════════════════════════

class ParseRequest(BaseModel):
    """解析请求"""
    model_config = ConfigDict(populate_by_name=True)

    file_ids: list[str] = Field(alias="fileIds", min_length=1)
    course_id: str | None = Field(default=None, alias="courseId")


class ParseResponse(BaseModel):
    """解析接口响应（立即返回任务 ID）"""
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    status: str = "pending"
    message: str = "解析任务已提交"


# ═══════════════════════════════════════════════════════════
# Progress
# ═══════════════════════════════════════════════════════════

class ProgressResponse(BaseModel):
    """进度查询响应"""
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    status: ParseTaskStatus
    progress: int = 0           # 0–100
    phase: str = ""             # 当前阶段描述
    files_total: int = Field(default=0, alias="filesTotal")
    files_done: int = Field(default=0, alias="filesDone")
    result: str | None = None   # Markdown 结果（仅 COMPLETED 时）
    error: str | None = None    # 错误信息（仅 FAILED 时）
