from app.modules.ai_tasks.models import AiTaskModel
from app.modules.auth.models import AuthSessionModel
from app.modules.courses.models import CourseModel, LearningSpaceModel
from app.modules.dashboard.models import LearningActivityModel, StudyLogModel
from app.modules.community.models import (
    CollectionModel,
    CommunityInteractionModel,
    CommunityPostModel,
    ContributionRecordModel,
    SharedAssetModel,
)
from app.modules.feynman.models import (
    FeynmanEvaluationModel,
    FeynmanQuestionModel,
    FeynmanSessionModel,
)
from app.modules.import_export.models import ImportExportJobModel
from app.modules.knowledge_graph.models import (
    ConceptModel,
    ConceptRelationModel,
    MasteryStateModel,
)
from app.modules.knowledge_base.models import KnowledgeChunkModel
from app.modules.memory.models import MemoryCardModel, ReviewRecordModel
from app.modules.notes.models import NoteBlockModel, NoteModel, NoteRelationModel
from app.modules.resources.models import (
    ParsedResourceChapterModel,
    ParsedResourceModel,
    ResourceModel,
)
from app.modules.thinking.models import (
    RevisionSuggestionModel,
    ThinkingPromptModel,
    ThinkingSessionModel,
)
from app.modules.users.models import UserModel, UserPreferenceModel

__all__ = [
    "AiTaskModel",
    "AuthSessionModel",
    "CollectionModel",
    "CommunityInteractionModel",
    "CommunityPostModel",
    "ConceptModel",
    "ConceptRelationModel",
    "ContributionRecordModel",
    "CourseModel",
    "FeynmanEvaluationModel",
    "FeynmanQuestionModel",
    "FeynmanSessionModel",
    "ImportExportJobModel",
    "KnowledgeChunkModel",
    "LearningActivityModel",
    "LearningSpaceModel",
    "MasteryStateModel",
    "MemoryCardModel",
    "NoteBlockModel",
    "NoteModel",
    "NoteRelationModel",
    "ParsedResourceChapterModel",
    "ParsedResourceModel",
    "ReviewRecordModel",
    "RevisionSuggestionModel",
    "ResourceModel",
    "SharedAssetModel",
    "StudyLogModel",
    "ThinkingPromptModel",
    "ThinkingSessionModel",
    "UserModel",
    "UserPreferenceModel",
]
