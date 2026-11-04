from __future__ import annotations

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode, raise_not_found, raise_validation_error, require_text
from app.modules.courses.models import CourseModel
from app.modules.knowledge_graph.models import (
    ConceptModel,
    ConceptRelationModel,
    MasteryStateModel,
)
from app.modules.notes.service import NoteService
from app.schemas.knowledge_graph import (
    Concept,
    ConceptRelation,
    ConceptRelationCreateRequest,
    ConceptUpsertRequest,
    KnowledgeGraph,
    MasteryState,
    MasteryStateUpdateRequest,
)


class KnowledgeGraphService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert_concept(self, *, owner_id: str, request: ConceptUpsertRequest) -> Concept:
        if request.course_id:
            self._get_course(owner_id=owner_id, course_id=request.course_id)
        for note_id in request.source_note_ids:
            NoteService(self.db).get_note_model(owner_id=owner_id, note_id=note_id)
        name = require_text(request.name, "概念名称不能为空")
        concept = self.db.execute(
            select(ConceptModel).where(
                ConceptModel.owner_id == owner_id,
                ConceptModel.course_id == request.course_id,
                ConceptModel.name == name,
            )
        ).scalar_one_or_none()
        if concept is None:
            concept = ConceptModel(
                owner_id=owner_id,
                name=name,
                course_id=request.course_id,
                source_note_ids=request.source_note_ids,
            )
        else:
            merged = list(dict.fromkeys([*concept.source_note_ids, *request.source_note_ids]))
            concept.source_note_ids = merged
        self.db.add(concept)
        self.db.commit()
        self.db.refresh(concept)
        return to_concept_schema(concept)

    def get_graph(self, *, owner_id: str) -> KnowledgeGraph:
        concepts = self.db.execute(
            select(ConceptModel)
            .where(ConceptModel.owner_id == owner_id)
            .order_by(ConceptModel.updated_at.desc())
        ).scalars().all()
        relations = self.db.execute(
            select(ConceptRelationModel)
            .where(ConceptRelationModel.owner_id == owner_id)
            .order_by(ConceptRelationModel.created_at.asc())
        ).scalars().all()
        return KnowledgeGraph(
            concepts=[to_concept_schema(concept) for concept in concepts],
            relations=[to_concept_relation_schema(relation) for relation in relations],
        )

    def link_concepts(
        self,
        *,
        owner_id: str,
        request: ConceptRelationCreateRequest,
    ) -> ConceptRelation:
        self.get_concept_model(owner_id=owner_id, concept_id=request.source_concept_id)
        self.get_concept_model(owner_id=owner_id, concept_id=request.target_concept_id)
        if request.source_concept_id == request.target_concept_id:
            raise_validation_error("概念关系不能指向自身")
        relation = ConceptRelationModel(
            owner_id=owner_id,
            source_concept_id=request.source_concept_id,
            target_concept_id=request.target_concept_id,
            relation_type=request.relation_type,
            weight=request.weight,
        )
        self.db.add(relation)
        self.db.commit()
        self.db.refresh(relation)
        return to_concept_relation_schema(relation)

    def set_mastery(self, *, owner_id: str, request: MasteryStateUpdateRequest) -> MasteryState:
        self.get_concept_model(owner_id=owner_id, concept_id=request.concept_id)
        mastery = self.db.execute(
            select(MasteryStateModel).where(
                MasteryStateModel.owner_id == owner_id,
                MasteryStateModel.concept_id == request.concept_id,
            )
        ).scalar_one_or_none()
        if mastery is None:
            mastery = MasteryStateModel(owner_id=owner_id, concept_id=request.concept_id)
        mastery.level = request.level
        mastery.confidence = request.confidence
        mastery.evidence = request.evidence
        self.db.add(mastery)
        self.db.commit()
        self.db.refresh(mastery)
        return to_mastery_state_schema(mastery)

    def get_concept_model(self, *, owner_id: str, concept_id: str) -> ConceptModel:
        concept = self.db.execute(
            select(ConceptModel).where(
                ConceptModel.id == concept_id,
                ConceptModel.owner_id == owner_id,
            )
        ).scalar_one_or_none()
        if concept is None:
            raise_not_found("概念不存在")
        return concept

    def _get_course(self, *, owner_id: str, course_id: str) -> CourseModel:
        course = self.db.execute(
            select(CourseModel).where(
                CourseModel.id == course_id,
                CourseModel.owner_id == owner_id,
                CourseModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if course is None:
            raise_not_found("课程不存在")
        return course


def to_concept_schema(concept: ConceptModel) -> Concept:
    return Concept(
        id=concept.id,
        owner_id=concept.owner_id,
        name=concept.name,
        course_id=concept.course_id,
        source_note_ids=concept.source_note_ids,
        created_at=concept.created_at,
        updated_at=concept.updated_at,
    )


def to_concept_relation_schema(relation: ConceptRelationModel) -> ConceptRelation:
    return ConceptRelation(
        id=relation.id,
        owner_id=relation.owner_id,
        source_concept_id=relation.source_concept_id,
        target_concept_id=relation.target_concept_id,
        relation_type=relation.relation_type,
        weight=relation.weight,
        created_at=relation.created_at,
        updated_at=relation.updated_at,
    )


def to_mastery_state_schema(mastery: MasteryStateModel) -> MasteryState:
    return MasteryState(
        id=mastery.id,
        owner_id=mastery.owner_id,
        concept_id=mastery.concept_id,
        level=mastery.level,
        confidence=mastery.confidence,
        evidence=mastery.evidence,
        created_at=mastery.created_at,
        updated_at=mastery.updated_at,
    )

