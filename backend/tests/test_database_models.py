from __future__ import annotations

import unittest

from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import sessionmaker

from app.db import Base
import app.db.models  # noqa: F401
from app.modules.ai_tasks.models import AiTaskModel
from app.modules.courses.models import CourseModel, LearningSpaceModel
from app.modules.import_export.models import ImportExportJobModel
from app.modules.resources.models import (
    ParsedResourceChapterModel,
    ParsedResourceModel,
    ResourceModel,
)
from app.modules.users.models import UserModel, UserPreferenceModel
from app.schemas.enums import (
    AiTaskStatus,
    AiTaskType,
    ImportExportJobType,
    ImportExportStatus,
    ResourceStatus,
    ResourceType,
    UserRole,
)


class DatabaseModelTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            expire_on_commit=False,
        )

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_metadata_contains_chaiyifan_tables(self) -> None:
        tables = set(inspect(self.engine).get_table_names())

        self.assertTrue(
            {
                "users",
                "user_preferences",
                "auth_sessions",
                "courses",
                "learning_spaces",
                "resources",
                "parsed_resources",
                "parsed_resource_chapters",
                "ai_tasks",
                "import_export_jobs",
            }.issubset(tables)
        )

    def test_persists_user_course_resource_task_and_job(self) -> None:
        session = self.session_factory()
        try:
            user = UserModel(
                name="Chai Yifan",
                email="chai@example.com",
                role=UserRole.STUDENT,
            )
            user.preferences = UserPreferenceModel()
            session.add(user)
            session.flush()

            course = CourseModel(
                owner_id=user.id,
                name="Linear Algebra",
                subject="Math",
            )
            session.add(course)
            session.flush()

            space = LearningSpaceModel(
                owner_id=user.id,
                course_id=course.id,
                name="Week 1",
                position=1,
            )
            resource = ResourceModel(
                owner_id=user.id,
                course_id=course.id,
                learning_space_id=space.id,
                name="lecture.pdf",
                resource_type=ResourceType.PDF,
                status=ResourceStatus.UPLOADED,
                size_bytes=1024,
            )
            session.add_all([space, resource])
            session.flush()

            parsed = ParsedResourceModel(
                owner_id=user.id,
                resource_id=resource.id,
                title="Lecture 1",
                core_concepts=["vector", "matrix"],
            )
            parsed.chapters.append(
                ParsedResourceChapterModel(
                    position=0,
                    title="Vectors",
                    content="Vectors represent magnitude and direction.",
                )
            )
            session.add(parsed)

            task = AiTaskModel(
                owner_id=user.id,
                task_type=AiTaskType.RESOURCE_PARSE,
                status=AiTaskStatus.QUEUED,
                course_id=course.id,
                resource_id=resource.id,
                input_payload={"resourceId": resource.id},
            )
            session.add(task)
            session.flush()

            job = ImportExportJobModel(
                owner_id=user.id,
                job_type=ImportExportJobType.IMPORT,
                status=ImportExportStatus.QUEUED,
                course_id=course.id,
                resource_id=resource.id,
                task_id=task.id,
                source_type=ResourceType.PDF,
                options={"splitBy": "chapter"},
            )
            session.add(job)
            session.commit()

            saved_resource = session.execute(select(ResourceModel)).scalar_one()
            saved_task = session.execute(select(AiTaskModel)).scalar_one()
            saved_job = session.execute(select(ImportExportJobModel)).scalar_one()

            self.assertTrue(user.id.startswith("user_"))
            self.assertEqual(user.preferences.user_id, user.id)
            self.assertEqual(saved_resource.resource_type, ResourceType.PDF)
            self.assertEqual(saved_resource.parsed_result.title, "Lecture 1")
            self.assertEqual(saved_resource.parsed_result.chapters[0].position, 0)
            self.assertEqual(saved_task.input_payload["resourceId"], resource.id)
            self.assertEqual(saved_job.options["splitBy"], "chapter")
        finally:
            session.close()

    def test_soft_delete_marks_deleted_at(self) -> None:
        user = UserModel(name="User", email="user@example.com")

        self.assertFalse(user.is_deleted)
        user.mark_deleted()

        self.assertTrue(user.is_deleted)
        self.assertIsNotNone(user.deleted_at)


if __name__ == "__main__":
    unittest.main()
