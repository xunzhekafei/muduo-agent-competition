from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ai_tasks import AiTask
from app.schemas.common import DataResponse
from app.schemas.courses import Course
from app.schemas.enums import ResourceStatus
from app.schemas.import_export import ImportExportJob
from app.schemas.resources import ParsedResource, Resource
from app.schemas.users import User


class ParsedResourceChapterInput(BaseModel):
    title: str
    content: str
    position: int = 0


class CompleteResourceParseRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    chapters: list[ParsedResourceChapterInput] = Field(min_length=1)
    core_concepts: list[str] = Field(default_factory=list, alias="coreConcepts")
    raw_text: str | None = Field(default=None, alias="rawText")
    parser_version: str | None = Field(default=None, alias="parserVersion")
    create_note_draft: bool = Field(default=True, alias="createNoteDraft")
    note_draft_title: str | None = Field(default=None, alias="noteDraftTitle")


class NoteDraftBlock(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: str
    content: str
    position: int


class NoteDraft(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    course_id: str | None = Field(default=None, alias="courseId")
    resource_id: str = Field(alias="resourceId")
    status: str
    tags: list[str] = Field(default_factory=list)
    blocks: list[NoteDraftBlock] = Field(default_factory=list)


class ResourceParseCompletion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task: AiTask
    resource: Resource
    parsed_resource: ParsedResource = Field(alias="parsedResource")
    note_draft: NoteDraft | None = Field(default=None, alias="noteDraft")


class ResourceWorkflowContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user: User
    course: Course | None = None
    resource: Resource | None = None
    parse_task: AiTask | None = Field(default=None, alias="parseTask")
    parsed_resource: ParsedResource | None = Field(default=None, alias="parsedResource")
    can_create_parse_task: bool = Field(alias="canCreateParseTask")
    next_actions: list[str] = Field(default_factory=list, alias="nextActions")


class WorkflowImportResponse(BaseModel):
    data: ImportExportJob


ResourceParseCompletionResponse = DataResponse[ResourceParseCompletion]
ResourceWorkflowContextResponse = DataResponse[ResourceWorkflowContext]


def next_actions_for_status(status: ResourceStatus | None, has_parsed_result: bool) -> list[str]:
    if status is None:
        return ["select_course", "select_resource"]
    if status == ResourceStatus.UPLOADED:
        return ["create_parse_task"]
    if status == ResourceStatus.PARSING:
        return ["poll_ai_task"]
    if status == ResourceStatus.PARSED and has_parsed_result:
        return ["review_note_draft", "save_to_notes"]
    if status == ResourceStatus.FAILED:
        return ["retry_parse"]
    return []
