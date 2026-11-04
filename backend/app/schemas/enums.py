from enum import StrEnum


class UserRole(StrEnum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class ResourceType(StrEnum):
    PDF = "pdf"
    PPT = "ppt"
    MARKDOWN = "markdown"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    WEBPAGE = "webpage"
    TEXT = "text"
    OTHER = "other"


class ResourceStatus(StrEnum):
    UPLOADED = "uploaded"
    PARSING = "parsing"
    PARSED = "parsed"
    FAILED = "failed"
    ARCHIVED = "archived"


class AiTaskType(StrEnum):
    RESOURCE_PARSE = "resource_parse"
    OCR = "ocr"
    ASR = "asr"
    LLM_SUMMARY = "llm_summary"
    MEMORY_CARD_GENERATION = "memory_card_generation"
    FEYNMAN_EVALUATION = "feynman_evaluation"
    KNOWLEDGE_GRAPH_UPDATE = "knowledge_graph_update"
    COMMUNITY_INDEXING = "community_indexing"


class AiTaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class ImportExportJobType(StrEnum):
    IMPORT = "import"
    EXPORT = "export"


class ImportExportStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class ExportFormat(StrEnum):
    MARKDOWN = "markdown"
    PDF = "pdf"
    JSON = "json"


class ThemePreference(StrEnum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class AiGuidanceLevel(StrEnum):
    STRICT = "strict"
    BALANCED = "balanced"
    GENTLE = "gentle"


class DashboardTaskMode(StrEnum):
    QUICK = "quick"
    THINKING = "thinking"
    MEMORY = "memory"
    FEYNMAN = "feynman"


class Priority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class NoteStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class NoteBlockType(StrEnum):
    PARAGRAPH = "paragraph"
    HEADING = "heading"
    QUOTE = "quote"
    TODO = "todo"
    CODE = "code"
    TABLE = "table"
    AI_SUMMARY = "ai_summary"
    THINKING = "thinking"
    MEMORY_CARDS = "memory_cards"
    FORMULA = "formula"
    ANNOTATION = "annotation"
    RELATIONS = "relations"


class NoteRelationType(StrEnum):
    BACKLINK = "backlink"
    REFERENCE = "reference"
    PREREQUISITE = "prerequisite"
    RELATED = "related"


class MemoryCardStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class ReviewGrade(StrEnum):
    AGAIN = "again"
    HARD = "hard"
    GOOD = "good"
    EASY = "easy"


class ThinkingSessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELED = "canceled"


class ThinkingPromptType(StrEnum):
    SOCRATIC = "socratic"
    GAP_CHECK = "gap_check"
    COUNTER_EXAMPLE = "counter_example"
    REVISION = "revision"


class FeynmanSessionStatus(StrEnum):
    ACTIVE = "active"
    EVALUATED = "evaluated"
    CANCELED = "canceled"


class ConceptRelationType(StrEnum):
    PREREQUISITE = "prerequisite"
    PART_OF = "part_of"
    CONTRASTS_WITH = "contrasts_with"
    RELATED_TO = "related_to"


class MasteryLevel(StrEnum):
    UNKNOWN = "unknown"
    LEARNING = "learning"
    FAMILIAR = "familiar"
    MASTERED = "mastered"


class SharedAssetType(StrEnum):
    NOTE = "note"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    THINKING_CHAIN = "thinking_chain"
    FEYNMAN_SESSION = "feynman_session"
    REVIEW_TEMPLATE = "review_template"


class Visibility(StrEnum):
    PRIVATE = "private"
    COURSE = "course"
    PUBLIC = "public"


class InteractionType(StrEnum):
    LIKE = "like"
    COMMENT = "comment"
