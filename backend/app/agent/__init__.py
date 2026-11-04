"""木铎对话式 Agent。

对外入口：
    run_agent(db, user_id, messages) -> dict
"""

from app.agent.orchestrator import run_agent

__all__ = ["run_agent"]
