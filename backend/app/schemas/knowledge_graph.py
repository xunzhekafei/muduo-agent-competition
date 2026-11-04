from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.enums import ConceptRelationType, MasteryLevel


class Concept(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    name: str
    course_id: str | None = Field(default=None, alias="courseId")
    source_note_ids: list[str] = Field(default_factory=list, alias="sourceNoteIds")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ConceptRelation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    source_concept_id: str = Field(alias="sourceConceptId")
    target_concept_id: str = Field(alias="targetConceptId")
    relation_type: ConceptRelationType = Field(alias="relationType")
    weight: float
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class MasteryState(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    concept_id: str = Field(alias="conceptId")
    level: MasteryLevel
    confidence: float
    evidence: list[str] = Field(default_factory=list)
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class KnowledgeGraph(BaseModel):
    concepts: list[Concept]
    relations: list[ConceptRelation]


class ConceptUpsertRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    course_id: str | None = Field(default=None, alias="courseId")
    source_note_ids: list[str] = Field(default_factory=list, alias="sourceNoteIds")


class ConceptRelationCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_concept_id: str = Field(alias="sourceConceptId")
    target_concept_id: str = Field(alias="targetConceptId")
    relation_type: ConceptRelationType = Field(default=ConceptRelationType.RELATED_TO, alias="relationType")
    weight: float = Field(default=1.0, gt=0)


class MasteryStateUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    concept_id: str = Field(alias="conceptId")
    level: MasteryLevel
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(default_factory=list)


ConceptResponse = DataResponse[Concept]
ConceptRelationResponse = DataResponse[ConceptRelation]
MasteryStateResponse = DataResponse[MasteryState]
KnowledgeGraphResponse = DataResponse[KnowledgeGraph]
