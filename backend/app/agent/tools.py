"""Agent 工具实现。

设计原则：
  1. 直接调用 service/repository 层，不走自己的 HTTP 接口（省一次序列化与鉴权）
  2. 返回值是「模型能读懂的自然语言」，不是原始 JSON 大对象
  3. 所有异常转成人话，不让堆栈泄漏到对话里
"""

from __future__ import annotations

from typing import Any, Callable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

import app.db.models  # noqa: F401 —— 注册全部模型，保证写操作 flush 时外键能解析
# （轻量入口如 CLI/脚本不一定经过 FastAPI 路由，不注册的话写工具会报 NoReferencedTableError）


class ToolError(Exception):
    """工具执行失败。消息会作为观察结果返回给模型，让它自行决定下一步。"""


# --------------------------------------------------------------------------- #
#  小工具                                                                      #
# --------------------------------------------------------------------------- #


def _pick(obj: Any, *names: str, default: Any = None) -> Any:
    """按候选字段名取值，兼容 pydantic alias 与下划线命名。"""
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value is not None:
                return value
    return default


def _truncate(text: str, limit: int) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n…（内容过长，已截断，原文共 {len(text)} 字）"


def _cosine(a: list[float], b: list[float]) -> float:
    """余弦相似度。空向量或维度不一致返回 0。"""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# --------------------------------------------------------------------------- #
#  工具实现                                                                    #
# --------------------------------------------------------------------------- #


def list_courses(db: Session, user_id: str, **_: Any) -> str:
    from app.modules.courses.models import CourseModel
    from app.modules.notes.models import NoteModel

    courses = db.execute(
        select(CourseModel).where(
            CourseModel.owner_id == user_id,
            CourseModel.deleted_at.is_(None),
        )
    ).scalars().all()

    if not courses:
        return "用户还没有创建任何课程。可以建议他先在「我的笔记」里建一门课。"

    lines = [f"共 {len(courses)} 门课程："]
    for course in courses:
        note_count = db.execute(
            select(func.count()).select_from(NoteModel).where(
                NoteModel.course_id == course.id,
                NoteModel.deleted_at.is_(None),
            )
        ).scalar_one()
        lines.append(f"- {course.name}（courseId={course.id}，{note_count} 篇笔记）")
    return "\n".join(lines)


def search_notes(
    db: Session,
    user_id: str,
    query: str = "",
    course_id: str | None = None,
    **_: Any,
) -> str:
    from sqlalchemy.orm import selectinload

    from app.integrations.embedding import EmbeddingRequest
    from app.integrations.registry import get_embedding_provider
    from app.modules.notes.models import NoteModel
    from app.modules.notes.service import NoteService

    query = (query or "").strip()
    if not query:
        raise ToolError("检索关键词为空，请提供一个具体的关键词。")

    service = NoteService(db)

    # 取该用户所有笔记（含 blocks，用于语义检索）
    notes = (
        db.execute(
            select(NoteModel)
            .where(NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None))
            .options(selectinload(NoteModel.blocks))
        )
        .scalars()
        .all()
    )

    if course_id:
        notes = [n for n in notes if getattr(n, "course_id", None) == course_id]

    if not notes:
        return "你还没有相关笔记。可以先用 create_note 创建，或去「资源转笔记」导入资料。"

    def _note_text(note: NoteModel) -> str:
        blocks = sorted(note.blocks or [], key=lambda b: b.position or 0)
        body = " ".join(b.content for b in blocks if b.content)
        return f"{note.title or ''} {body}".strip()

    texts = [_note_text(n) for n in notes]

    # 语义检索（有真实 embedding provider 时）；失败或 mock 则降级为关键词匹配
    ranked: list[tuple[Any, float]] | None = None
    try:
        emb = get_embedding_provider()
        if getattr(emb, "provider_name", "") == "mock":
            raise RuntimeError("embedding 为 mock")
        result = emb.embed(EmbeddingRequest(inputs=[query] + texts))
        vectors = result.vectors
        if len(vectors) == len(texts) + 1:
            query_vec = vectors[0]
            scored = sorted(
                zip(notes, vectors[1:], [_cosine(query_vec, v) for v in vectors[1:]]),
                key=lambda item: item[2],
                reverse=True,
            )
            ranked = [(n, s) for n, _v, s in scored if s > 0.05]
            if not ranked and scored:
                ranked = [(scored[0][0], scored[0][2])]
    except Exception:
        ranked = None

    if ranked is None:
        schema_notes, _ = service.list_notes(owner_id=user_id, page=1, page_size=20, q=query)
        ranked = [(n, 1.0) for n in schema_notes]
        if course_id:
            ranked = [(n, s) for n, s in ranked if _pick(n, "course_id", "courseId") == course_id]

    lines = [f"找到 {len(ranked)} 篇与「{query}」相关的笔记（按相关度排序）："]
    for note, _score in ranked[:10]:
        note_id = getattr(note, "id", None) or _pick(note, "id", default="?")
        title = getattr(note, "title", None) or _pick(note, "title", default="（无标题）")

        if hasattr(note, "blocks"):
            blocks = sorted(note.blocks or [], key=lambda b: b.position or 0)
            snippet = next((b.content for b in blocks if b.content), "")
        else:
            snippet = _pick(note, "snippet") or ""
        snippet = _truncate(str(snippet).replace("\n", " "), 100)

        course = _pick(note, "course_name", "courseName")
        if course is None and hasattr(note, "course_id"):
            course = service._resolve_course_name(note.course_id)
        course = course or "未归类"

        suffix = f"：{snippet}" if snippet else ""
        lines.append(f"- [{note_id}] {title}（{course}）{suffix}")
    return "\n".join(lines)


