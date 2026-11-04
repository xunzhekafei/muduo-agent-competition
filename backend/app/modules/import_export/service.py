from __future__ import annotations

from pathlib import PurePosixPath

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode, raise_not_found
from app.modules.ai_tasks.service import AiTaskService
from app.modules.courses.models import CourseModel
from app.modules.import_export.models import ImportExportJobModel
from app.modules.resources.models import ResourceModel
from app.schemas.enums import (
    AiTaskType,
    ImportExportJobType,
    ImportExportStatus,
    ResourceStatus,
)
from app.schemas.import_export import (
    ExportJobCreateRequest,
    ImportExportJob,
    ImportJobCreateRequest,
)


class ImportExportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_import_job(self, *, owner_id: str, request: ImportJobCreateRequest) -> ImportExportJob:
        self._get_course(owner_id=owner_id, course_id=request.course_id)
        resource = self._resolve_import_resource(owner_id=owner_id, request=request)
        task = AiTaskService(self.db).create_task_model(
            owner_id=owner_id,
            task_type=AiTaskType.RESOURCE_PARSE,
            course_id=request.course_id,
            resource_id=resource.id,
            input_payload={
                "jobType": ImportExportJobType.IMPORT,
                "courseId": request.course_id,
                "resourceId": resource.id,
                "sourceType": request.source_type,
                "sourceUrl": request.source_url,
                "options": request.options,
            },
        )
        job = ImportExportJobModel(
            owner_id=owner_id,
            job_type=ImportExportJobType.IMPORT,
            status=ImportExportStatus.QUEUED,
            course_id=request.course_id,
            resource_id=resource.id,
            source_type=request.source_type,
            source_url=request.source_url,
            options=request.options,
        )
        self.db.add_all([task, job, resource])
        self.db.flush()
        job.task_id = task.id
        self.db.commit()
        self.db.refresh(job)
        return to_import_export_job_schema(job)

    def get_import_job(self, *, owner_id: str, job_id: str) -> ImportExportJob:
        return to_import_export_job_schema(
            self._get_job(owner_id=owner_id, job_id=job_id, job_type=ImportExportJobType.IMPORT)
        )

    def create_export_job(self, *, owner_id: str, request: ExportJobCreateRequest) -> ImportExportJob:
        job = ImportExportJobModel(
            owner_id=owner_id,
            job_type=ImportExportJobType.EXPORT,
            status=ImportExportStatus.QUEUED,
            export_format=request.format,
            note_ids=request.note_ids,
            options=request.options,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return to_import_export_job_schema(job)

    def get_export_job(self, *, owner_id: str, job_id: str) -> ImportExportJob:
        return to_import_export_job_schema(
            self._get_job(owner_id=owner_id, job_id=job_id, job_type=ImportExportJobType.EXPORT)
        )

    def _resolve_import_resource(
        self,
        *,
        owner_id: str,
        request: ImportJobCreateRequest,
    ) -> ResourceModel:
        if request.resource_id is None:
            resource = ResourceModel(
                owner_id=owner_id,
                course_id=request.course_id,
                name=_derive_resource_name(request.source_url, request.source_type),
                resource_type=request.source_type,
                status=ResourceStatus.UPLOADED,
                source_url=request.source_url,
            )
            self.db.add(resource)
            self.db.flush()
            return resource

        resource = self.db.execute(
            select(ResourceModel).where(
                ResourceModel.id == request.resource_id,
                ResourceModel.owner_id == owner_id,
                ResourceModel.course_id == request.course_id,
                ResourceModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if resource is None:
            raise_not_found("资源不存在")
        return resource

    def _get_course(self, *, owner_id: str, course_id: str) -> CourseModel:
        course = self.db.execute(
            select(CourseModel).where(
                CourseModel.id == course_id,
                CourseModel.owner_id == owner_id,
                CourseModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if course is None:
            raise_not_found("课程不存在")
        return course

    def _get_job(
        self,
        *,
        owner_id: str,
        job_id: str,
        job_type: ImportExportJobType,
    ) -> ImportExportJobModel:
        job = self.db.execute(
            select(ImportExportJobModel).where(
                ImportExportJobModel.id == job_id,
                ImportExportJobModel.owner_id == owner_id,
                ImportExportJobModel.job_type == job_type,
            )
        ).scalar_one_or_none()
        if job is None:
            raise_not_found("任务不存在")
        return job


def to_import_export_job_schema(job: ImportExportJobModel) -> ImportExportJob:
    return ImportExportJob(
        id=job.id,
        type=job.job_type,
        status=job.status,
        course_id=job.course_id,
        source_type=job.source_type,
        source_url=job.source_url,
        resource_id=job.resource_id,
        task_id=job.task_id,
        export_format=job.export_format,
        note_ids=job.note_ids,
        options=job.options,
        result_url=job.result_url,
        error_code=job.error_code,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _derive_resource_name(source_url: str | None, source_type: str) -> str:
    if source_url:
        name = PurePosixPath(source_url.rstrip("/")).name
        if name:
            return name[:255]
    return f"{source_type} import"

