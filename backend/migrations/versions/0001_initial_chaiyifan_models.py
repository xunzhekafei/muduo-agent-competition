"""initial ChaiYifan database models

Revision ID: 0001_initial_chaiyifan_models
Revises:
Create Date: 2026-05-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_chaiyifan_models"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def enum_type(*values: str) -> sa.Enum:
    return sa.Enum(*values, native_enum=False)


def timestamps() -> tuple[sa.Column, sa.Column]:
    return (
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def soft_delete() -> sa.Column:
    return sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=1000), nullable=True),
        sa.Column("role", enum_type("student", "teacher", "admin"), nullable=False),
        *timestamps(),
        soft_delete(),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])

    op.create_table(
        "user_preferences",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("theme", enum_type("system", "light", "dark"), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=False),
        sa.Column("daily_review_reminder", sa.Boolean(), nullable=False),
        sa.Column("reminder_time", sa.String(length=16), nullable=True),
        sa.Column("ai_guidance_level", enum_type("strict", "balanced", "gentle"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_user_preferences"),
        sa.UniqueConstraint("user_id", name="uq_user_preferences_user_id"),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"])

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=255), nullable=False),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_auth_sessions"),
        sa.UniqueConstraint("refresh_token_hash", name="uq_auth_sessions_refresh_token_hash"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])

    op.create_table(
        "courses",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("subject", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        *timestamps(),
        soft_delete(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_courses"),
    )
    op.create_index("ix_courses_owner_id", "courses", ["owner_id"])
    op.create_index("ix_courses_subject", "courses", ["subject"])
    op.create_index("ix_courses_deleted_at", "courses", ["deleted_at"])

    op.create_table(
        "learning_spaces",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("course_id", sa.String(length=32), nullable=False),
        sa.Column("parent_id", sa.String(length=32), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        *timestamps(),
        soft_delete(),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["learning_spaces.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_learning_spaces"),
    )
    op.create_index("ix_learning_spaces_owner_id", "learning_spaces", ["owner_id"])
    op.create_index("ix_learning_spaces_course_id", "learning_spaces", ["course_id"])
    op.create_index("ix_learning_spaces_parent_id", "learning_spaces", ["parent_id"])
    op.create_index("ix_learning_spaces_deleted_at", "learning_spaces", ["deleted_at"])

    op.create_table(
        "resources",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("course_id", sa.String(length=32), nullable=False),
        sa.Column("learning_space_id", sa.String(length=32), nullable=True),
        sa.Column(
            "type",
            enum_type("pdf", "ppt", "markdown", "image", "audio", "video", "webpage", "text", "other"),
            nullable=False,
        ),
        sa.Column("status", enum_type("uploaded", "parsing", "parsed", "failed", "archived"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("source_url", sa.String(length=2000), nullable=True),
        sa.Column("storage_key", sa.String(length=1000), nullable=True),
        sa.Column("parse_task_id", sa.String(length=32), nullable=True),
        *timestamps(),
        soft_delete(),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["learning_space_id"], ["learning_spaces.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_resources"),
    )
    op.create_index("ix_resources_owner_id", "resources", ["owner_id"])
    op.create_index("ix_resources_course_id", "resources", ["course_id"])
    op.create_index("ix_resources_learning_space_id", "resources", ["learning_space_id"])
    op.create_index("ix_resources_status", "resources", ["status"])
    op.create_index("ix_resources_parse_task_id", "resources", ["parse_task_id"])
    op.create_index("ix_resources_deleted_at", "resources", ["deleted_at"])

    op.create_table(
        "parsed_resources",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("resource_id", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("core_concepts", sa.JSON(), nullable=False),
        sa.Column("note_draft_id", sa.String(length=32), nullable=True),
        sa.Column("raw_text", sa.String(), nullable=True),
        sa.Column("parser_version", sa.String(length=64), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_parsed_resources"),
        sa.UniqueConstraint("resource_id", name="uq_parsed_resources_resource_id"),
    )
    op.create_index("ix_parsed_resources_owner_id", "parsed_resources", ["owner_id"])
    op.create_index("ix_parsed_resources_resource_id", "parsed_resources", ["resource_id"])
    op.create_index("ix_parsed_resources_note_draft_id", "parsed_resources", ["note_draft_id"])

    op.create_table(
        "parsed_resource_chapters",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("parsed_resource_id", sa.String(length=32), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["parsed_resource_id"], ["parsed_resources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_parsed_resource_chapters"),
    )
    op.create_index(
        "ix_parsed_resource_chapters_parsed_resource_id",
        "parsed_resource_chapters",
        ["parsed_resource_id"],
    )

    op.create_table(
        "ai_tasks",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column(
            "type",
            enum_type(
                "resource_parse",
                "ocr",
                "asr",
                "llm_summary",
                "memory_card_generation",
                "feynman_evaluation",
                "knowledge_graph_update",
                "community_indexing",
            ),
            nullable=False,
        ),
        sa.Column("status", enum_type("queued", "running", "succeeded", "failed", "canceled"), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.String(length=32), nullable=True),
        sa.Column("resource_id", sa.String(length=32), nullable=True),
        sa.Column("input_payload", sa.JSON(), nullable=False),
        sa.Column("output_payload", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.String(length=2000), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_ai_tasks"),
    )
    op.create_index("ix_ai_tasks_owner_id", "ai_tasks", ["owner_id"])
    op.create_index("ix_ai_tasks_type", "ai_tasks", ["type"])
    op.create_index("ix_ai_tasks_status", "ai_tasks", ["status"])
    op.create_index("ix_ai_tasks_course_id", "ai_tasks", ["course_id"])
    op.create_index("ix_ai_tasks_resource_id", "ai_tasks", ["resource_id"])

    op.create_table(
        "import_export_jobs",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("type", enum_type("import", "export"), nullable=False),
        sa.Column("status", enum_type("queued", "running", "succeeded", "failed", "canceled"), nullable=False),
        sa.Column("course_id", sa.String(length=32), nullable=True),
        sa.Column("resource_id", sa.String(length=32), nullable=True),
        sa.Column("task_id", sa.String(length=32), nullable=True),
        sa.Column(
            "source_type",
            enum_type("pdf", "ppt", "markdown", "image", "audio", "video", "webpage", "text", "other"),
            nullable=True,
        ),
        sa.Column("source_url", sa.String(length=2000), nullable=True),
        sa.Column("export_format", enum_type("markdown", "pdf", "json"), nullable=True),
        sa.Column("note_ids", sa.JSON(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("result_url", sa.String(length=2000), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.String(length=2000), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["ai_tasks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_import_export_jobs"),
    )
    op.create_index("ix_import_export_jobs_owner_id", "import_export_jobs", ["owner_id"])
    op.create_index("ix_import_export_jobs_type", "import_export_jobs", ["type"])
    op.create_index("ix_import_export_jobs_status", "import_export_jobs", ["status"])
    op.create_index("ix_import_export_jobs_course_id", "import_export_jobs", ["course_id"])
    op.create_index("ix_import_export_jobs_resource_id", "import_export_jobs", ["resource_id"])
    op.create_index("ix_import_export_jobs_task_id", "import_export_jobs", ["task_id"])


def downgrade() -> None:
    op.drop_index("ix_import_export_jobs_task_id", table_name="import_export_jobs")
    op.drop_index("ix_import_export_jobs_resource_id", table_name="import_export_jobs")
    op.drop_index("ix_import_export_jobs_course_id", table_name="import_export_jobs")
    op.drop_index("ix_import_export_jobs_status", table_name="import_export_jobs")
    op.drop_index("ix_import_export_jobs_type", table_name="import_export_jobs")
    op.drop_index("ix_import_export_jobs_owner_id", table_name="import_export_jobs")
    op.drop_table("import_export_jobs")

    op.drop_index("ix_ai_tasks_resource_id", table_name="ai_tasks")
    op.drop_index("ix_ai_tasks_course_id", table_name="ai_tasks")
    op.drop_index("ix_ai_tasks_status", table_name="ai_tasks")
    op.drop_index("ix_ai_tasks_type", table_name="ai_tasks")
    op.drop_index("ix_ai_tasks_owner_id", table_name="ai_tasks")
    op.drop_table("ai_tasks")

    op.drop_index("ix_parsed_resource_chapters_parsed_resource_id", table_name="parsed_resource_chapters")
    op.drop_table("parsed_resource_chapters")

    op.drop_index("ix_parsed_resources_note_draft_id", table_name="parsed_resources")
    op.drop_index("ix_parsed_resources_resource_id", table_name="parsed_resources")
    op.drop_index("ix_parsed_resources_owner_id", table_name="parsed_resources")
    op.drop_table("parsed_resources")

    op.drop_index("ix_resources_deleted_at", table_name="resources")
    op.drop_index("ix_resources_parse_task_id", table_name="resources")
    op.drop_index("ix_resources_status", table_name="resources")
    op.drop_index("ix_resources_learning_space_id", table_name="resources")
    op.drop_index("ix_resources_course_id", table_name="resources")
    op.drop_index("ix_resources_owner_id", table_name="resources")
    op.drop_table("resources")

    op.drop_index("ix_learning_spaces_deleted_at", table_name="learning_spaces")
    op.drop_index("ix_learning_spaces_parent_id", table_name="learning_spaces")
    op.drop_index("ix_learning_spaces_course_id", table_name="learning_spaces")
    op.drop_index("ix_learning_spaces_owner_id", table_name="learning_spaces")
    op.drop_table("learning_spaces")

    op.drop_index("ix_courses_deleted_at", table_name="courses")
    op.drop_index("ix_courses_subject", table_name="courses")
    op.drop_index("ix_courses_owner_id", table_name="courses")
    op.drop_table("courses")

    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index("ix_user_preferences_user_id", table_name="user_preferences")
    op.drop_table("user_preferences")

    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
