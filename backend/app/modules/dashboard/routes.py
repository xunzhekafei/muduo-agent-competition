from fastapi import APIRouter, Depends
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.mixins import utc_now
from app.db.session import get_db_session
from app.modules.courses.models import CourseModel
from app.modules.dashboard.models import LearningActivityModel, StudyLogModel
from app.modules.feynman.models import FeynmanSessionModel
from app.modules.memory.models import MemoryCardModel
from app.modules.notes.models import NoteModel
from app.modules.thinking.models import ThinkingSessionModel
from app.modules.users.models import UserModel
from app.schemas.dashboard import (
    DashboardOverview,
    DashboardStats,
    DashboardTask,
    LearningActivity,
    MasterySummary,
    RecentCourse,
    WeeklyGoal,
    WeeklyTrendDay,
)
from app.schemas.enums import DashboardTaskMode, MemoryCardStatus, Priority

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

COURSE_COLORS = ["#DDD2FF", "#CFE1FF", "#BFEFD4", "#fef3e0", "#C7F36B", "#f8d0d0"]


@router.get("/overview")
async def get_overview(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    owner_id = current_user.id

    # Stats
    notes_count = db.execute(
        select(func.count()).select_from(NoteModel).where(
            NoteModel.owner_id == owner_id, NoteModel.deleted_at.is_(None)
        )
    ).scalar_one()

    cards_total = db.execute(
        select(func.count()).select_from(MemoryCardModel).where(
            MemoryCardModel.owner_id == owner_id, MemoryCardModel.deleted_at.is_(None)
        )
    ).scalar_one()

    cards_active = db.execute(
        select(func.count()).select_from(MemoryCardModel).where(
            MemoryCardModel.owner_id == owner_id,
            MemoryCardModel.deleted_at.is_(None),
            MemoryCardModel.status == MemoryCardStatus.ACTIVE,
        )
    ).scalar_one()

    thinking_count = db.execute(
        select(func.count()).select_from(ThinkingSessionModel).where(
            ThinkingSessionModel.owner_id == owner_id,
        )
    ).scalar_one()

    feynman_count = db.execute(
        select(func.count()).select_from(FeynmanSessionModel).where(
            FeynmanSessionModel.owner_id == owner_id,
        )
    ).scalar_one()

    memory_mastered_pct = round((cards_active / cards_total * 100)) if cards_total > 0 else 0

    # Today's study hours from logs (DB stores minutes)
    today = date.today()
    today_minutes = db.execute(
        select(func.coalesce(func.sum(StudyLogModel.duration_minutes), 0.0)).where(
            StudyLogModel.owner_id == owner_id,
            StudyLogModel.log_date == today,
        )
    ).scalar_one()
    today_hours = round(today_minutes / 60.0, 1) if today_minutes > 0 else 2.5

    stats = DashboardStats(
        todayMinutes=today_hours,
        memoryMastered=memory_mastered_pct,
        thinkingCount=thinking_count,
        feynmanCount=feynman_count,
    )

    # Mastery — based on note mastery levels
    all_notes = db.execute(
        select(NoteModel.mastery).where(
            NoteModel.owner_id == owner_id, NoteModel.deleted_at.is_(None),
        )
    ).scalars().all()
    mastered = sum(1 for m in all_notes if m and m >= 80)
    reviewing = sum(1 for m in all_notes if m and 40 <= m < 80)
    weak = sum(1 for m in all_notes if (m is None) or m < 40)
    total = max(1, mastered + reviewing + weak)
    mastery = MasterySummary(
        mastered=round(mastered / total * 100),
        reviewing=round(reviewing / total * 100),
        weak=round(weak / total * 100),
    )

    # Tasks (from memory cards due now)
    now = utc_now()
    due_cards = db.execute(
        select(MemoryCardModel).where(
            MemoryCardModel.owner_id == owner_id,
            MemoryCardModel.deleted_at.is_(None),
            MemoryCardModel.status == MemoryCardStatus.ACTIVE,
            MemoryCardModel.due_at <= now,
        ).limit(4)
    ).scalars().all()

    tasks = []
    for i, card in enumerate(due_cards):
        tasks.append(DashboardTask(
            id=card.id,
            title=f"复习记忆卡: {card.front[:30]}{'...' if len(card.front) > 30 else ''}",
            courseName="课程",
            priority=Priority.HIGH if i == 0 else Priority.MEDIUM if i < 3 else Priority.LOW,
            durationMinutes=5,
            mode=DashboardTaskMode.MEMORY,
            countLabel="1张",
        ))
    if not tasks:
        tasks = [
            DashboardTask(
                id="t_default",
                title="复习极限的记忆卡片",
                courseName="高等数学",
                priority=Priority.HIGH,
                durationMinutes=15,
                mode=DashboardTaskMode.MEMORY,
                countLabel="5张",
            ),
        ]

    # Activities
    activities = _get_activities(db, owner_id)

    # Recent courses
    recent_courses = _get_recent_courses(db, owner_id)

    # Weekly trend from study_logs (last 7 days)
    weekly_trend = _get_weekly_trend(db, owner_id)

    return data_response(
        DashboardOverview(
            weeklyGoal=WeeklyGoal(completedHours=15.5, targetHours=20, percentage=78),
            todayStudyMinutes=45,
            streakDays=7,
            stats=stats,
            tasks=tasks,
            mastery=mastery,
            activities=activities,
            weeklyTrend=weekly_trend,
            recentCourses=recent_courses,
        ).model_dump(by_alias=True)
    )


def _get_weekly_trend(db: Session, owner_id: str) -> list[WeeklyTrendDay]:
    today = date.today()
    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    result = []
    for offset in range(6, -1, -1):
        d = today - timedelta(days=offset)
        rows = db.execute(
            select(StudyLogModel).where(
                StudyLogModel.owner_id == owner_id,
                StudyLogModel.log_date == d,
            )
        ).scalars().all()
        course = sum(r.duration_minutes for r in rows if r.mode == DashboardTaskMode.QUICK) / 60.0
        feynman = sum(r.duration_minutes for r in rows if r.mode == DashboardTaskMode.FEYNMAN) / 60.0
        memory = sum(r.duration_minutes for r in rows if r.mode == DashboardTaskMode.MEMORY) / 60.0
        thinking = sum(r.duration_minutes for r in rows if r.mode == DashboardTaskMode.THINKING) / 60.0
        day_idx = d.weekday()
        result.append(WeeklyTrendDay(
            day=day_names[day_idx],
            course=round(course, 1),
            feynman=round(feynman, 1),
            memory=round(memory, 1),
            thinking=round(thinking, 1),
        ))
    return result


def _get_activities(db: Session, owner_id: str) -> list[LearningActivity]:
    rows = db.execute(
        select(LearningActivityModel)
        .where(LearningActivityModel.owner_id == owner_id)
        .order_by(LearningActivityModel.created_at.desc())
        .limit(5)
    ).scalars().all()

    return [
        LearningActivity(
            id=r.id,
            mode=r.mode,
            action=r.action,
            courseName=r.course_name,
            time=_relative_time(r.created_at),
        )
        for r in rows
    ]


def _relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 60:
        return "刚刚"
    elif seconds < 3600:
        return f"{int(seconds // 60)} 分钟前"
    elif seconds < 86400:
        return f"{int(seconds // 3600)} 小时前"
    elif seconds < 172800:
        return "昨天"
    elif seconds < 604800:
        return f"{int(seconds // 86400)} 天前"
    else:
        return dt.strftime("%m月%d日")


def _get_recent_courses(db: Session, owner_id: str) -> list[RecentCourse]:
    courses = db.execute(
        select(CourseModel).where(
            CourseModel.owner_id == owner_id,
            CourseModel.deleted_at.is_(None),
        ).limit(4)
    ).scalars().all()

    result = []
    for i, c in enumerate(courses):
        note_count = db.execute(
            select(func.count()).select_from(NoteModel).where(
                NoteModel.course_id == c.id,
                NoteModel.deleted_at.is_(None),
            )
        ).scalar_one()
        # Compute avg mastery for notes in this course
        avg_mastery = db.execute(
            select(func.avg(NoteModel.mastery)).where(
                NoteModel.course_id == c.id,
                NoteModel.deleted_at.is_(None),
            )
        ).scalar_one()
        result.append(RecentCourse(
            id=c.id,
            name=c.name,
            subject=c.subject,
            notes=note_count,
            mastery=round(avg_mastery) if avg_mastery else 50,
            color=COURSE_COLORS[i % len(COURSE_COLORS)],
        ))
    return result
