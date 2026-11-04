"""Agent 长期记忆 —— 把学习者状态注入系统上下文。

每次对话开始时，run_agent 调用 build_learning_context 生成「学习者当前状态」摘要，
拼进 system prompt。这样 Agent 第一句就记得：在学什么、哪里薄弱、今天该复习什么、
最近练过什么——而不需要用户重新介绍自己。

注入的内容只是背景知识：与用户当前请求冲突时，以当前请求为准。
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

# 摘要体积上限：注入上下文太长会挤占对话预算，也稀释重点
MAX_WEAK_NOTES = 5
MAX_RECENT_SESSIONS = 3


def build_learning_context(db: Session, user_id: str) -> str:
    """生成学习者状态摘要（Markdown），无数据时返回空字符串。"""
    from app.modules.courses.models import CourseModel
    from app.modules.feynman.models import FeynmanEvaluationModel, FeynmanSessionModel
    from app.modules.memory.models import MemoryCardModel
    from app.modules.notes.models import NoteModel
    from app.modules.thinking.models import ThinkingSessionModel
    from app.schemas.enums import MemoryCardStatus

    def _count(query) -> int:
        return db.execute(query).scalar_one()

    note_count = _count(
        select(func.count()).select_from(NoteModel).where(
            NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None)
        )
    )
    if note_count == 0:
        return ""

    course_count = _count(
        select(func.count()).select_from(CourseModel).where(
            CourseModel.owner_id == user_id, CourseModel.deleted_at.is_(None)
        )
    )
    card_count = _count(
        select(func.count()).select_from(MemoryCardModel).where(
            MemoryCardModel.owner_id == user_id, MemoryCardModel.deleted_at.is_(None)
        )
    )
    now = datetime.now(timezone.utc)
    due_count = _count(
        select(func.count()).select_from(MemoryCardModel).where(
            MemoryCardModel.owner_id == user_id,
            MemoryCardModel.deleted_at.is_(None),
            MemoryCardModel.status == MemoryCardStatus.ACTIVE,
            MemoryCardModel.due_at <= now,
        )
    )

    # 薄弱笔记：掌握度 <40 或未标注，按掌握度升序（未标注视为最弱）
    weak_rows = db.execute(
        select(NoteModel.title, NoteModel.mastery)
        .where(NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None))
        .order_by(NoteModel.mastery.asc())
    ).all()
    weak = [(t or "无标题", m) for t, m in weak_rows if m is None or m < 40][:MAX_WEAK_NOTES]

    lines = [
        "## 学习者当前状态（系统自动注入的记忆，仅供背景参考）",
        f"- 规模：{course_count} 门课程、{note_count} 篇笔记、{card_count} 张记忆卡"
        f"（其中 {due_count} 张已到期待复习）",
    ]
    if weak:
        lines.append("- 薄弱笔记（优先安排复习/费曼练习）：")
        for title, mastery in weak:
            value = "未标注" if mastery is None else f"{mastery}"
            lines.append(f"  - 《{title}》掌握度 {value}")

    # 最近的费曼练习（含评分）与思考会话
    recent_feynman = db.execute(
        select(FeynmanSessionModel.concept_name, FeynmanSessionModel.created_at,
               FeynmanEvaluationModel.score)
        .outerjoin(FeynmanEvaluationModel,
                   FeynmanEvaluationModel.session_id == FeynmanSessionModel.id)
        .where(FeynmanSessionModel.owner_id == user_id)
        .order_by(FeynmanSessionModel.created_at.desc())
        .limit(MAX_RECENT_SESSIONS)
    ).all()
    if recent_feynman:
        lines.append("- 最近的费曼练习：")
        for concept, created_at, score in recent_feynman:
            when = created_at.strftime("%m-%d") if created_at else "??"
            score_text = f"评分 {score}" if score is not None else "未评估"
            lines.append(f"  - [{when}] {concept}（{score_text}）")

    recent_thinking = db.execute(
        select(ThinkingSessionModel.goal, ThinkingSessionModel.created_at)
        .where(ThinkingSessionModel.owner_id == user_id)
        .order_by(ThinkingSessionModel.created_at.desc())
        .limit(MAX_RECENT_SESSIONS)
    ).all()
    if recent_thinking:
        lines.append("- 最近的思考练习：")
        for goal, created_at in recent_thinking:
            when = created_at.strftime("%m-%d") if created_at else "??"
            lines.append(f"  - [{when}] {goal}")

    return "\n".join(lines)
