"""木铎学习导师 —— 把木铎笔记的业务能力包装成 myagent 工具。

适配层职责（实现是单一来源，全在木铎后端）：
  1. 定位木铎后端（默认 ../muduo-agent/backend，可用 MUDEO_BACKEND 覆盖），
     把 backend/.env 的键补进环境变量（已有不覆盖），供木铎内部的 LLM 调用使用
  2. 懒加载 SQLAlchemy 会话工厂（SQLite，默认演示用户 user_001，可用 MUDEO_USER_ID 覆盖）
  3. 13 个工具全部转发 app.agent.tools.run_tool——CLI 与 Web 用同一套工具实现、
     同一份系统提示词（app.agent.prompts.SYSTEM_PROMPT）

注意：工具函数必须返回字符串（DeepSeek 兼容接口的要求）。
"""

from __future__ import annotations

import os
import pathlib
import sys

# ---------- 路径与环境 ----------

_REPO_DIR = pathlib.Path(__file__).resolve().parent
_DEFAULT_BACKEND = _REPO_DIR.parents[1] / "muduo-agent" / "backend"
MUDEO_BACKEND = pathlib.Path(os.environ.get("MUDEO_BACKEND", str(_DEFAULT_BACKEND))).resolve()
MUDEO_USER_ID = os.environ.get("MUDEO_USER_ID", "user_001")

if not MUDEO_BACKEND.is_dir():
    raise RuntimeError(f"木铎后端目录不存在：{MUDEO_BACKEND}（可用环境变量 MUDEO_BACKEND 指定）")


def _load_env_file() -> None:
    """把 backend/.env 里定义的键补进 os.environ（已存在的不覆盖）。"""
    env_file = MUDEO_BACKEND / ".env"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()
if str(MUDEO_BACKEND) not in sys.path:
    sys.path.insert(0, str(MUDEO_BACKEND))

from anthropic import beta_tool  # noqa: E402

# ---------- 会话工厂（懒加载，import 时不碰数据库） ----------

_session_factory = None


def _db():
    """开一个木铎数据库会话（用完必须 close）。"""
    global _session_factory
    if _session_factory is None:
        from sqlalchemy.orm import sessionmaker

        from app.db.session import build_engine

        db_path = MUDEO_BACKEND / "muduo_dev.sqlite3"
        engine = build_engine(f"sqlite+pysqlite:///{db_path.as_posix()}")
        _session_factory = sessionmaker(
            bind=engine, autoflush=False, expire_on_commit=False
        )
    return _session_factory()


# ---------- 系统提示词身份（与 Web 端同一份） ----------

from app.agent.prompts import SYSTEM_PROMPT as IDENTITY  # noqa: E402

# ---------- 工具分发 ----------


def _dispatch(name: str, args: dict) -> str:
    """执行工具，任何异常都转成模型能读懂的文字。"""
    from app.agent.tools import run_tool

    db = _db()
    try:
        return run_tool(name, args, db=db, user_id=MUDEO_USER_ID)
    finally:
        db.close()


# ---------- @beta_tool 包装（签名即 schema，docstring 即工具描述） ----------


@beta_tool
def list_courses() -> str:
    """列出学习者的全部课程（含每门课的笔记数）。需要了解学习者在学什么时先调用这个。"""
    return _dispatch("list_courses", {})


@beta_tool
def search_notes(query: str, course_id: str = "") -> str:
    """按关键词语义检索学习者的笔记，返回笔记 ID、标题、所属课程和摘要。找笔记/找资料用它。"""
    return _dispatch("search_notes", {"query": query, "course_id": course_id or None})


@beta_tool
def get_note(note_id: str) -> str:
    """读取一篇笔记的完整内容。先用 search_notes 拿到 note_id 再调用。"""
    return _dispatch("get_note", {"note_id": note_id})


