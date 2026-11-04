"""
资源转笔记 —— HTTP API 路由

端点:
  POST /upload             — 上传文件或网页链接
  POST /parse              — 启动解析任务
  GET  /progress/{taskId}  — 查询任务进度
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, Form, Path, Request, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.modules.resource_notes.schemas import ParseRequest
from app.modules.resource_notes.service import MAX_UPLOAD_SIZE_BYTES, ResourceNotesService
from app.modules.users.models import UserModel

router = APIRouter(prefix="/resource-notes", tags=["resource-notes"])


@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_resource(
    # 文件字段（可选，与 url 二选一）
    file: UploadFile | None = File(default=None),
    # URL 字段（可选，与 file 二选一）
    url: Annotated[str | None, Form()] = None,
    current_user: UserModel = Depends(get_current_user),
):
    """
    上传资源文件（PDF/PPT/音视频）或提交网页链接。

    支持两种模式：
    - 文件上传：multipart/form-data，file 字段
    - 网页链接：multipart/form-data，url 字段

    返回 fileId 列表供 /parse 使用。
    """
    service = ResourceNotesService()

    if file and file.filename:
        # 文件上传模式
        content = await file.read()

        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": f"文件大小超过 300MB 限制（{len(content) / 1024 / 1024:.1f}MB）",
                    }
                },
            )

        info = service.upload_file(
            filename=file.filename,
            content=content,
            content_type=file.content_type or "application/octet-stream",
        )
        return data_response({"files": [info.model_dump(by_alias=True)], "totalCount": 1})

    elif url and url.strip():
        # 网页链接模式
        info = service.upload_url(url=url.strip())
        return data_response({"files": [info.model_dump(by_alias=True)], "totalCount": 1})

    else:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "code": "MISSING_INPUT",
                    "message": "请提供文件（file）或网页链接（url）",
                }
            },
        )


@router.delete("/files/{fileId}")
async def delete_uploaded_file(
    file_id: str = Path(alias="fileId"),
    current_user: UserModel = Depends(get_current_user),
):
    """
    删除已上传的文件（从服务器存储和内存中移除）。

    返回成功确认。
    """
    service = ResourceNotesService()
    try:
        service.delete_file(file_id=file_id)
        return data_response({"deleted": True, "fileId": file_id})
    except ValueError as exc:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "FILE_NOT_FOUND",
                    "message": str(exc),
                }
            },
        )


@router.post("/parse", status_code=status.HTTP_202_ACCEPTED)
async def parse_resources(
    request: ParseRequest,
    current_user: UserModel = Depends(get_current_user),
):
    """
    提交解析任务。

    接收已上传的文件 ID 列表，异步执行：
    1. 逐文件解析（PDF/PPT/网页抓取/音视频编码）
    2. 合并内容 → 调用 Qwen3.5-Omni 生成 Markdown 笔记
    3. 通过 GET /progress/{taskId} 查询进度和结果
    """
    service = ResourceNotesService()
    result = await service.start_parse(file_ids=request.file_ids)
    return data_response(result.model_dump(by_alias=True))


@router.get("/progress/{taskId}")
async def get_parse_progress(
    task_id: str = Path(alias="taskId"),
    current_user: UserModel = Depends(get_current_user),
):
    """
    查询解析任务进度。

    返回字段：
    - status: pending / parsing / summarizing / completed / failed
    - progress: 0–100
    - phase: 当前阶段描述
    - filesTotal / filesDone: 文件进度
    - result: Markdown 结果（completed 时）
    - error: 错误信息（failed 时）
    """
    service = ResourceNotesService()
    result = service.get_progress(task_id=task_id)
    return data_response(result.model_dump(by_alias=True))
