"""extend NoteBlockType enum with rich block types

Revision ID: 0003_extend_note_block_types
Revises: 0002_zhangyuxuan_learning_modules
Create Date: 2026-05-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_extend_note_block_types"
down_revision: Union[str, None] = "0002_zhangyuxuan_learning_modules"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def enum_type(*values: str) -> sa.Enum:
    return sa.Enum(*values, native_enum=False)


def upgrade() -> None:
    with op.batch_alter_table("note_blocks") as batch_op:
        batch_op.alter_column(
            "type",
            existing_type=enum_type("paragraph", "heading", "quote", "todo", "code"),
            type_=enum_type(
                "paragraph", "heading", "quote", "todo", "code",
                "table", "ai_summary", "thinking", "memory_cards",
                "formula", "annotation", "relations",
            ),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("note_blocks") as batch_op:
        batch_op.alter_column(
            "type",
            existing_type=enum_type(
                "paragraph", "heading", "quote", "todo", "code",
                "table", "ai_summary", "thinking", "memory_cards",
                "formula", "annotation", "relations",
            ),
            type_=enum_type("paragraph", "heading", "quote", "todo", "code"),
            nullable=False,
        )
