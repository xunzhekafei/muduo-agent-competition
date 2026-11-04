from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.notes.service import NoteService


def build_note_service(db: Session) -> NoteService:
    return NoteService(db)
