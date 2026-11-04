"""知识库检索：查询向量化 → 余弦相似度 → top-k 知识块。

降级链：真实 embedding → 语义检索；mock / 向量化失败 → 中文二元组关键词匹配。
查询前自动 ensure_indexed（增量），保证检索结果包含最新笔记。
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

# 语义检索的最低相似度：embedding-3 上短文本普遍 0.2+，太低会返回不相关内容
MIN_SEMANTIC_SCORE = 0.15


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _bigrams(text: str) -> set[str]:
    """中文二元组切词（无空格分词的低成本近似）。"""
    cleaned = "".join(ch for ch in (text or "") if ch.isalnum())
    if len(cleaned) < 2:
        return {cleaned} if cleaned else set()
    return {cleaned[i : i + 2] for i in range(len(cleaned) - 1)}


def _keyword_score(query: str, text: str) -> float:
    q = _bigrams(query)
    if not q:
        return 0.0
    t = _bigrams(text)
    return len(q & t) / len(q)


def search_chunks(
    db: Session,
    user_id: str,
    query: str,
    *,
    limit: int = 5,
) -> list[dict]:
    """检索最相关的知识块。返回 [{chunkId, noteId, title, snippet, score, via}]。"""
    from app.modules.knowledge_base.indexer import ensure_indexed
    from app.modules.knowledge_base.models import KnowledgeChunkModel

    query = (query or "").strip()
    if not query:
        return []
    limit = max(1, min(int(limit or 5), 10))

    ensure_indexed(db, user_id)

    rows = db.execute(
        select(KnowledgeChunkModel).where(
            KnowledgeChunkModel.owner_id == user_id,
            KnowledgeChunkModel.deleted_at.is_(None),
        )
    ).scalars().all()
    if not rows:
        return []

    def _to_hit(row, score: float, via: str) -> dict:
        snippet = row.content[:160] + ("…" if len(row.content) > 160 else "")
        return {
            "chunkId": row.id,
            "noteId": row.source_note_id,
            "title": row.title,
            "snippet": snippet,
            "score": round(score, 4),
            "via": via,
        }

    # 语义路径：查询向量化后与各块做余弦
    vectors_available = [r for r in rows if r.embedding]
    if vectors_available:
        from app.integrations.embedding import EmbeddingRequest
        from app.integrations.registry import get_embedding_provider

        try:
            provider = get_embedding_provider()
            if getattr(provider, "provider_name", "") != "mock":
                query_vec = provider.embed(EmbeddingRequest(inputs=[query])).vectors[0]
                scored = [
                    _to_hit(r, _cosine(query_vec, r.embedding), "semantic")
                    for r in vectors_available
                ]
                scored.sort(key=lambda hit: hit["score"], reverse=True)
                hits = [h for h in scored if h["score"] >= MIN_SEMANTIC_SCORE]
                if not hits and scored:  # 全部低于阈值时保底返回最相关的一条
                    hits = [scored[0]]
                return hits[:limit]
        except Exception:  # noqa: BLE001 —— 向量化失败降级关键词
            pass

    # 关键词路径（mock / 无向量 / 向量化失败）
    scored = []
    for row in rows:
        score = _keyword_score(query, f"{row.title} {row.content}")
        if score > 0:
            scored.append(_to_hit(row, score, "keyword"))
    scored.sort(key=lambda hit: hit["score"], reverse=True)
    return scored[:limit]
