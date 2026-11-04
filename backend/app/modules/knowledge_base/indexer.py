"""知识库索引器：笔记 → 分块 → 向量化 → 入库。

增量策略：每篇笔记算一个内容 hash，存进 chunk 的 source_hash；
查询前 ensure_indexed 只对 hash 变化或缺失的笔记重新索引，其余跳过。
embedding 调用失败时照常入库（向量为 None），检索层自动降级为关键词匹配。
"""

from __future__ import annotations

from hashlib import sha256

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

# 分块参数：块太小语义不完整，太大检索不精准；overlap 让边界信息不丢
CHUNK_SIZE = 400
CHUNK_OVERLAP = 60


def ensure_schema(db: Session) -> None:
    """确保知识块表存在（部署/旧库场景下自举，checkfirst 幂等）。"""
    import app.db.models  # noqa: F401  注册全部模型，否则 users 等外键目标解析不到

    from app.modules.knowledge_base.models import KnowledgeChunkModel

    KnowledgeChunkModel.__table__.create(bind=db.get_bind(), checkfirst=True)


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """把长文本切成重叠窗口块。空文本返回空列表。"""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    step = max(1, size - overlap)
    start = 0
    while start < len(text):
        piece = text[start : start + size].strip()
        if piece:
            chunks.append(piece)
        start += step
    return chunks


def _note_text(db: Session, note) -> str:
    """笔记全文 = 标题 + 各 block 正文（按 position 排序）。"""
    from app.modules.notes.models import NoteBlockModel

    blocks = db.execute(
        select(NoteBlockModel.content)
        .where(NoteBlockModel.note_id == note.id)
        .order_by(NoteBlockModel.position.asc())
    ).scalars().all()
    body = "\n".join(str(b).strip() for b in blocks if b and str(b).strip())
    return f"{note.title or ''}\n{body}".strip()


def _content_hash(text: str) -> str:
    return sha256(text.encode("utf-8")).hexdigest()


def _embed_texts(texts: list[str]) -> tuple[list[list[float] | None], str]:
    """批量向量化；provider 为 mock 或调用失败时返回全 None（检索降级）。"""
    from app.integrations.embedding import EmbeddingRequest
    from app.integrations.registry import get_embedding_provider

    provider = get_embedding_provider()
    name = getattr(provider, "provider_name", "unknown")
    if not texts:
        return [], name
    if name == "mock":
        return [None] * len(texts), name
    try:
        result = provider.embed(EmbeddingRequest(inputs=texts))
        vectors = result.vectors
        if len(vectors) != len(texts):
            return [None] * len(texts), name
        return list(vectors), name
    except Exception:  # noqa: BLE001 —— 向量化失败不阻断入库
        return [None] * len(texts), name


def index_note(db: Session, user_id: str, note_id: str) -> dict:
    """索引单篇笔记：删旧块 → 切块 → 向量化 → 写入。返回统计。"""
    from app.modules.knowledge_base.models import KnowledgeChunkModel
    from app.modules.notes.models import NoteModel

    ensure_schema(db)
    note = db.execute(
        select(NoteModel).where(
            NoteModel.id == note_id,
            NoteModel.owner_id == user_id,
            NoteModel.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if note is None:
        return {"noteId": note_id, "chunks": 0, "embedded": 0, "error": "笔记不存在"}

    text = _note_text(db, note)
    source_hash = _content_hash(text)
    chunks = chunk_text(text)

    # 旧块是派生数据，直接删掉重建
    db.execute(
        delete(KnowledgeChunkModel).where(KnowledgeChunkModel.source_note_id == note_id)
    )
    vectors, provider_name = _embed_texts(chunks)

    for position, (piece, vector) in enumerate(zip(chunks, vectors)):
        db.add(
            KnowledgeChunkModel(
                owner_id=user_id,
                source_note_id=note_id,
                source_hash=source_hash,
                title=note.title or "",
                content=piece,
                position=position,
                embedding=vector,
            )
        )
    db.commit()
    return {
        "noteId": note_id,
        "title": note.title or "",
        "chunks": len(chunks),
        "embedded": sum(1 for v in vectors if v is not None),
        "provider": provider_name,
    }


def index_all_notes(db: Session, user_id: str) -> dict:
    """全量重建某用户的知识库索引。"""
    from app.modules.notes.models import NoteModel

    ensure_schema(db)
    notes = db.execute(
        select(NoteModel.id).where(
            NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None)
        )
    ).scalars().all()
    totals = {"notes": len(notes), "chunks": 0, "embedded": 0}
    for note_id in notes:
        result = index_note(db, user_id, note_id)
        totals["chunks"] += result.get("chunks", 0)
        totals["embedded"] += result.get("embedded", 0)
    return totals


def ensure_indexed(db: Session, user_id: str) -> dict:
    """增量同步：只索引 hash 变化/缺失的笔记，其余跳过。"""
    from app.modules.knowledge_base.models import KnowledgeChunkModel
    from app.modules.notes.models import NoteModel

    ensure_schema(db)
    notes = db.execute(
        select(NoteModel).where(
            NoteModel.owner_id == user_id, NoteModel.deleted_at.is_(None)
        )
    ).scalars().all()

    indexed_hashes: dict[str | None, str] = {}
    rows = db.execute(
        select(KnowledgeChunkModel.source_note_id, KnowledgeChunkModel.source_hash)
        .where(
            KnowledgeChunkModel.owner_id == user_id,
            KnowledgeChunkModel.deleted_at.is_(None),
        )
        .distinct()
    ).all()
    for note_id, source_hash in rows:
        indexed_hashes[note_id] = source_hash

    reindexed = 0
    for note in notes:
        text = _note_text(db, note)
        if indexed_hashes.get(note.id) == _content_hash(text):
            continue  # 没变过，跳过
        index_note(db, user_id, note.id)
        reindexed += 1
    return {"notes": len(notes), "reindexed": reindexed}