def get_note(db: Session, user_id: str, note_id: str = "", **_: Any) -> str:
    from app.modules.notes.service import NoteService

    note_id = (note_id or "").strip()
    if not note_id:
        raise ToolError("缺少 note_id。请先用 search_notes 找到笔记。")

    try:
        detail = NoteService(db).get_note_detail(owner_id=user_id, note_id=note_id)
    except Exception as exc:  # 笔记不存在或无权访问
        raise ToolError(f"读取笔记失败：{exc}") from exc

    title = _pick(detail, "title", default="（无标题）")
    blocks = _pick(detail, "blocks", default=[]) or []

    parts: list[str] = []
    for block in blocks:
        content = _pick(block, "content", default="")
        if content:
            parts.append(str(content).strip())
    body = "\n\n".join(parts) if parts else "（这篇笔记还没有正文内容）"

    return f"《{title}》\n\n{_truncate(body, 3000)}"


def get_overview(db: Session, user_id: str, **_: Any) -> str:
    from app.modules.courses.models import CourseModel
    from app.modules.memory.models import MemoryCardModel
    from app.modules.notes.models import NoteModel
    from app.schemas.enums import MemoryCardStatus

    from datetime import datetime, timezone

    note_count = db.execute(
        select(func.count()).select_from(NoteModel).where(
            NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None)
        )
    ).scalar_one()

    course_count = db.execute(
        select(func.count()).select_from(CourseModel).where(
            CourseModel.owner_id == user_id, CourseModel.deleted_at.is_(None)
        )
    ).scalar_one()

    card_count = db.execute(
        select(func.count()).select_from(MemoryCardModel).where(
            MemoryCardModel.owner_id == user_id, MemoryCardModel.deleted_at.is_(None)
        )
    ).scalar_one()

    now = datetime.now(timezone.utc)
    due_count = db.execute(
        select(func.count()).select_from(MemoryCardModel).where(
            MemoryCardModel.owner_id == user_id,
            MemoryCardModel.deleted_at.is_(None),
            MemoryCardModel.status == MemoryCardStatus.ACTIVE,
            MemoryCardModel.due_at <= now,
        )
    ).scalar_one()

    masteries = db.execute(
        select(NoteModel.mastery).where(
            NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None)
        )
    ).scalars().all()
    weak = sum(1 for m in masteries if m is None or m < 40)
    strong = sum(1 for m in masteries if m and m >= 80)

    if note_count == 0:
        return "用户还没有任何笔记。建议从导入一份资料或速记一节课开始。"

    return (
        f"学习总览：\n"
        f"- 课程 {course_count} 门，笔记 {note_count} 篇\n"
        f"- 记忆卡 {card_count} 张，其中 {due_count} 张已到期待复习\n"
        f"- 掌握较好 {strong} 篇，薄弱 {weak} 篇（掌握度 <40 或未标注）"
    )


