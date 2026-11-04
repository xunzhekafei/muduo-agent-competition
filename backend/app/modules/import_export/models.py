from __future__ import annotations

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import ExportFormat, ImportExportJobType, ImportExportStatus, ResourceType


class ImportExportJobModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "import_export_jobs"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("job"),
    )
    job_type: Mapped[ImportExportJobType] = enum_column(
        ImportExportJobType,
        "type",
        nullable=False,
        index=True,
    )
    status: Mapped[ImportExportStatus] = enum_column(
        ImportExportStatus,
        default=ImportExportStatus.QUEUED,
        index=True,
    )
    course_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("resources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    task_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("ai_tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_type: Mapped[ResourceType | None] = enum_column(ResourceType, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    export_format: Mapped[ExportFormat | None] = enum_column(ExportFormat, nullable=True)
    note_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    options: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    result_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(120), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(2000), nullable=True)


__all__ = ["ImportExportJobModel"]
