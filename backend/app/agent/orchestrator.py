"""Agent 编排循环（ReAct）。

流程：
    用户输入
      → 模型判断（要不要调工具、调哪个）
      → 执行工具、把结果作为观察回填
      → 模型再判断 …… 直到模型不再调用工具，或触达步数/超时上限
      → 输出最终答复 + 完整执行轨迹
"""

from __future__ import annotations

import json
import time
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.agent.config import (
    AGENT_MAX_HISTORY,
    AGENT_MAX_STEPS,
    AGENT_MODEL,
    AGENT_REASONING_EFFORT,
    AGENT_TEMPERATURE,
    AGENT_TIMEOUT_SECONDS,
)
from app.agent.prompts import FINALIZE_PROMPT, SYSTEM_PROMPT
from app.agent.schemas import TOOL_DEFINITIONS
from app.agent.tools import run_tool
from app.integrations.registry import get_llm_provider


def _sanitize_history(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """只保留 role/content，并按上限截取最近的若干条。"""
    cleaned: list[dict[str, Any]] = []
    for message in messages or []:
        role = str(message.get("role") or "").strip()
        content = message.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            continue
        if not content.strip():
            continue
        cleaned.append({"role": role, "content": content})
    return cleaned[-AGENT_MAX_HISTORY:]


def _parse_arguments(raw: str) -> dict[str, Any]:
    """解析模型给出的参数 JSON，失败时返回空字典而不是抛错。"""
    if not raw or not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _finalize(
    llm,
    convo: list[dict[str, Any]],
    *,
    model: str,
    reasoning_effort: str | None,
    temperature: float,
) -> str:
    """达到上限后强制收尾：要求模型不再调工具，直接总结。"""
    closing = convo + [{"role": "user", "content": FINALIZE_PROMPT}]
    try:
        resp = llm.generate_with_tools(
            closing,
            TOOL_DEFINITIONS,
            model=model,
            temperature=temperature,
            tool_choice="none",
            reasoning_effort=reasoning_effort,
        )
        return (resp.content or "").strip()
    except Exception:  # noqa: BLE001 — 收尾失败不应让整个请求报错
        return ""


def run_agent(
    db: Session,
    user_id: str,
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    reasoning_effort: str | None = None,
    on_event: Callable[[str, dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """执行一次完整的 Agent 对话。返回 reply / trace / 统计信息。

    若传入 on_event，则会在过程中回调 ("step", {...}) / ("done", {...}) / ("error", {...})，
    供流式接口逐条推送给前端。
    """
    llm = get_llm_provider()
    model = model or AGENT_MODEL
    effort = AGENT_REASONING_EFFORT if reasoning_effort is None else reasoning_effort

    def emit(event: str, payload: dict[str, Any]) -> None:
        if on_event is None:
            return
        try:
            on_event(event, payload)
        except Exception:  # noqa: BLE001 — 事件回调失败不应影响主流程
            pass

    # s4 长期记忆：把学习者状态（薄弱点/待复习/最近练习）注入 system 上下文
    try:
        from app.agent.memory import build_learning_context

        learning_context = build_learning_context(db, user_id)
    except Exception:  # noqa: BLE001 —— 记忆注入失败不阻断对话
        learning_context = ""
    system_prompt = (
        f"{SYSTEM_PROMPT}\n\n{learning_context}" if learning_context else SYSTEM_PROMPT
    )

    convo: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    convo.extend(_sanitize_history(messages))

    trace: list[dict[str, Any]] = []
    started = time.time()
    total_in = 0
    total_out = 0
    stopped = "finished"

    for step in range(1, AGENT_MAX_STEPS + 1):
        if time.time() - started > AGENT_TIMEOUT_SECONDS:
            stopped = "timeout"
            break

        try:
            response = llm.generate_with_tools(
                convo,
                TOOL_DEFINITIONS,
                model=model,
                temperature=AGENT_TEMPERATURE,
                reasoning_effort=effort,
            )
        except Exception as exc:  # noqa: BLE001 — 模型层失败要给人话
            result = {
                "reply": f"抱歉，模型服务暂时不可用：{exc}",
                "trace": trace,
                "steps": len(trace),
                "stopped": "error",
                "elapsedMs": int((time.time() - started) * 1000),
                "usage": {"inputTokens": total_in, "outputTokens": total_out},
            }
            emit("error", {"message": result["reply"]})
            return result

        total_in += response.usage.input_tokens
        total_out += response.usage.output_tokens

        # 模型不再调用工具 → 本轮对话结束
        if not response.tool_calls:
            reply = (response.content or "").strip()
            if not reply:
                reply = "我没能生成有效回复，请换个说法再试一次。"
            result = {
                "reply": reply,
                "trace": trace,
                "steps": len(trace),
                "stopped": "finished",
                "elapsedMs": int((time.time() - started) * 1000),
                "usage": {"inputTokens": total_in, "outputTokens": total_out},
            }
            emit("done", result)
            return result

        # 回填 assistant 的 tool_calls 消息
        convo.append(response.raw_message)

        for call in response.tool_calls:
            if time.time() - started > AGENT_TIMEOUT_SECONDS:
                stopped = "timeout"
                break

            args = _parse_arguments(call.arguments)
            output = run_tool(call.name, args, db=db, user_id=user_id)

            entry = {
                "step": len(trace) + 1,
                "tool": call.name,
                "args": args,
                "result": output[:400],
                "ok": not output.startswith("工具执行失败")
                and not output.startswith("工具执行异常"),
            }
            trace.append(entry)
            emit("step", entry)
            convo.append(
                {"role": "tool", "tool_call_id": call.id, "content": output}
            )

        if stopped == "timeout":
            break

    # 触达步数或超时上限：请求模型基于已有信息收尾
    reply = _finalize(
        llm, convo, model=model, reasoning_effort=effort, temperature=AGENT_TEMPERATURE
    )
    if not reply:
        reply = (
            f"这个任务需要多步查询，我已经执行了 {len(trace)} 个步骤，"
            "但还没完成。可以告诉我更具体的目标吗？"
        )

    result = {
        "reply": reply,
        "trace": trace,
        "steps": len(trace),
        "stopped": "max_steps" if stopped == "finished" else stopped,
        "elapsedMs": int((time.time() - started) * 1000),
        "usage": {"inputTokens": total_in, "outputTokens": total_out},
    }
    emit("done", result)
    return result
