"""Agent HTTP 接口。

POST /agent/chat         —— 主入口：一次对话，内部可能多次调用工具
POST /agent/chat/stream  —— SSE 流式：过程中推送 step / done / error 事件
GET  /agent/tools        —— 列出可用工具（演示与调试用）
GET  /agent/config       —— 当前 Agent 配置
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agent.config import AGENT_MAX_STEPS, AGENT_MODEL, AGENT_REASONING_EFFORT
from app.agent.orchestrator import run_agent
from app.agent.schemas import TOOL_DEFINITIONS
from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.users.models import UserModel

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentMessage(BaseModel):
    role: str = Field(default="user")
    content: str = Field(default="")


class AgentChatRequest(BaseModel):
    messages: list[AgentMessage] = Field(default_factory=list)
    model: str | None = None
    reasoning_effort: str | None = None


# 使用同步 def：Agent 循环耗时较长，交给 FastAPI 线程池执行，避免阻塞事件循环
@router.post("/chat")
def chat(
    request: AgentChatRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    result = run_agent(
        db,
        current_user.id,
        [message.model_dump() for message in request.messages],
        model=request.model,
        reasoning_effort=request.reasoning_effort,
    )
    return data_response(result)


@router.post("/chat/stream")
def chat_stream(
    request: AgentChatRequest,
    current_user: UserModel = Depends(get_current_user),
):
    """SSE 流式对话：过程中逐条推送 step / done / error 事件。"""
    import json as _json
    import queue
    import threading

    from fastapi.responses import StreamingResponse

    from app.db.session import get_session_factory

    user_id = current_user.id
    messages = [message.model_dump() for message in request.messages]
    model = request.model
    reasoning_effort = request.reasoning_effort

    q: queue.Queue = queue.Queue()

    def _run() -> None:
        # 后台线程用独立 session，避免与请求级 session 生命周期耦合
        db = get_session_factory()()
        try:

            def _on_event(event: str, payload: dict) -> None:
                q.put({"event": event, "data": payload})

            run_agent(
                db,
                user_id,
                messages,
                model=model,
                reasoning_effort=reasoning_effort,
                on_event=_on_event,
            )
        except Exception as exc:  # noqa: BLE001 — 兜底，避免线程静默退出
            q.put({"event": "error", "data": {"message": str(exc)}})
        finally:
            db.close()
            q.put(None)  # 结束哨兵

    threading.Thread(target=_run, daemon=True).start()

    def _gen():
        while True:
            item = q.get()
            if item is None:
                break
            yield f"data: {_json.dumps(item, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/tools")
def list_tools():
    return data_response(
        [
            {
                "name": item["function"]["name"],
                "description": item["function"]["description"],
                "parameters": item["function"].get("parameters", {}),
            }
            for item in TOOL_DEFINITIONS
        ]
    )


@router.get("/config")
def agent_config():
    return data_response(
        {
            "model": AGENT_MODEL,
            "reasoningEffort": AGENT_REASONING_EFFORT,
            "maxSteps": AGENT_MAX_STEPS,
            "toolCount": len(TOOL_DEFINITIONS),
        }
    )