@beta_tool
def create_note(title: str, content: str, course_id: str = "") -> str:
    """为学习者创建一篇新笔记（标题 + 正文）。用户要记笔记、整理知识时用它。"""
    return _dispatch(
        "create_note", {"title": title, "content": content, "course_id": course_id or None}
    )


@beta_tool
def get_overview() -> str:
    """查询学习总览：课程/笔记/记忆卡数量、到期待复习卡片数、掌握度分布。制定计划前先看这个。"""
    return _dispatch("get_overview", {})


@beta_tool
def list_due_cards(limit: int = 10) -> str:
    """列出当前到期、需要复习的记忆卡片（含问答内容），用于安排今日复习。"""
    return _dispatch("list_due_cards", {"limit": limit})


@beta_tool
def generate_memory_cards(note_id: str, max_cards: int = 5) -> str:
    """为指定笔记自动生成记忆卡片，供之后间隔重复复习使用。"""
    return _dispatch("generate_memory_cards", {"note_id": note_id, "max_cards": max_cards})


@beta_tool
def run_feynman(concept_name: str, explanation: str, note_id: str = "") -> str:
    """开始一次费曼学习会话：记录学习者用自己的话对概念的讲解，随后追问并评估。"""
    return _dispatch(
        "run_feynman",
        {"concept_name": concept_name, "explanation": explanation, "note_id": note_id or None},
    )


@beta_tool
def feynman_add_question(session_id: str, question: str) -> str:
    """在进行中的费曼会话里追加一个追问，针对学习者讲解中的漏洞或含糊之处（一次一个）。"""
    return _dispatch("feynman_add_question", {"session_id": session_id, "question": question})


@beta_tool
def evaluate_feynman(session_id: str, score: int, feedback: str,
                     follow_up_questions: list = []) -> str:
    """对费曼会话打分评估并结束会话。score 为 0-100；feedback 说明漏洞与改进建议；
    follow_up_questions 传需要补强的问题列表（如 ["解释页表的作用"]）。"""
    return _dispatch(
        "evaluate_feynman",
        {
            "session_id": session_id,
            "score": score,
            "feedback": feedback,
            "follow_up_questions": follow_up_questions,
        },
    )


@beta_tool
def ask_thinking_question(note_id: str, goal: str, question: str,
                          prompt_type: str = "socratic") -> str:
    """针对一篇笔记开启苏格拉底式深度思考会话并记录一个引导问题。
    prompt_type：socratic（苏格拉底追问）/ gap_check（查漏）/ counter_example（反例）/ revision（修正）。"""
    return _dispatch(
        "ask_thinking_question",
        {
            "note_id": note_id,
            "goal": goal,
            "question": question,
            "prompt_type": prompt_type,
        },
    )


@beta_tool
def schedule_review(card_id: str, grade: str) -> str:
    """记录一次记忆卡复习结果，并按 SM-2 算法排下次复习时间。
    grade：again（忘了）/ hard（困难）/ good（良好）/ easy（轻松）。"""
    return _dispatch("schedule_review", {"card_id": card_id, "grade": grade})


@beta_tool
def get_mastery() -> str:
    """查看各笔记的掌握度画像（0-100，按薄弱优先），用于找薄弱环节、制定学习计划。"""
    return _dispatch("get_mastery", {})


@beta_tool
def search_knowledge(query: str, limit: int = 5) -> str:
    """知识库语义检索：从导入资料/笔记的分块库里找与问题最相关的原文片段，回答需要原文依据的问题时用。"""
    return _dispatch("search_knowledge", {"query": query, "limit": limit})


# 交给 agent.py 挂进工具池的对象列表
TOOL_OBJECTS = [
    list_courses,
    search_notes,
    get_note,
    create_note,
    get_overview,
    list_due_cards,
    generate_memory_cards,
    run_feynman,
    feynman_add_question,
    evaluate_feynman,
    ask_thinking_question,
    schedule_review,
    get_mastery,
    search_knowledge,
]
