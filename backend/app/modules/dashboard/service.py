from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.ids import new_prefixed_id
from app.db.mixins import utc_now
from app.modules.dashboard.models import LearningActivityModel, StudyLogModel
from app.schemas.enums import DashboardTaskMode


def log_study_activity(
    db: Session,
    *,
    owner_id: str,
    mode: DashboardTaskMode,
    action: str,
    course_name: str,
    duration_minutes: float = 5.0,
) -> None:
    # Create activity
    db.add(LearningActivityModel(
        owner_id=owner_id,
        mode=mode,
        action=action,
        course_name=course_name,
    ))

    # Upsert daily study log
    today = date.today()
    existing = db.execute(
        select(StudyLogModel).where(
            StudyLogModel.owner_id == owner_id,
            StudyLogModel.log_date == today,
            StudyLogModel.mode == mode,
        )
    ).scalar_one_or_none()

    if existing:
        existing.duration_minutes += duration_minutes
        db.add(existing)
    else:
        db.add(StudyLogModel(
            owner_id=owner_id,
            log_date=today,
            mode=mode,
            duration_minutes=duration_minutes,
        ))
    db.flush()
