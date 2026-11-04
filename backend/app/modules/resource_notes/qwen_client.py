"""
通义千问 Qwen3.5-Omni API 客户端

通过 DashScope 兼容 OpenAI SDK 调用大模型进行内容总结。
"""

from __future__ import annotations

import logging
import os
from collections.abc import Callable

from openai import OpenAI

from app.modules.resource_notes.prompts import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)

# ---------- 配置 ----------
DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
MODEL_NAME = "qwen3.5-omni-plus"


def _get_api_key() -> str | None:
    """从环境变量读取 API Key（必须在 .env 中配置 DASHSCOPE_API_KEY）。"""
    return os.getenv("DASHSCOPE_API_KEY")


class QwenOmniClient:
    """Qwen3.5-Omni 摘要客户端"""

    def __init__(self) -> None:
        api_key = _get_api_key()
        if not api_key:
            raise RuntimeError(
                "DASHSCOPE_API_KEY 环境变量未设置，"
                "请在 .env 中配置或 export DASHSCOPE_API_KEY=your-key"
            )
        self._client = OpenAI(
            api_key=api_key,
            base_url=DASHSCOPE_BASE_URL,
        )

    def summarize(
        self,
        raw_content: str,
        on_progress: Callable[[int, str], None] | None = None,
    ) -> str:
        """
        对原始内容进行 AI 总结，返回 Markdown 格式结果。

        Args:
            raw_content: 解析后的原始文本（可能来自多个文件/网页的合并）
            on_progress: 可选的进度回调 (progress_0_100, phase_text)

        Returns:
            Markdown 格式的结构化笔记
        """
        user_prompt = build_user_prompt(raw_content)

        logger.info(
            "Calling Qwen Omni for summarization — raw_content length: %d chars",
            len(raw_content),
        )

        completion = self._client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            modalities=["text"],
            stream=True,
            stream_options={"include_usage": True},
        )

        return self._stream_collect(completion, on_progress=on_progress)

    def summarize_media(
        self,
        media_base64: str,
        mime_type: str,
        on_progress: Callable[[int, str], None] | None = None,
    ) -> str:
        """
        对音频/视频文件进行多模态总结（直接传入 Base64 编码的媒体文件）。

        Args:
            media_base64: Base64 编码的媒体文件内容
            mime_type: MIME 类型（如 "audio/mp3", "video/mp4"）
            on_progress: 可选的进度回调 (progress_0_100, phase_text)

        Returns:
            Markdown 格式的总结
        """
        logger.info("Calling Qwen Omni for media summarization — mime: %s", mime_type)

        completion = self._client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": build_user_prompt("（以下为音视频文件内容，请直接基于音频/视频内容进行总结）"),
                        },
                        {
                            "type": "audio_url" if mime_type.startswith("audio/") else "video_url",
                            "audio_url" if mime_type.startswith("audio/") else "video_url": {
                                "url": f"data:{mime_type};base64,{media_base64}",
                            },
                        },
                    ],
                },
            ],
            modalities=["text"],
            stream=True,
            stream_options={"include_usage": True},
        )

        return self._stream_collect(completion, on_progress=on_progress)

    @staticmethod
    def _stream_collect(
        completion,
        on_progress: Callable[[int, str], None] | None = None,
    ) -> str:
        """收集流式输出，并周期性回调进度"""
        chunks: list[str] = []
        char_count = 0
        chunk_index = 0

        for chunk in completion:
            if chunk.choices:
                delta = chunk.choices[0].delta
                if delta.content:
                    chunks.append(delta.content)
                    char_count += len(delta.content)
                    chunk_index += 1

                    # 每收到约 10 个 chunk 或每积累 500 字符回调一次进度
                    if on_progress and (chunk_index % 10 == 0 or char_count % 500 < len(delta.content)):
                        # 用渐进曲线映射：输出越多越接近完成
                        # 按字符数对数增长 → 永远不会到 100%
                        import math
                        pct = min(60 + int(math.log(char_count + 1) / math.log(25000) * 25), 88)
                        on_progress(pct, f"AI 正在生成笔记…（已输出 {char_count} 字符）")

        result = "".join(chunks)
        logger.info("Qwen summarization complete — output length: %d chars", len(result))
        return result


# 模块级单例
_qwen_client: QwenOmniClient | None = None


def get_qwen_client() -> QwenOmniClient:
    """获取 QwenOmniClient 单例"""
    global _qwen_client
    if _qwen_client is None:
        _qwen_client = QwenOmniClient()
    return _qwen_client
