from __future__ import annotations

from datetime import timedelta

from fastapi import status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode, require_text
from app.db.mixins import utc_now
from app.modules.memory.models import MemoryCardModel, ReviewRecordModel
from app.modules.notes.service import NoteService
from app.schemas.common import Pagination
from app.schemas.enums import MemoryCardStatus, ReviewGrade
from app.schemas.memory import (
    MemoryCard,
    MemoryCardCreateRequest,
    ReviewRecord,
    ReviewRecordCreateRequest,
)


class MemoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_card(self, *, owner_id: str, request: MemoryCardCreateRequest) -> MemoryCard:
        if request.source_note_id:
            NoteService(self.db).get_note_model(owner_id=owner_id, note_id=request.source_note_id)
        card = MemoryCardModel(
            owner_id=owner_id,
            source_note_id=request.source_note_id,
            front=require_text(request.front, "卡片正面不能为空"),
            back=require_text(request.back, "卡片背面不能为空"),
            tags=sorted({tag.strip().lower() for tag in request.tags if tag.strip()}),
        )
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return to_memory_card_schema(card)

    def list_due_cards(
        self,
        *,
        owner_id: str,
        page: int,
        page_size: int,
        source_note_id: str | None = None,
    ) -> tuple[list[MemoryCard], Pagination]:
        now = utc_now()
        conditions = [
            MemoryCardModel.owner_id == owner_id,
            MemoryCardModel.status == MemoryCardStatus.ACTIVE,
            MemoryCardModel.deleted_at.is_(None),
        ]
        if source_note_id:
            conditions.append(MemoryCardModel.source_note_id == source_note_id)
        else:
            conditions.append(MemoryCardModel.due_at <= now)
        query = select(MemoryCardModel).where(*conditions)
        total = self._count(query)
        cards = self.db.execute(
            query.order_by(MemoryCardModel.due_at.asc()).offset((page - 1) * page_size).limit(page_size)
        ).scalars().all()
        return [to_memory_card_schema(card) for card in cards], Pagination(page=page, page_size=page_size, total=total)

    def record_review(
        self,
        *,
        owner_id: str,
        card_id: str,
        request: ReviewRecordCreateRequest,
    ) -> ReviewRecord:
        card = self.get_card_model(owner_id=owner_id, card_id=card_id)
        interval_days, ease_factor = self._schedule(card.interval_days, card.ease_factor, request.grade)
        reviewed_at = utc_now()
        next_due_at = reviewed_at + timedelta(days=interval_days)
        card.interval_days = interval_days
        card.ease_factor = ease_factor
        card.due_at = next_due_at
        review = ReviewRecordModel(
            owner_id=owner_id,
            card_id=card.id,
            grade=request.grade,
            reviewed_at=reviewed_at,
            next_due_at=next_due_at,
            interval_days=interval_days,
        )
        self.db.add_all([card, review])
        self.db.commit()
        self.db.refresh(review)
        return to_review_record_schema(review)

    def update_card(self, *, owner_id: str, card_id: str, request: MemoryCardCreateRequest) -> MemoryCard:
        card = self.get_card_model(owner_id=owner_id, card_id=card_id)
        card.front = require_text(request.front, "卡片正面不能为空")
        card.back = require_text(request.back, "卡片背面不能为空")
        if request.tags:
            card.tags = sorted({tag.strip().lower() for tag in request.tags if tag.strip()})
        if request.source_note_id is not None:
            card.source_note_id = request.source_note_id
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return to_memory_card_schema(card)

    def delete_card(self, *, owner_id: str, card_id: str) -> None:
        card = self.get_card_model(owner_id=owner_id, card_id=card_id)
        card.mark_deleted()
        self.db.add(card)
        self.db.commit()

    def get_card_model(self, *, owner_id: str, card_id: str) -> MemoryCardModel:
        card = self.db.execute(
            select(MemoryCardModel).where(
                MemoryCardModel.id == card_id,
                MemoryCardModel.owner_id == owner_id,
                MemoryCardModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if card is None:
            raise AppError(ErrorCode.RESOURCE_NOT_FOUND, "记忆卡片不存在", status_code=status.HTTP_404_NOT_FOUND)
        return card

    def _schedule(self, current_interval: int, ease_factor: float, grade: ReviewGrade) -> tuple[int, float]:
        if grade == ReviewGrade.AGAIN:
            return 1, max(1.3, ease_factor - 0.2)
        if grade == ReviewGrade.HARD:
            return max(1, round((current_interval or 1) * 1.2)), max(1.3, ease_factor - 0.1)
        if grade == ReviewGrade.EASY:
            return max(4, round((current_interval or 1) * (ease_factor + 0.3))), ease_factor + 0.15
        return max(2, round((current_interval or 1) * ease_factor)), ease_factor

    def _count(self, query: Select) -> int:
        return self.db.execute(select(func.count()).select_from(query.order_by(None).subquery())).scalar_one()


def to_memory_card_schema(card: MemoryCardModel) -> MemoryCard:
    return MemoryCard(
        id=card.id,
        owner_id=card.owner_id,
        source_note_id=card.source_note_id,
        front=card.front,
        back=card.back,
        tags=card.tags,
        status=card.status,
        interval_days=card.interval_days,
        ease_factor=card.ease_factor,
        due_at=card.due_at,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


def to_review_record_schema(review: ReviewRecordModel) -> ReviewRecord:
    return ReviewRecord(
        id=review.id,
        owner_id=review.owner_id,
        card_id=review.card_id,
        grade=review.grade,
        reviewed_at=review.reviewed_at,
        next_due_at=review.next_due_at,
        interval_days=review.interval_days,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )

