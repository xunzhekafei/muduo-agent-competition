"""add learning_activities table

Revision ID: 0005_learning_activities
Revises: 0004_add_note_mastery
Create Date: 2026-05-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_learning_activities"
down_revision: Union[str, None] = "0004_add_note_mastery"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def enum_type(*values: str) -> sa.Enum:
    return sa.Enum(*values, native_enum=False)


def upgrade() -> None:
    op.create_table(
        "learning_activities",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("action", sa.String(length=500), nullable=False),
        sa.Column("course_name", sa.String(length=160), nullable=False),
        sa.Column("mode", enum_type("quick", "thinking", "memory", "feynman"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_learning_activities"),
    )
    op.create_index("ix_learning_activities_owner_id", "learning_activities", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_learning_activities_owner_id", table_name="learning_activities")
    op.drop_table("learning_activities")
