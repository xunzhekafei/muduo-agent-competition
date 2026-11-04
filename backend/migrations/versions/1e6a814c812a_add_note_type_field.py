"""add note_type field

Revision ID: 1e6a814c812a
Revises: 0006_study_logs
Create Date: 2026-07-08 14:43:11.643235
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1e6a814c812a'
down_revision: Union[str, None] = '0006_study_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notes', sa.Column('note_type', sa.String(length=20), nullable=False, server_default='manual'))
    op.create_index(op.f('ix_notes_note_type'), 'notes', ['note_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notes_note_type'), table_name='notes')
    op.drop_column('notes', 'note_type')
