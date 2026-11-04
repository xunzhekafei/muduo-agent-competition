"""add ZhangYuxuan learning modules

Revision ID: 0002_zhangyuxuan_learning_modules
Revises: 0001_initial_chaiyifan_models
Create Date: 2026-05-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_zhangyuxuan_learning_modules"
down_revision: Union[str, None] = "0001_initial_chaiyifan_models"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def enum_type(*values: str) -> sa.Enum:
    return sa.Enum(*values, native_enum=False)


def timestamps() -> tuple[sa.Column, sa.Column]:
    return (
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def owner_fk() -> sa.Column:
    return sa.Column("owner_id", sa.String(length=32), nullable=False)


def soft_delete() -> sa.Column:
    return sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("course_id", sa.String(length=32), nullable=True),
        sa.Column("learning_space_id", sa.String(length=32), nullable=True),
        sa.Column("status", enum_type("draft", "active", "archived"), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("source_resource_id", sa.String(length=32), nullable=True),
        *timestamps(),
        soft_delete(),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["learning_space_id"], ["learning_spaces.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_resource_id"], ["resources.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_notes"),
    )
    op.create_index("ix_notes_owner_id", "notes", ["owner_id"])
    op.create_index("ix_notes_course_id", "notes", ["course_id"])
    op.create_index("ix_notes_learning_space_id", "notes", ["learning_space_id"])
    op.create_index("ix_notes_status", "notes", ["status"])
    op.create_index("ix_notes_source_resource_id", "notes", ["source_resource_id"])
    op.create_index("ix_notes_deleted_at", "notes", ["deleted_at"])

    op.create_table(
        "note_blocks",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("note_id", sa.String(length=32), nullable=False),
        sa.Column("type", enum_type("paragraph", "heading", "quote", "todo", "code"), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_note_blocks"),
    )
    op.create_index("ix_note_blocks_note_id", "note_blocks", ["note_id"])

    op.create_table(
        "note_relations",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("source_note_id", sa.String(length=32), nullable=False),
        sa.Column("target_note_id", sa.String(length=32), nullable=False),
        sa.Column("type", enum_type("backlink", "reference", "prerequisite", "related"), nullable=False),
        sa.Column("context", sa.String(length=2000), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_note_relations"),
    )
    op.create_index("ix_note_relations_owner_id", "note_relations", ["owner_id"])
    op.create_index("ix_note_relations_source_note_id", "note_relations", ["source_note_id"])
    op.create_index("ix_note_relations_target_note_id", "note_relations", ["target_note_id"])
    op.create_index("ix_note_relations_type", "note_relations", ["type"])

    op.create_table(
        "memory_cards",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("source_note_id", sa.String(length=32), nullable=True),
        sa.Column("front", sa.String(), nullable=False),
        sa.Column("back", sa.String(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("status", enum_type("active", "suspended", "archived"), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("ease_factor", sa.Float(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        *timestamps(),
        soft_delete(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_note_id"], ["notes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_memory_cards"),
    )
    op.create_index("ix_memory_cards_owner_id", "memory_cards", ["owner_id"])
    op.create_index("ix_memory_cards_source_note_id", "memory_cards", ["source_note_id"])
    op.create_index("ix_memory_cards_status", "memory_cards", ["status"])
    op.create_index("ix_memory_cards_due_at", "memory_cards", ["due_at"])
    op.create_index("ix_memory_cards_deleted_at", "memory_cards", ["deleted_at"])

    op.create_table(
        "review_records",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("card_id", sa.String(length=32), nullable=False),
        sa.Column("grade", enum_type("again", "hard", "good", "easy"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["card_id"], ["memory_cards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_review_records"),
    )
    op.create_index("ix_review_records_owner_id", "review_records", ["owner_id"])
    op.create_index("ix_review_records_card_id", "review_records", ["card_id"])
    op.create_index("ix_review_records_grade", "review_records", ["grade"])

    op.create_table(
        "concepts",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("course_id", sa.String(length=32), nullable=True),
        sa.Column("source_note_ids", sa.JSON(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_concepts"),
    )
    op.create_index("ix_concepts_owner_id", "concepts", ["owner_id"])
    op.create_index("ix_concepts_name", "concepts", ["name"])
    op.create_index("ix_concepts_course_id", "concepts", ["course_id"])

    op.create_table(
        "concept_relations",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("source_concept_id", sa.String(length=32), nullable=False),
        sa.Column("target_concept_id", sa.String(length=32), nullable=False),
        sa.Column("type", enum_type("prerequisite", "part_of", "contrasts_with", "related_to"), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_concept_relations"),
    )
    op.create_index("ix_concept_relations_owner_id", "concept_relations", ["owner_id"])
    op.create_index("ix_concept_relations_source_concept_id", "concept_relations", ["source_concept_id"])
    op.create_index("ix_concept_relations_target_concept_id", "concept_relations", ["target_concept_id"])
    op.create_index("ix_concept_relations_type", "concept_relations", ["type"])

    op.create_table(
        "mastery_states",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("concept_id", sa.String(length=32), nullable=False),
        sa.Column("level", enum_type("unknown", "learning", "familiar", "mastered"), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_mastery_states"),
    )
    op.create_index("ix_mastery_states_owner_id", "mastery_states", ["owner_id"])
    op.create_index("ix_mastery_states_concept_id", "mastery_states", ["concept_id"])
    op.create_index("ix_mastery_states_level", "mastery_states", ["level"])

    op.create_table(
        "thinking_sessions",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("note_id", sa.String(length=32), nullable=False),
        sa.Column("goal", sa.String(length=1000), nullable=False),
        sa.Column("status", enum_type("active", "completed", "canceled"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_thinking_sessions"),
    )
    op.create_index("ix_thinking_sessions_owner_id", "thinking_sessions", ["owner_id"])
    op.create_index("ix_thinking_sessions_note_id", "thinking_sessions", ["note_id"])
    op.create_index("ix_thinking_sessions_status", "thinking_sessions", ["status"])

    op.create_table(
        "thinking_prompts",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("session_id", sa.String(length=32), nullable=False),
        sa.Column("type", enum_type("socratic", "gap_check", "counter_example", "revision"), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["session_id"], ["thinking_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_thinking_prompts"),
    )
    op.create_index("ix_thinking_prompts_session_id", "thinking_prompts", ["session_id"])

    op.create_table(
        "revision_suggestions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("session_id", sa.String(length=32), nullable=False),
        sa.Column("note_id", sa.String(length=32), nullable=False),
        sa.Column("summary", sa.String(length=2000), nullable=False),
        sa.Column("suggested_blocks", sa.JSON(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["thinking_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_revision_suggestions"),
    )
    op.create_index("ix_revision_suggestions_session_id", "revision_suggestions", ["session_id"])
    op.create_index("ix_revision_suggestions_note_id", "revision_suggestions", ["note_id"])

    op.create_table(
        "feynman_sessions",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("concept_id", sa.String(length=32), nullable=True),
        sa.Column("note_id", sa.String(length=32), nullable=True),
        sa.Column("concept_name", sa.String(length=255), nullable=False),
        sa.Column("explanation", sa.String(), nullable=False),
        sa.Column("status", enum_type("active", "evaluated", "canceled"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_feynman_sessions"),
    )
    op.create_index("ix_feynman_sessions_owner_id", "feynman_sessions", ["owner_id"])
    op.create_index("ix_feynman_sessions_concept_id", "feynman_sessions", ["concept_id"])
    op.create_index("ix_feynman_sessions_note_id", "feynman_sessions", ["note_id"])
    op.create_index("ix_feynman_sessions_status", "feynman_sessions", ["status"])

    op.create_table(
        "feynman_questions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("session_id", sa.String(length=32), nullable=False),
        sa.Column("question", sa.String(length=1000), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["session_id"], ["feynman_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_feynman_questions"),
    )
    op.create_index("ix_feynman_questions_session_id", "feynman_questions", ["session_id"])

    op.create_table(
        "feynman_evaluations",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("session_id", sa.String(length=32), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("feedback", sa.String(length=2000), nullable=False),
        sa.Column("follow_up_questions", sa.JSON(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["session_id"], ["feynman_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_feynman_evaluations"),
        sa.UniqueConstraint("session_id", name="uq_feynman_evaluations_session_id"),
    )
    op.create_index("ix_feynman_evaluations_session_id", "feynman_evaluations", ["session_id"])

    op.create_table(
        "shared_assets",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "type",
            enum_type("note", "knowledge_graph", "thinking_chain", "feynman_session", "review_template"),
            nullable=False,
        ),
        sa.Column("source_id", sa.String(length=32), nullable=False),
        sa.Column("visibility", enum_type("private", "course", "public"), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_shared_assets"),
    )
    op.create_index("ix_shared_assets_owner_id", "shared_assets", ["owner_id"])
    op.create_index("ix_shared_assets_type", "shared_assets", ["type"])
    op.create_index("ix_shared_assets_source_id", "shared_assets", ["source_id"])
    op.create_index("ix_shared_assets_visibility", "shared_assets", ["visibility"])

    op.create_table(
        "community_posts",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("asset_id", sa.String(length=32), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["asset_id"], ["shared_assets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_community_posts"),
    )
    op.create_index("ix_community_posts_owner_id", "community_posts", ["owner_id"])
    op.create_index("ix_community_posts_asset_id", "community_posts", ["asset_id"])

    op.create_table(
        "community_interactions",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("target_id", sa.String(length=32), nullable=False),
        sa.Column("type", enum_type("like", "comment"), nullable=False),
        sa.Column("body", sa.String(length=2000), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_community_interactions"),
    )
    op.create_index("ix_community_interactions_owner_id", "community_interactions", ["owner_id"])
    op.create_index("ix_community_interactions_target_id", "community_interactions", ["target_id"])
    op.create_index("ix_community_interactions_type", "community_interactions", ["type"])

    op.create_table(
        "collections",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("asset_id", sa.String(length=32), nullable=False),
        sa.Column("note_id", sa.String(length=32), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["asset_id"], ["shared_assets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_collections"),
        sa.UniqueConstraint("owner_id", "asset_id", name="uq_collections_owner_asset"),
    )
    op.create_index("ix_collections_owner_id", "collections", ["owner_id"])
    op.create_index("ix_collections_asset_id", "collections", ["asset_id"])
    op.create_index("ix_collections_note_id", "collections", ["note_id"])

    op.create_table(
        "contribution_records",
        sa.Column("id", sa.String(length=32), nullable=False),
        owner_fk(),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("target_id", sa.String(length=32), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_contribution_records"),
    )
    op.create_index("ix_contribution_records_owner_id", "contribution_records", ["owner_id"])
    op.create_index("ix_contribution_records_action", "contribution_records", ["action"])
    op.create_index("ix_contribution_records_target_id", "contribution_records", ["target_id"])


def downgrade() -> None:
    for index_name, table_name in [
        ("ix_contribution_records_target_id", "contribution_records"),
        ("ix_contribution_records_action", "contribution_records"),
        ("ix_contribution_records_owner_id", "contribution_records"),
        ("ix_collections_note_id", "collections"),
        ("ix_collections_asset_id", "collections"),
        ("ix_collections_owner_id", "collections"),
        ("ix_community_interactions_type", "community_interactions"),
        ("ix_community_interactions_target_id", "community_interactions"),
        ("ix_community_interactions_owner_id", "community_interactions"),
        ("ix_community_posts_asset_id", "community_posts"),
        ("ix_community_posts_owner_id", "community_posts"),
        ("ix_shared_assets_visibility", "shared_assets"),
        ("ix_shared_assets_source_id", "shared_assets"),
        ("ix_shared_assets_type", "shared_assets"),
        ("ix_shared_assets_owner_id", "shared_assets"),
        ("ix_feynman_evaluations_session_id", "feynman_evaluations"),
        ("ix_feynman_questions_session_id", "feynman_questions"),
        ("ix_feynman_sessions_status", "feynman_sessions"),
        ("ix_feynman_sessions_note_id", "feynman_sessions"),
        ("ix_feynman_sessions_concept_id", "feynman_sessions"),
        ("ix_feynman_sessions_owner_id", "feynman_sessions"),
        ("ix_revision_suggestions_note_id", "revision_suggestions"),
        ("ix_revision_suggestions_session_id", "revision_suggestions"),
        ("ix_thinking_prompts_session_id", "thinking_prompts"),
        ("ix_thinking_sessions_status", "thinking_sessions"),
        ("ix_thinking_sessions_note_id", "thinking_sessions"),
        ("ix_thinking_sessions_owner_id", "thinking_sessions"),
        ("ix_mastery_states_level", "mastery_states"),
        ("ix_mastery_states_concept_id", "mastery_states"),
        ("ix_mastery_states_owner_id", "mastery_states"),
        ("ix_concept_relations_type", "concept_relations"),
        ("ix_concept_relations_target_concept_id", "concept_relations"),
        ("ix_concept_relations_source_concept_id", "concept_relations"),
        ("ix_concept_relations_owner_id", "concept_relations"),
        ("ix_concepts_course_id", "concepts"),
        ("ix_concepts_name", "concepts"),
        ("ix_concepts_owner_id", "concepts"),
        ("ix_review_records_grade", "review_records"),
        ("ix_review_records_card_id", "review_records"),
        ("ix_review_records_owner_id", "review_records"),
        ("ix_memory_cards_deleted_at", "memory_cards"),
        ("ix_memory_cards_due_at", "memory_cards"),
        ("ix_memory_cards_status", "memory_cards"),
        ("ix_memory_cards_source_note_id", "memory_cards"),
        ("ix_memory_cards_owner_id", "memory_cards"),
        ("ix_note_relations_type", "note_relations"),
        ("ix_note_relations_target_note_id", "note_relations"),
        ("ix_note_relations_source_note_id", "note_relations"),
        ("ix_note_relations_owner_id", "note_relations"),
        ("ix_note_blocks_note_id", "note_blocks"),
        ("ix_notes_deleted_at", "notes"),
        ("ix_notes_source_resource_id", "notes"),
        ("ix_notes_status", "notes"),
        ("ix_notes_learning_space_id", "notes"),
        ("ix_notes_course_id", "notes"),
        ("ix_notes_owner_id", "notes"),
    ]:
        op.drop_index(index_name, table_name=table_name)

    for table_name in [
        "contribution_records",
        "collections",
        "community_interactions",
        "community_posts",
        "shared_assets",
        "feynman_evaluations",
        "feynman_questions",
        "feynman_sessions",
        "revision_suggestions",
        "thinking_prompts",
        "thinking_sessions",
        "mastery_states",
        "concept_relations",
        "concepts",
        "review_records",
        "memory_cards",
        "note_relations",
        "note_blocks",
        "notes",
    ]:
        op.drop_table(table_name)
