from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.enums import DashboardTaskMode, Priority


class WeeklyGoal(BaseModel):
    completed_hours: float = Field(alias="completedHours")
    target_hours: float = Field(alias="targetHours")
    percentage: int


class DashboardTask(BaseModel):
    id: str
    title: str
    course_name: str = Field(alias="courseName")
    priority: Priority
    duration_minutes: int = Field(alias="durationMinutes")
    mode: DashboardTaskMode
    count_label: str | None = Field(default=None, alias="countLabel")


class MasterySummary(BaseModel):
    mastered: int
    reviewing: int
    weak: int


class DashboardStats(BaseModel):
    today_minutes: float = Field(alias="todayMinutes")
    memory_mastered: int = Field(alias="memoryMastered")
    thinking_count: int = Field(alias="thinkingCount")
    feynman_count: int = Field(alias="feynmanCount")


class LearningActivity(BaseModel):
    id: str
    mode: DashboardTaskMode
    action: str
    course_name: str = Field(alias="courseName")
    time: str


class WeeklyTrendDay(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    day: str
    course: float = Field(alias="课程学习")
    feynman: float = Field(alias="费曼练习")
    memory: float = Field(alias="记忆复习")
    thinking: float = Field(alias="思考推导")


class RecentCourse(BaseModel):
    id: str
    name: str
    subject: str
    notes: int
    mastery: int
    color: str


class DashboardOverview(BaseModel):
    weekly_goal: WeeklyGoal = Field(alias="weeklyGoal")
    today_study_minutes: int = Field(alias="todayStudyMinutes")
    streak_days: int = Field(alias="streakDays")
    stats: DashboardStats
    tasks: list[DashboardTask]
    mastery: MasterySummary
    activities: list[LearningActivity]
    weekly_trend: list[WeeklyTrendDay] = Field(alias="weeklyTrend")
    recent_courses: list[RecentCourse] = Field(alias="recentCourses")


DashboardOverviewResponse = DataResponse[DashboardOverview]
