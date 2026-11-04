from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.notes.service import NoteService
from app.modules.users.models import UserModel
from app.schemas.common import EmptyDataResponse
from app.schemas.notes import (
    NoteBlockCreateRequest,
    NoteBlocksSaveRequest,
    NoteCreateRequest,
    NoteRelationCreateRequest,
    NoteUpdateRequest,
)


router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("")
async def list_notes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    tag: str | None = Query(default=None),
    q: str | None = Query(default=None),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    notes, pagination = NoteService(db).list_notes(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        tag=tag,
        q=q,
    )
    return {
        "data": [note.model_dump(by_alias=True) for note in notes],
        "pagination": pagination.model_dump(by_alias=True),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_note(
    request: NoteCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    note = NoteService(db).create_note(owner_id=current_user.id, request=request)
    return data_response(note.model_dump(by_alias=True))


@router.get("/{noteId}")
async def get_note_detail(
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    detail = NoteService(db).get_note_detail(owner_id=current_user.id, note_id=note_id)
    return data_response(detail.model_dump(by_alias=True))


@router.patch("/{noteId}")
async def update_note(
    request: NoteUpdateRequest,
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    note = NoteService(db).update_note(owner_id=current_user.id, note_id=note_id, request=request)
    return data_response(note.model_dump(by_alias=True))


@router.delete("/{noteId}")
async def delete_note(
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    NoteService(db).archive_note(owner_id=current_user.id, note_id=note_id)
    return EmptyDataResponse().model_dump()


@router.post("/{noteId}/blocks", status_code=status.HTTP_201_CREATED)
async def append_block(
    request: NoteBlockCreateRequest,
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    block = NoteService(db).append_block(
        owner_id=current_user.id,
        note_id=note_id,
        request=request,
    )
    return data_response(block.model_dump(by_alias=True))


@router.patch("/{noteId}/blocks/{blockId}")
async def update_block(
    request: NoteBlockCreateRequest,
    note_id: str = Path(alias="noteId"),
    block_id: str = Path(alias="blockId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    block = NoteService(db).update_block(
        owner_id=current_user.id,
        note_id=note_id,
        block_id=block_id,
        request=request,
    )
    return data_response(block.model_dump(by_alias=True))


@router.delete("/{noteId}/blocks/{blockId}")
async def delete_block(
    note_id: str = Path(alias="noteId"),
    block_id: str = Path(alias="blockId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    NoteService(db).delete_block(
        owner_id=current_user.id,
        note_id=note_id,
        block_id=block_id,
    )
    return EmptyDataResponse().model_dump()


@router.put("/{noteId}/blocks")
async def save_blocks(
    request: NoteBlocksSaveRequest,
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    blocks = NoteService(db).save_blocks(
        owner_id=current_user.id,
        note_id=note_id,
        blocks=request.blocks,
    )
    return data_response([block.model_dump(by_alias=True) for block in blocks])


@router.post("/{noteId}/relations", status_code=status.HTTP_201_CREATED)
async def add_relation(
    request: NoteRelationCreateRequest,
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    relation = NoteService(db).add_relation(
        owner_id=current_user.id,
        note_id=note_id,
        request=request,
    )
    return data_response(relation.model_dump(by_alias=True))


@router.post("/ai-generate")
async def ai_generate(
    request: dict[str, object] = Body(...),
    current_user: UserModel = Depends(get_current_user),
):
    """通用 AI 生成：使用统一的 DeepSeekProvider"""
    from app.core.errors import AppError, ErrorCode, raise_validation_error
    from app.integrations.llm import DeepSeekProvider, LLMGenerationRequest, LLMMessage

    prompt = str(request.get("prompt", "")).strip()
    if not prompt:
        raise_validation_error("prompt 不能为空")

    system_msg = """你是一个笔记助手。请按以下规则输出内容：

可用格式（仅限这些）：
- 用 # ## ### 做标题
- 用空行分隔段落，段落内用 。 和 ， 自然断句
- 用 1. 2. 3. 做有序列表（每项一行，项与项之间不空行）
- 用 **粗体** 强调关键词（一句最多一处）
- 用 | 列1 | 列2 | 做简单表格（仅两到三列）

绝对禁止：
- 不要用 - * 做无序列表（容易解析出错）
- 不要输出 ``` 代码块
- 不要用 > 引用
- 不要用 ~~ == 等扩展语法
- 不要用嵌套列表

示例输出：
## 标题
第一段内容，直接写。不要用列表符号。

1. 第一点说明
2. 第二点说明
3. 第三点说明

| 列A | 列B |
| --- | --- |
| 值1 | 值2 |
"""
    try:
        provider = DeepSeekProvider()
        llm_request = LLMGenerationRequest(
            model="deepseek-v4-flash",
            messages=[
                LLMMessage(role="system", content=system_msg),
                LLMMessage(role="user", content=prompt),
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        response = provider.generate(llm_request)
        return {"data": {"content": response.content}}
    except Exception as e:
        raise AppError(ErrorCode.AI_TASK_FAILED, str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
