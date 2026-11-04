import logging
import os
import subprocess
import json
import tempfile
from pathlib import Path

from sqlalchemy.orm import Session

from app.integrations.llm import DeepSeekProvider, LLMGenerationRequest, LLMMessage

logger = logging.getLogger(__name__)


class QuickNotesService:
    """速记模式业务逻辑"""

    def __init__(self, db: Session) -> None:
        self.db = db

    def process_video(self, video_path: str, file_name: str) -> list[dict]:
        """处理上传的视频文件，尝试提取音频并生成知识点树

        返回节点列表: [{title, parentId?, content?}, ...]
        """
        # 1. 尝试用 ffmpeg 提取音频
        transcript = ""
        if self._check_ffmpeg():
            audio_path = self._extract_audio(video_path, file_name)
            if audio_path:
                transcript = self._transcribe_audio(audio_path)
                try:
                    os.unlink(audio_path)
                except Exception:
                    pass

        # 2. 用 AI 生成树结构
        if transcript:
            return self._ai_build_tree(file_name, transcript)
        else:
            # 无音频转写结果时，基于文件名生成
            return self._ai_build_tree(file_name, "")

    def _check_ffmpeg(self) -> bool:
        """检查系统是否安装了 ffmpeg"""
        try:
            subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                timeout=5,
            )
            return True
        except Exception:
            logger.warning("ffmpeg 未安装，跳过音频提取")
            return False

    def _extract_audio(self, video_path: str, file_name: str) -> str | None:
        """用 ffmpeg 从视频中提取音频为 WAV"""
        try:
            audio_path = os.path.join(
                tempfile.gettempdir(),
                f"audio_{file_name.replace('.', '_')}.wav",
            )
            subprocess.run(
                [
                    "ffmpeg", "-i", video_path,
                    "-vn", "-ar", "16000", "-ac", "1",
                    "-f", "wav", audio_path,
                    "-y",
                ],
                capture_output=True,
                timeout=300,  # 5 分钟超时
            )
            if os.path.exists(audio_path) and os.path.getsize(audio_path) > 100:
                return audio_path
        except Exception as e:
            logger.error("ffmpeg 提取音频失败: %s", e)
        return None

    def _transcribe_audio(self, audio_path: str) -> str:
        """转写音频（当前返回空，等待 FunASR 集成）"""
        # TODO: 集成 FunASR WebSocket 客户端
        logger.info("音频文件已准备: %s (等待 ASR 集成)", audio_path)
        return ""

    def _ai_build_tree(self, file_name: str, transcript: str) -> list[dict]:
        """用 DeepSeek AI 从文件信息生成知识点树"""
        try:
            provider = DeepSeekProvider()
            system_prompt = """你是一个知识整理助手。根据用户提供的视频/音频文件名和内容，生成结构化的知识点树。

输出格式为 JSON 数组，每项包含:
- title: 知识点标题（简洁，10字以内）
- parentId: 父节点ID（根节点为 null）
- content: 节点详细内容（50-100字的技术解释）

规则：
1. 第一个节点是根节点（parentId=null），标题从文件名提取
2. 子节点是根节点的细分知识点，parentId 填根节点的 index
3. 生成 3-6 个节点
4. 内容要技术准确、简明扼要
5. 输出纯 JSON，不要 markdown 包裹"""

            user_prompt = f"文件名: {file_name}\n"
            if transcript:
                user_prompt += f"音频转写内容: {transcript[:2000]}\n"
            user_prompt += "\n请根据以上信息生成知识点树，输出 JSON 数组。"

            request = LLMGenerationRequest(
                model="deepseek-v4-flash",
                messages=[
                    LLMMessage(role="system", content=system_prompt),
                    LLMMessage(role="user", content=user_prompt),
                ],
                temperature=0.7,
                max_tokens=2048,
            )
            response = provider.generate(request)
            text = response.content.strip()
            # 去掉可能的 ```json 包裹
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
                text = text.rsplit("```", 1)[0]
            nodes = json.loads(text)
            if isinstance(nodes, list):
                # 标准化 parentId：使用 index 而不是 title
                return [
                    {
                        "title": n.get("title", ""),
                        "parentId": str(n["parentId"]) if n.get("parentId") is not None else None,
                        "content": n.get("content", ""),
                    }
                    for n in nodes
                    if n.get("title")
                ]
            return []
        except Exception as e:
            logger.error("AI 构建树失败: %s", e)
            # 降级：返回一个根节点
            name = Path(file_name).stem.replace("_", " ").replace("-", " ")
            return [{"title": name[:20], "parentId": None, "content": ""}]
