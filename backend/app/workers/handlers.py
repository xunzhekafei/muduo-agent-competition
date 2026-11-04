from __future__ import annotations

from .models import WorkerTaskType
from .registry import WorkerRegistry

from app.integrations.asr import ASRRequest
from app.integrations.registry import get_asr_provider, get_llm_provider, get_storage_provider
from app.modules.notes.service import NoteService
from app.schemas.notes import NoteBlockCreateRequest, NoteCreateRequest


def parse_resource(payload: dict[str, object]) -> dict[str, object]:
    resource_id = _require_string(payload, "resource_id")
    title = str(payload.get("title") or "Untitled resource").strip()
    source_text = str(payload.get("source_text") or "").strip()
    return {
        "resource_id": resource_id,
        "title": title,
        "chapters": [
            {
                "position": 0,
                "title": title,
                "content": source_text,
            }
        ]
        if source_text
        else [],
        "core_concepts": _string_list(payload.get("core_concepts", [])),
        "note_draft_id": payload.get("target_note_id"),
    }


def generate_memory_cards(payload: dict[str, object]) -> dict[str, object]:
    note_id = _require_string(payload, "note_id")
    blocks = payload.get("blocks", [])
    if not isinstance(blocks, list):
        raise ValueError("blocks must be a list")
    cards = [
        {
            "front": f"Explain: {str(block)[:80]}",
            "back": str(block),
            "source_note_id": note_id,
        }
        for block in blocks
        if str(block).strip()
    ]
    return {"cards": cards, "count": len(cards)}


def evaluate_feynman_session(payload: dict[str, object]) -> dict[str, object]:
    explanation = _require_string(payload, "explanation")
    concept_name = _require_string(payload, "concept_name")
    word_count = len(explanation.split())
    score = min(100, max(20, word_count * 4))
    return {
        "concept_name": concept_name,
        "score": score,
        "feedback": "Explanation has enough substance for a first pass."
        if score >= 60
        else "Explanation is too brief; ask the learner to add mechanism and examples.",
        "follow_up_questions": [
            f"What is the simplest example of {concept_name}?",
            f"Where does {concept_name} fail or become confusing?",
        ],
    }


def update_knowledge_graph(payload: dict[str, object]) -> dict[str, object]:
    owner_id = _require_string(payload, "owner_id")
    concepts = payload.get("concepts", [])
    relations = payload.get("relations", [])
    if not isinstance(concepts, list) or not isinstance(relations, list):
        raise ValueError("concepts and relations must be lists")
    return {
        "owner_id": owner_id,
        "concept_count": len(concepts),
        "relation_count": len(relations),
    }


def index_community_asset(payload: dict[str, object]) -> dict[str, object]:
    asset_id = _require_string(payload, "asset_id")
    title = _require_string(payload, "title")
    tags = payload.get("tags", [])
    if not isinstance(tags, list):
        raise ValueError("tags must be a list")
    return {
        "asset_id": asset_id,
        "index_document": {
            "title": title,
            "tags": tags,
            "search_text": " ".join([title, *[str(tag) for tag in tags]]),
        },
    }


def transcribe_audio(payload: dict[str, object]) -> dict[str, object]:
    """语音转写 handler：从存储下载音频 → 调用 ASR → 返回转写结果"""
    storage_key = _require_string(payload, "storage_key")
    audio_format = str(payload.get("audio_format") or "webm").strip()

    storage = get_storage_provider()
    asr = get_asr_provider()

    audio_bytes = storage.download(storage_key)

    request = ASRRequest(
        audio=audio_bytes,
        source_name=storage_key,
        language="zh-CN",
    )

    result = asr.transcribe(request)

    return {
        "storage_key": storage_key,
        "text": result.text,
        "segments": [
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
            }
            for segment in result.segments
        ],
        "language": result.language,
        "duration_seconds": result.duration_seconds,
    }


def integrate_timeline_to_note(payload: dict[str, object]) -> dict[str, object]:
    """时间流整合 handler：转写文本 + 手动笔记 → LLM → 保存为结构化笔记"""
    owner_id = _require_string(payload, "owner_id")
    segments = payload.get("segments", [])
    manual_notes = payload.get("manual_notes", [])
    course_id = payload.get("course_id")
    title = str(payload.get("title") or "课堂速记").strip()

    if not isinstance(segments, list) or not isinstance(manual_notes, list):
        raise ValueError("segments and manual_notes must be lists")

    timeline_parts = []

    for seg in segments:
        ts_start = seg.get("start", 0)
        ts_end = seg.get("end", 0)
        text = str(seg.get("text", "")).strip()
        if text:
            timeline_parts.append(f"[{_fmt_time(ts_start)}-{_fmt_time(ts_end)}] {text}")

    for note in manual_notes:
        ts = str(note.get("timestamp", "")).strip()
        content = str(note.get("content", "")).strip()
        if content:
            timeline_parts.append(f"[{ts}] 手动笔记：{content}")

    timeline_text = "\n\n".join(timeline_parts)

    llm = get_llm_provider()
    system_prompt = """你是一个笔记整理助手。以下是学生在课堂上记录的内容（包含语音转写和手动笔记），请整理成结构化笔记。用 # ## 做层级标题，用 1. 2. 3. 做列表，提取核心概念，保留重要细节，不要编造内容。"""

    llm_response = llm.chat(system_prompt + "\n\n" + timeline_text)

    from app.db.session import get_db_session
    db = next(get_db_session())

    note_request = NoteCreateRequest(
        title=title,
        course_id=course_id,
        note_type="quick_timeline",
    )

    note_service = NoteService(db)
    note = note_service.create_note(owner_id=owner_id, request=note_request)

    note_service.append_block(
        owner_id=owner_id,
        note_id=note.id,
        request=NoteBlockCreateRequest(
            content=llm_response,
            block_type="paragraph",
            metadata={"source": "ai_generated"},
        ),
    )

    return {
        "note_id": note.id,
        "title": note.title,
        "note_type": note.note_type,
        "content": llm_response,
    }


def _fmt_time(seconds: float) -> str:
    """格式化时间为 MM:SS"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def build_default_registry() -> WorkerRegistry:
    registry = WorkerRegistry()
    registry.register(WorkerTaskType.RESOURCE_PARSE, parse_resource)
    registry.register(WorkerTaskType.MEMORY_CARD_GENERATION, generate_memory_cards)
    registry.register(WorkerTaskType.FEYNMAN_EVALUATION, evaluate_feynman_session)
    registry.register(WorkerTaskType.KNOWLEDGE_GRAPH_UPDATE, update_knowledge_graph)
    registry.register(WorkerTaskType.COMMUNITY_INDEXING, index_community_asset)
    registry.register(WorkerTaskType.TRANSCRIBE_AUDIO, transcribe_audio)
    registry.register(WorkerTaskType.TIMELINE_INTEGRATION, integrate_timeline_to_note)
    return registry


def _require_string(payload: dict[str, object], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required")
    return value.strip()


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        raise ValueError("core_concepts must be a list")
    return [str(item) for item in value if str(item).strip()]
