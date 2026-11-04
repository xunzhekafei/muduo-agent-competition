from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, ErrorCode
from app.modules.ai_tasks.models import AiTaskModel
from app.modules.ai_tasks.service import AiTaskService, to_ai_task_schema
from app.modules.courses.models import CourseModel
from app.modules.courses.service import to_course_schema
from app.modules.import_export.service import ImportExportService
from app.modules.notes.service import NoteService
from app.modules.resources.models import (
    ParsedResourceChapterModel,
    ParsedResourceModel,
    ResourceModel,
)
from app.modules.resources.service import to_parsed_resource_schema, to_resource_schema
from app.modules.users.models import UserModel
from app.modules.users.service import to_user_schema
from app.schemas.ai_tasks import AiTaskUpdateRequest
from app.schemas.enums import AiTaskStatus, AiTaskType, NoteBlockType, NoteStatus
from app.schemas.import_export import ImportExportJob, ImportJobCreateRequest
from app.schemas.notes import Note, NoteBlock, NoteBlockCreateRequest, NoteCreateRequest, NoteUpdateRequest
from app.schemas.workflows import (
    CompleteResourceParseRequest,
    NoteDraft,
    NoteDraftBlock,
    ResourceParseCompletion,
    ResourceWorkflowContext,
    next_actions_for_status,
)