def list_due_cards(db: Session, user_id: str, limit: int = 10, **_: Any) -> str:
    from datetime import datetime, timezone

    from app.modules.memory.models import MemoryCardModel
    from app.schemas.enums import MemoryCardStatus

    limit = max(1, min(int(limit or 10), 20))
    now = datetime.now(timezone.utc)

    cards = db.execute(
        select(MemoryCardModel)
        .where(
            MemoryCardModel.owner_id == user_id,
            MemoryCardModel.deleted_at.is_(None),
            MemoryCardModel.status == MemoryCardStatus.ACTIVE,
            MemoryCardModel.due_at <= now,
        )
        .limit(limit)
    ).scalars().all()

    if not cards:
        return "当前没有到期的记忆卡片。可以建议用户生成新卡片或开始新内容的学习。"

    lines = [f"共 {len(cards)} 张到期卡片："]
    for index, card in enumerate(cards, start=1):
        lines.append(f"{index}. 问：{card.front}\n   答：{card.back}")
    return "\n".join(lines)


def create_note(
    db: Session,
    user_id: str,
    title: str = "",
    content: str = "",
    course_id: str | None = None,
    **_: Any,
) -> str:
    from app.modules.notes.service import NoteService
    from app.schemas.notes import NoteBlockCreateRequest, NoteCreateRequest

    title = (title or "").strip()
    content = (content or "").strip()
    if not title:
        raise ToolError("创建笔记需要标题。")
    if not content:
        raise ToolError("创建笔记需要正文内容，不能为空。")

    service = NoteService(db)
    try:
        note = service.create_note(
            owner_id=user_id,
            request=NoteCreateRequest(title=title, courseId=course_id),
        )
        service.append_block(
            owner_id=user_id,
            note_id=note.id,
            request=NoteBlockCreateRequest(content=content),
        )
    except Exception as exc:
        raise ToolError(f"创建笔记失败：{exc}") from exc

    return f"已创建笔记《{title}》（noteId={note.id}）。如需生成记忆卡片，可直接用这个 ID。"


def generate_memory_cards(
    db: Session,
    user_id: str,
    note_id: str = "",
    max_cards: int = 5,
    **_: Any,
) -> str:
    from app.modules.memory.generator import generate_cards

    note_id = (note_id or "").strip()
    if not note_id:
        raise ToolError("缺少 note_id。请先用 search_notes 找到笔记。")

    max_cards = max(1, min(int(max_cards or 5), 10))
    try:
        result = generate_cards(
            note_id=note_id, owner_id=user_id, session=db, max_cards=max_cards
        )
    except Exception as exc:
        raise ToolError(f"生成记忆卡片失败：{exc}") from exc

    cards = (result or {}).get("cards") or []
    if not cards:
        return "已执行生成，但没有产出可用卡片。可能这篇笔记内容太少。"

    lines = [f"已为这篇笔记生成 {len(cards)} 张记忆卡片："]
    for index, card in enumerate(cards, start=1):
        front = card.get("front", "") if isinstance(card, dict) else str(card)
        lines.append(f"{index}. {front}")
    return "\n".join(lines)


def run_feynman(
    db: Session,
    user_id: str,
    concept_name: str = "",
    explanation: str = "",
    note_id: str | None = None,
    **_: Any,
) -> str:
    """开始一次费曼学习会话：记录学习者的讲解，供后续追问与评估。"""
    from app.modules.feynman.repository import build_feynman_service
    from app.schemas.feynman import FeynmanSessionCreateRequest

    concept_name = (concept_name or "").strip()
    explanation = (explanation or "").strip()
    if not concept_name or not explanation:
        raise ToolError("概念名称和学习者的解释都不能为空。")

    service = build_feynman_service(db)
    session = service.start_session(
        owner_id=user_id,
        request=FeynmanSessionCreateRequest(
            concept_name=concept_name,
            explanation=explanation,
            note_id=(note_id or "").strip() or None,
        ),
    )
    return (
        f"费曼会话已开始（sessionId={session.id}，概念：{concept_name}）。\n"
        "接下来：针对讲解中的漏洞用 feynman_add_question 逐个追问（一次一个），"
        "对话结束后用 evaluate_feynman 打分评估。"
    )


