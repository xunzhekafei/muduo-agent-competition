"""记忆库聚合查询 —— 联表查 notes + memory_cards + review_records"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.mixins import utc_now
from app.modules.memory.models import MemoryCardModel, ReviewRecordModel
from app.modules.courses.models import CourseModel  # 只读，获取课程名称
from app.modules.notes.service import NoteService


def build_library(owner_id: str, session: Session) -> list[dict]:
    """返回该用户所有笔记的记忆库聚合数据"""

    notes = NoteService(session).list_user_note_models(owner_id=owner_id)
    # 按记忆卡片最新更新时间排序（而非笔记本身）
    def _latest_card_time(note):
        latest = session.execute(
            select(func.max(MemoryCardModel.updated_at)).where(
                MemoryCardModel.source_note_id == note.id,
                MemoryCardModel.deleted_at.is_(None),
            )
        ).scalar()
        return latest or note.updated_at or note.created_at
    notes = sorted(notes, key=_latest_card_time, reverse=True)

    result = []
    for note in notes:
        cards = (
            session.execute(
                select(MemoryCardModel).where(
                    MemoryCardModel.source_note_id == note.id,
                    MemoryCardModel.deleted_at.is_(None),
                )
            ).scalars().all()
        )

        total = len(cards)
        course_name = _get_course_name(note.course_id, session)

        # 速记模式的笔记（无卡片 + 无课程）不出现在记忆库
        # 导出的笔记（有课程）或原有记忆笔记（有卡片）正常显示
        if total == 0:
            if not note.course_id:
                continue  # 速记笔记，跳过
            result.append({
                "noteId": note.id, "noteTitle": note.title, "courseName": course_name,
                "status": "none", "totalCards": 0, "reviewedCards": 0, "dueCards": 0,
                "nextReviewAt": None, "daysUntilNext": None, "cycle": None,
                "lastReviewAt": None, "createdAt": _iso(note.created_at),
            })
            continue

        now = utc_now()
        card_ids = [c.id for c in cards]

        # 把所有 due_at 统一转 aware
        aware_due_dates = [_ensure_aware(c.due_at) for c in cards if c.due_at]

        # 已复习卡片数
        reviewed = (
            session.execute(
                select(func.count(ReviewRecordModel.id)).where(ReviewRecordModel.card_id.in_(card_ids))
            ).scalar()
        ) or 0

        # 到期数
        due = sum(1 for d in aware_due_dates if d <= now)

        # 下次复习时间
        future = [d for d in aware_due_dates if d > now]
        if future:
            next_due = min(future)
            days = (next_due - now).days
        elif due > 0:
            # 有到期卡但无未来卡 → 今天就该复习
            days = 0
            next_due = now
        else:
            days = None
            next_due = None

        # 最近复习时间
        last_review = (
            session.execute(
                select(func.max(ReviewRecordModel.reviewed_at)).where(ReviewRecordModel.card_id.in_(card_ids))
            ).scalar()
        )

        result.append({
            "noteId": note.id,
            "noteTitle": note.title,
            "courseName": course_name,
            "status": "completed" if reviewed >= total else "active",
            "totalCards": total,
            "reviewedCards": reviewed,
            "dueCards": due,
            "nextReviewAt": _iso(next_due) if next_due else None,
            "daysUntilNext": days,
            "cycle": _guess_cycle(cards),
            "lastReviewAt": _iso(last_review) if last_review else None,
            "createdAt": _iso(note.created_at),
        })

    return result


def _get_course_name(course_id: str | None, session: Session) -> str:
    if not course_id:
        return "未分类"
    course = session.get(CourseModel, course_id)
    return course.name if course else "未分类"


def _guess_cycle(cards: list[MemoryCardModel]) -> str | None:
    intervals = sorted({c.interval_days for c in cards if c.interval_days > 0})
    if not intervals:
        return None
    # 取最常见的间隔作为第一次复习间隔，据此推测周期
    first = intervals[0]
    if first == 1:
        if 2 in intervals:
            return "cram"
        return "standard"
    return "standard"


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _ensure_aware(dt: datetime) -> datetime:
    """确保 datetime 带有时区信息，用于安全比较"""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
