from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


LLMContent = str | list[dict[str, Any]] | None


@dataclass(slots=True)
class LLMMessage:
    role: str
    content: LLMContent
    name: str | None = None


@dataclass(slots=True)
class LLMUsage:
    input_tokens: int
    output_tokens: int
    total_tokens: int


@dataclass(slots=True)
class LLMGenerationRequest:
    model: str
    messages: list[LLMMessage]
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    stream: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LLMGenerationResponse:
    model: str
    content: str
    usage: LLMUsage
    finish_reason: str = "stop"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LLMToolCall:
    """模型发起的一次工具调用。"""

    id: str
    name: str
    arguments: str  # 原始 JSON 字符串，由调用方解析


@dataclass(slots=True)
class LLMToolResponse:
    """带工具调用能力的响应。content 与 tool_calls 至少有一个非空。"""

    content: str | None
    tool_calls: list[LLMToolCall]
    usage: LLMUsage
    finish_reason: str = "stop"
    raw_message: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class LLMProvider(Protocol):
    def generate(self, request: LLMGenerationRequest) -> LLMGenerationResponse:
        """Generate one complete assistant response."""

    def generate_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float = 0.3,
        tool_choice: str = "auto",
        reasoning_effort: str | None = None,
    ) -> LLMToolResponse:
        """Generate a response that may contain tool calls (Function Calling)."""


class OpenAICompatProvider:
    """OpenAI 兼容协议通用实现。DeepSeek / 智谱 GLM 等皆继承此类。"""

    provider_name = "openai-compat"
    default_base_url = ""
    api_key_env = ""
    default_model = ""
    supports_reasoning_effort = False

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        default_model: str | None = None,
    ) -> None:
        self._api_key = api_key or self._load_key_from_env()
        self._base_url = base_url or self.default_base_url
        self._default_model = default_model or self.default_model

    def generate(self, request: LLMGenerationRequest) -> LLMGenerationResponse:
        import json
        import urllib.request
        import urllib.error

        url = f"{self._base_url}/chat/completions"
        body = {
            "model": request.model or self._default_model,
            "messages": [
                {"role": m.role, "content": m.content} for m in request.messages
            ],
            "temperature": request.temperature or 0.7,
            "max_tokens": request.max_tokens or 2048,
        }
        data = json.dumps(body).encode("utf-8")

        http_request = urllib.request.Request(url, data=data, method="POST")
        http_request.add_header("Authorization", f"Bearer {self._api_key}")
        http_request.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(http_request, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else str(e)
            raise RuntimeError(f"{self.provider_name} API error {e.code}: {error_body}")

        choice = result["choices"][0]
        content = choice["message"]["content"]
        usage = result.get("usage", {})

        return LLMGenerationResponse(
            model=result.get("model", self._default_model),
            content=content,
            usage=LLMUsage(
                input_tokens=usage.get("prompt_tokens", 0),
                output_tokens=usage.get("completion_tokens", 0),
                total_tokens=usage.get("total_tokens", 0),
            ),
            finish_reason=choice.get("finish_reason", "stop"),
            metadata={"provider": self.provider_name},
        )

    def generate_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float = 0.3,
        tool_choice: str = "auto",
        reasoning_effort: str | None = None,
    ) -> LLMToolResponse:
        body: dict[str, Any] = {
            "model": model or self._default_model,
            "messages": messages,
            "tools": tools,
            "tool_choice": tool_choice,
            "temperature": temperature,
        }
        if reasoning_effort and self.supports_reasoning_effort:
            body["reasoning_effort"] = reasoning_effort

        try:
            result = self._post_chat(body)
        except RuntimeError as exc:
            # 部分模型/网关不认识 reasoning_effort，降级重试一次
            if reasoning_effort and self.supports_reasoning_effort and "reasoning_effort" in str(exc):
                body.pop("reasoning_effort", None)
                result = self._post_chat(body)
            else:
                raise

        choice = result["choices"][0]
        message = choice.get("message") or {}
        usage = result.get("usage") or {}

        calls = [
            LLMToolCall(
                id=call.get("id", ""),
                name=(call.get("function") or {}).get("name", ""),
                arguments=(call.get("function") or {}).get("arguments", "{}"),
            )
            for call in (message.get("tool_calls") or [])
        ]

        # 只保留协议字段，避免把 reasoning_content 等回传导致部分网关报错
        clean_message: dict[str, Any] = {
            "role": message.get("role", "assistant"),
            "content": message.get("content"),
        }
        if message.get("tool_calls"):
            clean_message["tool_calls"] = message["tool_calls"]

        return LLMToolResponse(
            content=message.get("content"),
            tool_calls=calls,
            usage=LLMUsage(
                input_tokens=usage.get("prompt_tokens", 0),
                output_tokens=usage.get("completion_tokens", 0),
                total_tokens=usage.get("total_tokens", 0),
            ),
            finish_reason=choice.get("finish_reason", "stop"),
            raw_message=clean_message,
            metadata={"provider": self.provider_name},
        )

    def _post_chat(self, body: dict[str, Any]) -> dict[str, Any]:
        import json
        import urllib.error
        import urllib.request

        data = json.dumps(body).encode("utf-8")
        http_request = urllib.request.Request(
            f"{self._base_url}/chat/completions", data=data, method="POST"
        )
        http_request.add_header("Authorization", f"Bearer {self._api_key}")
        http_request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(http_request, timeout=180) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8") if exc.fp else str(exc)
            raise RuntimeError(f"{self.provider_name} API error {exc.code}: {error_body}") from exc

    def _load_key_from_env(self) -> str:
        import os

        key = os.environ.get(self.api_key_env)
        if not key:
            raise RuntimeError(
                f"{self.api_key_env} 环境变量未设置，请在 .env 中添加 {self.api_key_env}=..."
            )
        return key


