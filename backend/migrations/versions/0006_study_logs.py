"""add study_logs table

Revision ID: 0006_study_logs
Revises: 0005_learning_activities
Create Date: 2026-05-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_study_logs"
down_revision: Union[str, None] = "0005_learning_activities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def enum_type(*values: str) -> sa.Enum:
    return sa.Enum(*values, native_enum=False)


def upgrade() -> None:
    op.create_table(
        "study_logs",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("log_date", sa.Date(), nullable=False),
        sa.Column("mode", enum_type("quick", "thinking", "memory", "feynman"), nullable=False),
        sa.Column("duration_minutes", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_study_logs"),
        sa.UniqueConstraint("owner_id", "log_date", "mode", name="uq_study_logs_owner_date_mode"),
    )
    op.create_index("ix_study_logs_owner_id", "study_logs", ["owner_id"])
    op.create_index("ix_study_logs_log_date", "study_logs", ["log_date"])


def downgrade() -> None:
    op.drop_index("ix_study_logs_log_date", table_name="study_logs")
    op.drop_index("ix_study_logs_owner_id", table_name="study_logs")
    op.drop_table("study_logs")