def feynman_add_question(
    db: Session,
    user_id: str,
    session_id: str = "",
    question: str = "",
    **_: Any,
) -> str:
    """在进行中的费曼会话里追加一个针对漏洞的追问。"""
    from app.modules.feynman.repository import build_feynman_service
    from app.schemas.feynman import FeynmanQuestionCreateRequest

    question = (question or "").strip()
    if not question:
        raise ToolError("追问内容不能为空。")
    service = build_feynman_service(db)
    added = service.add_question(
        owner_id=user_id,
        session_id=(session_id or "").strip(),
        request=FeynmanQuestionCreateRequest(question=question),
    )
    return f"追问已记录（questionId={added.id}）：{question}"


def evaluate_feynman(
    db: Session,
    user_id: str,
    session_id: str = "",
    score: int = 0,
    feedback: str = "",
    follow_up_questions: list | None = None,
    **_: Any,
) -> str:
    """对费曼会话打分评估并结束会话。"""
    from app.modules.feynman.repository import build_feynman_service
    from app.schemas.feynman import FeynmanEvaluationCreateRequest

    feedback = (feedback or "").strip()
    if not feedback:
        raise ToolError("评估反馈不能为空。")
    score = max(0, min(100, int(score)))
    follow_ups = [str(item).strip() for item in (follow_up_questions or []) if str(item).strip()]

    service = build_feynman_service(db)
    service.evaluate(
        owner_id=user_id,
        session_id=(session_id or "").strip(),
        request=FeynmanEvaluationCreateRequest(
            score=score,
            feedback=feedback,
            follow_up_questions=follow_ups,
        ),
    )
    tail = f"后续补强问题：{'；'.join(follow_ups)}" if follow_ups else ""
    return f"费曼评估已完成（score={score}/100）。{tail}\n反馈要点：{feedback[:200]}"


def ask_thinking_question(
    db: Session,
    user_id: str,
    note_id: str = "",
    goal: str = "",
    question: str = "",
    prompt_type: str = "socratic",
    **_: Any,
) -> str:
    """针对一篇笔记开启苏格拉底式深度思考会话并记录一个引导问题。"""
    from app.modules.thinking.repository import build_thinking_service
    from app.schemas.enums import ThinkingPromptType
    from app.schemas.thinking import (
        ThinkingPromptCreateRequest,
        ThinkingSessionCreateRequest,
    )

    note_id = (note_id or "").strip()
    question = (question or "").strip()
    if not note_id or not question:
        raise ToolError("需要 note_id 和引导问题。请先用 search_notes 找到笔记。")
    try:
        kind = ThinkingPromptType((prompt_type or "socratic").strip())
    except ValueError as exc:
        raise ToolError(
            "prompt_type 只能是：socratic / gap_check / counter_example / revision"
        ) from exc

    service = build_thinking_service(db)
    session = service.start_session(
        owner_id=user_id,
        request=ThinkingSessionCreateRequest(note_id=note_id, goal=(goal or "").strip()),
    )
    prompt = service.add_prompt(
        owner_id=user_id,
        session_id=session.id,
        request=ThinkingPromptCreateRequest(content=question, prompt_type=kind),
    )
    return (
        f"思考会话已开始（sessionId={session.id}，noteId={note_id}，目标：{goal}）。\n"
        f"已记录引导问题（promptId={prompt.id}，类型 {kind.value}）：{question}"
    )


def schedule_review(
    db: Session,
    user_id: str,
    card_id: str = "",
    grade: str = "",
    **_: Any,
) -> str:
    """记录一次记忆卡复习结果，并按 SM-2 算法排下次复习时间。"""
    from app.modules.memory.repository import build_memory_service
    from app.schemas.enums import ReviewGrade
    from app.schemas.memory import ReviewRecordCreateRequest

    card_id = (card_id or "").strip()
    if not card_id:
        raise ToolError("缺少 card_id。请先用 list_due_cards 查看到期卡片。")
    try:
        review_grade = ReviewGrade((grade or "").strip().lower())
    except ValueError as exc:
        raise ToolError(
            "grade 只能是：again（忘了）/ hard（困难）/ good（良好）/ easy（轻松）"
        ) from exc

    service = build_memory_service(db)
    record = service.record_review(
        owner_id=user_id,
        card_id=card_id,
        request=ReviewRecordCreateRequest(grade=review_grade),
    )
    return (
        f"已记录复习（评级 {review_grade.value}），按 SM-2 排期："
        f"间隔 {record.interval_days} 天，下次到期 {record.next_due_at}。"
    )


