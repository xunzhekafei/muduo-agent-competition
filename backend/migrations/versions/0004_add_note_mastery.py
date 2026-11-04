"""add mastery column to notes

Revision ID: 0004_add_note_mastery
Revises: 0003_extend_note_block_types
Create Date: 2026-05-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_add_note_mastery"
down_revision: Union[str, None] = "0003_extend_note_block_types"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("mastery", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("notes") as batch_op:
        batch_op.drop_column("mastery")