class DeepSeekProvider(OpenAICompatProvider):
    """DeepSeek API provider（OpenAI 兼容）。"""

    provider_name = "deepseek"
    default_base_url = "https://api.deepseek.com/v1"
    api_key_env = "DEEPSEEK_API_KEY"
    default_model = "deepseek-v4-pro"
    supports_reasoning_effort = True


class ZhipuProvider(OpenAICompatProvider):
    """智谱 GLM（open.bigmodel.cn），OpenAI 兼容协议。

    默认 glm-4.5：自带深度推理（reasoning_content），不接受 reasoning_effort 参数。
    """

    provider_name = "zhipu"
    default_base_url = "https://open.bigmodel.cn/api/paas/v4"
    api_key_env = "ZHIPU_API_KEY"
    default_model = "glm-4.5"
    supports_reasoning_effort = False


class MockLLMProvider:
    provider_name = "mock"

    def generate_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float = 0.3,
        tool_choice: str = "auto",
        reasoning_effort: str | None = None,
    ) -> LLMToolResponse:
        """mock 模式：不发起工具调用，直接返回提示文本，保证离线可跑。"""
        last_user = ""
        for message in reversed(messages):
            if message.get("role") == "user":
                last_user = str(message.get("content") or "")
                break
        text = f"[mock-agent] 收到：{last_user[:200]}（mock 模式，未接入真实模型）"
        return LLMToolResponse(
            content=text,
            tool_calls=[],
            usage=LLMUsage(input_tokens=0, output_tokens=0, total_tokens=0),
            raw_message={"role": "assistant", "content": text},
            metadata={"provider": "mock"},
        )

    def generate(self, request: LLMGenerationRequest) -> LLMGenerationResponse:
        prompt = _last_user_message(request.messages) or _render_messages(request.messages)
        if not prompt:
            prompt = "empty prompt"
        content = f"[mock:{request.model}] {prompt[:500]}"
        input_tokens = _token_count(_render_messages(request.messages))
        output_tokens = _token_count(content)
        return LLMGenerationResponse(
            model=request.model,
            content=content,
            usage=LLMUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
            ),
            metadata={"provider": self.provider_name, **request.metadata},
        )


def _last_user_message(messages: list[LLMMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            rendered = _render_content(message.content)
            if rendered:
                return rendered
    return ""


def _render_messages(messages: list[LLMMessage]) -> str:
    return "\n".join(
        f"{message.role}: {_render_content(message.content)}"
        for message in messages
        if _render_content(message.content)
    )


def _render_content(content: LLMContent) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content.strip()
    return " ".join(str(part) for part in content if part)


def _token_count(text: str) -> int:
    return len(text.split())
