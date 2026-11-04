from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.dashboard.service import log_study_activity
from app.modules.memory.models import MemoryCardModel
from app.modules.memory.service import MemoryService
from app.modules.users.models import UserModel
from app.schemas.enums import DashboardTaskMode
from app.schemas.memory import (
    MemoryCardCreateRequest,
    ReviewRecordCreateRequest,
    GenerateCardsRequest,
    CycleSetRequest,
)


router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/library")
async def get_library(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    from app.modules.memory.library import build_library

    data = build_library(owner_id=current_user.id, session=db)
    return {"data": data}


@router.get("/cards")
async def list_due_cards(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    source_note_id: str | None = Query(default=None, alias="sourceNoteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    cards, pagination = MemoryService(db).list_due_cards(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        source_note_id=source_note_id,
    )
    return {
        "data": [card.model_dump(by_alias=True) for card in cards],
        "pagination": pagination.model_dump(by_alias=True),
    }


@router.post("/cards", status_code=status.HTTP_201_CREATED)
async def create_card(
    request: MemoryCardCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    card = MemoryService(db).create_card(owner_id=current_user.id, request=request)
    return data_response(card.model_dump(by_alias=True))


@router.patch("/cards/{cardId}")
async def update_card(
    request: MemoryCardCreateRequest,
    card_id: str = Path(alias="cardId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    card = MemoryService(db).update_card(owner_id=current_user.id, card_id=card_id, request=request)
    return data_response(card.model_dump(by_alias=True))


@router.delete("/cards/{cardId}", status_code=status.HTTP_200_OK)
async def delete_card(
    card_id: str = Path(alias="cardId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    MemoryService(db).delete_card(owner_id=current_user.id, card_id=card_id)
    return {"data": {}}


@router.post("/cards/{cardId}/reviews", status_code=status.HTTP_201_CREATED)
async def record_review(
    request: ReviewRecordCreateRequest,
    card_id: str = Path(alias="cardId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    review = MemoryService(db).record_review(
        owner_id=current_user.id,
        card_id=card_id,
        request=request,
    )
    # Log the activity for dashboard
    card = db.get(MemoryCardModel, card_id)
    course_name = "未知课程"
    if card and card.source_note_id:
        from app.modules.notes.models import NoteModel
        from app.modules.courses.models import CourseModel
        note = db.get(NoteModel, card.source_note_id)
        if note and note.course_id:
            course = db.get(CourseModel, note.course_id)
            if course:
                course_name = course.name
    log_study_activity(
        db, owner_id=current_user.id, mode=DashboardTaskMode.MEMORY,
        action="复习了记忆卡片", course_name=course_name, duration_minutes=5.0,
    )
    db.commit()
    return data_response(review.model_dump(by_alias=True))


@router.post("/notes/{noteId}/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_cards(
    request: GenerateCardsRequest,
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """异步生成记忆卡片：立即返回 taskId，后台 worker 执行"""
    note_id = note_id.strip()  # 防止前端传入带空格的 ID
    from app.modules.ai_tasks.models import AiTaskModel
    from app.schemas.enums import AiTaskStatus, AiTaskType
    from app.db.ids import new_prefixed_id
    from app.db.mixins import utc_now
    import threading

    task = AiTaskModel(
        id=new_prefixed_id("task"),
        owner_id=current_user.id,
        task_type=AiTaskType.MEMORY_CARD_GENERATION,
        status=AiTaskStatus.QUEUED,
        input_payload={"note_id": note_id, "max_cards": request.max_cards},
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    def _run_generation():
        from app.db.session import get_session_factory
        session = get_session_factory()()
        try:
            task_db = session.get(AiTaskModel, task.id)
            if task_db:
                task_db.status = AiTaskStatus.RUNNING
                task_db.started_at = utc_now()
                session.commit()

            from app.modules.memory.generator import generate_cards as do_generate
            result = do_generate(
                note_id=note_id,
                owner_id=current_user.id,
                session=session,
                max_cards=request.max_cards,
            )

            task_db = session.get(AiTaskModel, task.id)
            if task_db:
                task_db.status = AiTaskStatus.SUCCEEDED
                task_db.output_payload = result
                task_db.finished_at = utc_now()
                session.commit()
        except Exception as e:
            task_db = session.get(AiTaskModel, task.id)
            if task_db:
                task_db.status = AiTaskStatus.FAILED
                task_db.error_message = str(e)
                task_db.finished_at = utc_now()
                session.commit()
        finally:
            session.close()

    threading.Thread(target=_run_generation, daemon=True).start()

    return {
        "data": {
            "taskId": task.id,
            "status": task.status.value,
        }
    }


def _touch_note(note_id: str, db: Session) -> None:
    """更新笔记的 updated_at 时间戳"""
    from app.modules.notes.models import NoteModel
    from app.db.mixins import utc_now
    note = db.get(NoteModel, note_id)
    if note is not None:
        note.updated_at = utc_now()


CYCLE_SCHEDULES = {
    "cram": [1, 2, 4, 7, 14],
    "standard": [1, 3, 7, 15, 30, 60],
    "longterm": [1, 3, 7, 15, 30, 90, 180],
}


@router.post("/chat")
async def ai_chat(
    request: dict[str, object] = Body(...),
    current_user: UserModel = Depends(get_current_user),
):
    """AI 卡片助手：接收对话消息和卡片上下文，返回 AI 建议"""
    from app.integrations.registry import get_default_integrations
    from app.integrations.llm import LLMGenerationRequest, LLMMessage

    messages = request.get("messages", [])
    cards = request.get("cards", [])

    cards_summary = "\n".join(
        f"{i+1}. [{c.get('type','')}] 问题:{c.get('front','')} | 答案:{c.get('back','')}"
        for i, c in enumerate(cards)
    ) if cards else "暂无卡片"

    system_prompt = f"""你是记忆卡片设计助手。用户正在审查记忆卡片，可能会让你帮忙添加、修改或删除卡片。

当前已有卡片：
{cards_summary}

如果用户要求你生成或添加新卡片，请用以下格式输出每张卡片建议（多张卡片用 --- 分隔）：

类型：概念定义
问题：什么是线程？
答案：线程是CPU调度的基本单位，同一个进程内的多个线程共享内存空间。

---
类型：辨析卡片
问题：线程拥有独立的内存空间，这个说法正确吗？
答案：错误。线程共享所属进程的内存空间，进程才拥有独立地址空间。

四种可用类型：概念定义 / 填空卡片 / 辨析卡片 / 翻转问答
难度默认"中等"，不必特别标注。

如果不是生成卡片（比如闲聊或询问），正常简短回复即可，不用上述格式。"""

    llm = get_default_integrations().llm
    llm_messages = [LLMMessage(role="system", content=system_prompt)]
    for m in messages[-6:]:  # 最近6条消息
        llm_messages.append(LLMMessage(
            role=m.get("role", "user"),
            content=m.get("content", ""),
        ))

    req = LLMGenerationRequest(
        model="",
        messages=llm_messages,
        temperature=0.7,
        max_tokens=500,
    )
    try:
        resp = llm.generate(req)
        return {"data": {"reply": resp.content}}
    except Exception as e:
        return {"data": {"reply": f"抱歉，AI服务暂时不可用：{str(e)}"}}


@router.put("/notes/{noteId}/cycle")
async def set_cycle(
    request: CycleSetRequest,
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    from datetime import timedelta

    if request.cycle not in CYCLE_SCHEDULES:
        from app.core.errors import AppError, ErrorCode
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            f"无效的周期类型: {request.cycle}，可选 cram / standard / longterm",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    cards = (
        db.execute(
            select(MemoryCardModel).where(
                MemoryCardModel.source_note_id == note_id,
                MemoryCardModel.owner_id == current_user.id,
                MemoryCardModel.deleted_at.is_(None),
            )
        ).scalars().all()
    )

    if not cards:
        from app.core.errors import AppError, ErrorCode
        raise AppError(
            ErrorCode.RESOURCE_NOT_FOUND,
            "该笔记没有记忆卡片",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    from app.db.mixins import utc_now
    now = utc_now()
    first_interval = CYCLE_SCHEDULES[request.cycle][0]
    for card in cards:
        card.due_at = now + timedelta(days=first_interval)
        card.interval_days = first_interval
    db.commit()
    return data_response({"noteId": note_id, "cycle": request.cycle})


@router.post("/notes/{noteId}/complete-review")
async def complete_note_review(
    note_id: str = Path(alias="noteId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """完成该笔记所有卡片的一轮复习，批量记录 review 并更新 due_at"""
    cards = (
        db.execute(
            select(MemoryCardModel).where(
                MemoryCardModel.source_note_id == note_id,
                MemoryCardModel.owner_id == current_user.id,
                MemoryCardModel.deleted_at.is_(None),
            )
        ).scalars().all()
    )

    if not cards:
        from app.core.errors import AppError, ErrorCode
        raise AppError(
            ErrorCode.RESOURCE_NOT_FOUND,
            "该笔记没有记忆卡片",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    from datetime import timedelta
    from app.modules.memory.models import ReviewRecordModel
    from app.db.mixins import utc_now
    from app.schemas.enums import ReviewGrade

    now = utc_now()
    count = 0
    for card in cards:
        new_interval, new_ease = MemoryService(db)._schedule(
            card.interval_days, card.ease_factor, ReviewGrade.GOOD
        )
        next_due = now + timedelta(days=new_interval)

        review = ReviewRecordModel(
            owner_id=current_user.id,
            card_id=card.id,
            grade="good",
            reviewed_at=now,
            next_due_at=next_due,
            interval_days=new_interval,
        )
        db.add(review)

        # 更新卡片调度状态
        card.interval_days = new_interval
        card.ease_factor = new_ease
        card.due_at = next_due
        count += 1

    _touch_note(note_id, db)
    db.commit()
    return data_response({"noteId": note_id, "reviewedCards": count})