class ResourceNoteWorkflowService:
    def __init__(self, db: Session, note_service: NoteService | None = None) -> None:
        self.db = db
        self.note_service = note_service or NoteService(db)

    def create_import_job(
        self,
        *,
        owner_id: str,
        request: ImportJobCreateRequest,
    ) -> ImportExportJob:
        return ImportExportService(self.db).create_import_job(owner_id=owner_id, request=request)

    def get_context(
        self,
        *,
        current_user: UserModel,
        course_id: str | None = None,
        resource_id: str | None = None,
    ) -> ResourceWorkflowContext:
        resource = self._get_resource(owner_id=current_user.id, resource_id=resource_id) if resource_id else None
        resolved_course_id = resource.course_id if resource is not None else course_id
        course = (
            self._get_course(owner_id=current_user.id, course_id=resolved_course_id)
            if resolved_course_id is not None
            else None
        )
        parse_task = self._get_parse_task(owner_id=current_user.id, resource=resource)
        parsed = self._get_parsed_resource(owner_id=current_user.id, resource=resource)
        return ResourceWorkflowContext(
            user=to_user_schema(current_user),
            course=to_course_schema(course) if course is not None else None,
            resource=to_resource_schema(resource) if resource is not None else None,
            parse_task=to_ai_task_schema(parse_task) if parse_task is not None else None,
            parsed_resource=to_parsed_resource_schema(parsed) if parsed is not None else None,
            can_create_parse_task=resource is not None and parse_task is None,
            next_actions=next_actions_for_status(
                resource.status if resource is not None else None,
                parsed is not None,
            ),
        )

    def complete_resource_parse(
        self,
        *,
        owner_id: str,
        task_id: str,
        request: CompleteResourceParseRequest,
    ) -> ResourceParseCompletion:
        task_service = AiTaskService(self.db)
        task = task_service.get_task_model(owner_id=owner_id, task_id=task_id)
        if task.task_type != AiTaskType.RESOURCE_PARSE or task.resource_id is None:
            raise_validation_error("只能完成资源解析任务")

        resource = self._get_resource(owner_id=owner_id, resource_id=task.resource_id)
        parsed = self._upsert_parsed_resource(
            owner_id=owner_id,
            resource=resource,
            request=request,
        )
        note_draft = None
        if request.create_note_draft:
            note_draft = self._create_note_draft(
                owner_id=owner_id,
                resource=resource,
                request=request,
            )
            parsed.note_draft_id = note_draft.id

        self.db.add(parsed)
        self.db.flush()
        task_output = {
            "resourceId": resource.id,
            "parsedResourceId": parsed.id,
            "noteDraftId": parsed.note_draft_id,
            "chapterCount": len(request.chapters),
            "coreConcepts": request.core_concepts,
        }
        updated_task = task_service.update_task(
            owner_id=owner_id,
            task_id=task.id,
            request=AiTaskUpdateRequest(
                status=AiTaskStatus.SUCCEEDED,
                output=task_output,
            ),
        )
        self.db.refresh(resource)
        self.db.refresh(parsed)
        return ResourceParseCompletion(
            task=updated_task,
            resource=to_resource_schema(resource),
            parsed_resource=to_parsed_resource_schema(parsed),
            note_draft=note_draft,
        )

    def _upsert_parsed_resource(
        self,
        *,
        owner_id: str,
        resource: ResourceModel,
        request: CompleteResourceParseRequest,
    ) -> ParsedResourceModel:
        parsed = self._get_parsed_resource(owner_id=owner_id, resource=resource)
        if parsed is None:
            parsed = ParsedResourceModel(
                owner_id=owner_id,
                resource_id=resource.id,
                title=request.title,
                core_concepts=request.core_concepts,
                raw_text=request.raw_text,
                parser_version=request.parser_version,
            )
            self.db.add(parsed)
            self.db.flush()
        else:
            parsed.title = request.title
            parsed.core_concepts = request.core_concepts
            parsed.raw_text = request.raw_text
            parsed.parser_version = request.parser_version
            parsed.chapters.clear()

        for chapter in sorted(request.chapters, key=lambda item: item.position):
            parsed.chapters.append(
                ParsedResourceChapterModel(
                    parsed_resource_id=parsed.id,
                    title=chapter.title,
                    content=chapter.content,
                    position=chapter.position,
                )
            )
        return parsed

    def _create_note_draft(
        self,
        *,
        owner_id: str,
        resource: ResourceModel,
        request: CompleteResourceParseRequest,
    ) -> NoteDraft:
        course = self._get_course(owner_id=owner_id, course_id=resource.course_id)
        note = self.note_service.create_note(
            owner_id=owner_id,
            request=NoteCreateRequest(
                title=request.note_draft_title or request.title,
                course_id=resource.course_id,
                source_resource_id=resource.id,
                tags=_draft_tags(resource=resource, course=course),
            ),
        )
        note = self.note_service.update_note(
            owner_id=owner_id,
            note_id=note.id,
            request=NoteUpdateRequest(status=NoteStatus.DRAFT),
        )
        for chapter in sorted(request.chapters, key=lambda item: item.position):
            self.note_service.append_block(
                owner_id=owner_id,
                note_id=note.id,
                request=NoteBlockCreateRequest(
                    content=chapter.title,
                    block_type=NoteBlockType.HEADING,
                ),
            )
            self.note_service.append_block(
                owner_id=owner_id,
                note_id=note.id,
                request=NoteBlockCreateRequest(
                    content=chapter.content,
                    block_type=NoteBlockType.PARAGRAPH,
                ),
            )
        detail = self.note_service.get_note_detail(owner_id=owner_id, note_id=note.id)
        return to_note_draft_schema(
            note=detail.note,
            blocks=detail.blocks,
            resource_id=resource.id,
        )

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

    def _get_resource(self, *, owner_id: str, resource_id: str) -> ResourceModel:
        resource = self.db.execute(
            select(ResourceModel).where(
                ResourceModel.id == resource_id,
                ResourceModel.owner_id == owner_id,
                ResourceModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if resource is None:
            raise_not_found("资源不存在")
        return resource

    def _get_parse_task(
        self,
        *,
        owner_id: str,
        resource: ResourceModel | None,
    ) -> AiTaskModel | None:
        if resource is None or resource.parse_task_id is None:
            return None
        return self.db.execute(
            select(AiTaskModel).where(
                AiTaskModel.id == resource.parse_task_id,
                AiTaskModel.owner_id == owner_id,
            )
        ).scalar_one_or_none()

    def _get_parsed_resource(
        self,
        *,
        owner_id: str,
        resource: ResourceModel | None,
    ) -> ParsedResourceModel | None:
        if resource is None:
            return None
        return self.db.execute(
            select(ParsedResourceModel)
            .options(selectinload(ParsedResourceModel.chapters))
            .where(
                ParsedResourceModel.owner_id == owner_id,
                ParsedResourceModel.resource_id == resource.id,
            )
        ).scalar_one_or_none()


def to_note_draft_schema(*, note: Note, blocks: list[NoteBlock], resource_id: str) -> NoteDraft:
    return NoteDraft(
        id=note.id,
        title=note.title,
        course_id=note.course_id,
        resource_id=resource_id,
        status=note.status.value,
        tags=note.tags,
        blocks=[
            NoteDraftBlock(
                id=block.id,
                type=block.block_type.value,
                content=block.content,
                position=block.position,
            )
            for block in blocks
        ],
    )


def _draft_tags(*, resource: ResourceModel, course: CourseModel) -> list[str]:
    tags = ["resource-import", resource.resource_type.value]
    subject = course.subject.strip().lower()
    if subject:
        tags.append(subject)
    return tags


def raise_not_found(message: str) -> None:
    raise AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        message,
        status_code=404,
    )


def raise_validation_error(message: str) -> None:
    raise AppError(
        ErrorCode.VALIDATION_ERROR,
        message,
        status_code=422,
    )