def search_knowledge(
    db: Session,
    user_id: str,
    query: str = "",
    limit: int = 5,
    **_: Any,
) -> str:
    """知识库语义检索：返回与问题最相关的知识块原文片段。"""
    from app.modules.knowledge_base.retriever import search_chunks

    query = (query or "").strip()
    if not query:
        raise ToolError("检索关键词为空，请提供一个具体的问题或关键词。")
    hits = search_chunks(db, user_id, query, limit=limit)
    if not hits:
        return "知识库里没有相关内容。可以先导入资料（资源转笔记）或记笔记，再检索。"
    lines = [f"知识库命中 {len(hits)} 个片段（{'语义' if hits[0]['via'] == 'semantic' else '关键词'}检索）："]
    for index, hit in enumerate(hits, start=1):
        lines.append(
            f"{index}. [{hit['title'] or '无标题'}]（noteId={hit['noteId']}，相关度 {hit['score']}）"
            f"\n   {hit['snippet']}"
        )
    return "\n".join(lines)


def get_mastery(db: Session, user_id: str, **_: Any) -> str:
    """查看各笔记的掌握度画像（按薄弱优先）。"""
    from app.modules.notes.models import NoteModel

    notes = db.execute(
        select(NoteModel.title, NoteModel.mastery)
        .where(NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None))
        .order_by(NoteModel.mastery.asc())
    ).all()

    if not notes:
        return "还没有任何笔记，无法生成掌握度画像。先用 create_note 记一篇吧。"

    weak = [(t, m) for t, m in notes if m is None or m < 40]
    lines = [f"掌握度画像（共 {len(notes)} 篇笔记，按薄弱优先）："]
    for title, mastery in notes[:15]:
        value = "未标注" if mastery is None else f"{mastery}"
        lines.append(f"- 《{title or '无标题'}》 掌握度 {value}")
    lines.append(
        f"薄弱笔记 {len(weak)} 篇（掌握度 <40 或未标注）——建议优先安排这些内容的复习与费曼练习。"
    )
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
#  注册表                                                                      #
# --------------------------------------------------------------------------- #

TOOL_IMPLS: dict[str, Callable[..., str]] = {
    "list_courses": list_courses,
    "search_notes": search_notes,
    "get_note": get_note,
    "get_overview": get_overview,
    "list_due_cards": list_due_cards,
    "generate_memory_cards": generate_memory_cards,
    "create_note": create_note,
    "run_feynman": run_feynman,
    "feynman_add_question": feynman_add_question,
    "evaluate_feynman": evaluate_feynman,
    "ask_thinking_question": ask_thinking_question,
    "schedule_review": schedule_review,
    "get_mastery": get_mastery,
    "search_knowledge": search_knowledge,
}


def run_tool(name: str, args: dict[str, Any], *, db: Session, user_id: str) -> str:
    """执行一个工具，任何异常都转成模型能读懂的文字。"""
    impl = TOOL_IMPLS.get(name)
    if impl is None:
        return f"工具 '{name}' 不存在。可用工具：{', '.join(TOOL_IMPLS)}"

    # 过滤掉模型多传的未知参数，避免 TypeError
    safe_args = {
        key: value
        for key, value in (args or {}).items()
        if key in impl.__code__.co_varnames[: impl.__code__.co_argcount]
    }

    try:
        return impl(db=db, user_id=user_id, **safe_args)
    except ToolError as exc:
        return f"工具执行失败：{exc}"
    except Exception as exc:  # noqa: BLE001 — 兜底，不向用户暴露堆栈
        db.rollback()
        return f"工具执行异常（已回滚）：{type(exc).__name__}: {exc}"
