from __future__ import annotations

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import ConceptRelationType, MasteryLevel


class ConceptModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("concept"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_note_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class ConceptRelationModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "concept_relations"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("crel"),
    )
    source_concept_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_concept_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relation_type: Mapped[ConceptRelationType] = enum_column(
        ConceptRelationType,
        "type",
        default=ConceptRelationType.RELATED_TO,
        nullable=False,
        index=True,
    )
    weight: Mapped[float] = mapped_column(default=1.0, nullable=False)


class MasteryStateModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "mastery_states"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("mastery"),
    )
    concept_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    level: Mapped[MasteryLevel] = enum_column(
        MasteryLevel,
        default=MasteryLevel.UNKNOWN,
        nullable=False,
        index=True,
    )
    confidence: Mapped[float] = mapped_column(default=0.0, nullable=False)
    evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


__all__ = ["ConceptModel", "ConceptRelationModel", "MasteryStateModel"]
