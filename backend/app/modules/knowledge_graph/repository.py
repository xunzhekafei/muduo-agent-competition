from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.knowledge_graph.service import KnowledgeGraphService


def build_knowledge_graph_service(db: Session) -> KnowledgeGraphService:
    return KnowledgeGraphService(db)
