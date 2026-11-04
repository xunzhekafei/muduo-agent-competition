from fastapi import APIRouter

from app.agent.routes import router as agent_router
from app.api.v1.routes import system_router
from app.modules.ai_tasks.routes import router as ai_tasks_router
from app.modules.auth.routes import router as auth_router
from app.modules.community.routes import router as community_router
from app.modules.courses.routes import router as courses_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.feynman.routes import router as feynman_router
from app.modules.import_export.routes import router as import_export_router
from app.modules.knowledge_base.routes import router as knowledge_base_router
from app.modules.knowledge_graph.routes import router as knowledge_graph_router
from app.modules.memory.routes import router as memory_router
from app.modules.notes.routes import router as notes_router
from app.modules.quick_notes.routes import router as quick_notes_router
from app.modules.resource_notes.routes import router as resource_notes_router
from app.modules.resources.routes import router as resources_router
from app.modules.thinking.routes import router as thinking_router
from app.modules.users.routes import router as users_router
from app.services.routes import router as workflow_router

api_v1_router = APIRouter()
api_v1_router.include_router(system_router)
api_v1_router.include_router(agent_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(courses_router)
api_v1_router.include_router(resources_router)
api_v1_router.include_router(import_export_router)
api_v1_router.include_router(resource_notes_router)
api_v1_router.include_router(ai_tasks_router)
api_v1_router.include_router(workflow_router)
api_v1_router.include_router(quick_notes_router)
api_v1_router.include_router(notes_router)
api_v1_router.include_router(memory_router)
api_v1_router.include_router(thinking_router)
api_v1_router.include_router(feynman_router)
api_v1_router.include_router(knowledge_base_router)
api_v1_router.include_router(knowledge_graph_router)
api_v1_router.include_router(community_router)
api_v1_router.include_router(dashboard_router)
