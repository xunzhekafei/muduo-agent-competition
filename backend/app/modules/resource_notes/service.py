"""
资源转笔记 —— 核心服务

负责文件上传管理、多格式解析编排、Qwen 大模型调用、进度追踪。
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import threading
import uuid
from datetime import datetime
from pathlib import Path

from app.modules.resource_notes.parsers import WebFetchError, parse_file
from app.modules.resource_notes.qwen_client import get_qwen_client
from app.modules.resource_notes.schemas import (
    ParseResponse,
    ParseTaskStatus,
    ProgressResponse,
    UploadedFileInfo,
    UploadResponse,
)

logger = logging.getLogger(__name__)

# ---------- 配置 ----------
# 上传文件临时目录（可通过环境变量覆盖）
UPLOAD_DIR = Path(os.getenv("MUDUO_UPLOAD_DIR", Path(__file__).resolve().parents[4] / "temp_uploads"))
# 上传大小限制：300MB
MAX_UPLOAD_SIZE_BYTES = 300 * 1024 * 1024
# 单文件异步解析超时（秒）
PARSE_TIMEOUT_SECONDS = 480

# ---------- 进度阶段定义 ----------
PROGRESS_PHASES = [
    (0,   "任务已提交"),
    (10,  "正在读取文件..."),
    (25,  "识别内容结构..."),
    (50,  "提取核心概念..."),
    (75,  "AI 正在生成摘要笔记..."),
    (95,  "整理完成"),
    (100, "解析完成"),
]

# ---------- 内存任务存储 ----------
# key: task_id, value: dict (包含 status, progress, phase, result, error 等)
# 生产环境应替换为 Redis
_tasks: dict[str, dict] = {}
_tasks_lock = threading.Lock()

# ---------- 文件元信息存储 ----------
# key: file_id, value: dict (filename, file_type, size_bytes, file_path, url)
_uploaded_files: dict[str, dict] = {}


def _phase_for_progress(progress: int) -> str:
    """根据进度百分比返回阶段文字"""
    phase = PROGRESS_PHASES[0][1]
    for threshold, text in PROGRESS_PHASES:
        if progress >= threshold:
            phase = text
    return phase


class ResourceNotesService:
    """资源转笔记服务"""

    # ── 文件上传 ──────────────────────────────────────

    def upload_file(
        self,
        *,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> UploadedFileInfo:
        """
        保存上传文件到临时目录，返回文件元信息。

        Args:
            filename: 原始文件名
            content: 文件二进制内容
            content_type: MIME 类型

        Returns:
            上传文件信息
        """
        # 大小检查
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise ValueError(
                f"文件大小超过限制（{len(content) / 1024 / 1024:.1f}MB > 300MB）"
            )

        # 类型判定
        file_type = self._infer_file_type(filename, content_type)

        # 生成唯一 ID 并保存
        file_id = f"file_{uuid.uuid4().hex[:12]}"
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        ext = Path(filename).suffix or ""
        stored_name = f"{file_id}{ext}"
        file_path = UPLOAD_DIR / stored_name

        file_path.write_bytes(content)

        info: dict = {
            "file_id": file_id,
            "filename": filename,
            "file_type": file_type,
            "size_bytes": len(content),
            "file_path": str(file_path),
            "url": None,
            "upload_time": datetime.utcnow(),
        }
        _uploaded_files[file_id] = info

        logger.info(
            "File uploaded: id=%s name=%s type=%s size=%d",
            file_id, filename, file_type, len(content),
        )

        return UploadedFileInfo(
            fileId=file_id,
            filename=filename,
            fileType=file_type,
            sizeBytes=len(content),
            uploadTime=info["upload_time"],
        )

    def upload_url(self, *, url: str) -> UploadedFileInfo:
        """
        注册网页链接（不下载文件，解析时再抓取）。

        Args:
            url: 网页链接

        Returns:
            上传文件信息（file_type="webpage"）
        """
        file_id = f"file_{uuid.uuid4().hex[:12]}"

        # 从 URL 提取可读文件名
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            display_name = parsed.netloc + (parsed.path or "/")
        except Exception:
            display_name = url[:80]

        info: dict = {
            "file_id": file_id,
            "filename": display_name,
            "file_type": "webpage",
            "size_bytes": 0,
            "file_path": None,
            "url": url,
            "upload_time": datetime.utcnow(),
        }
        _uploaded_files[file_id] = info

        logger.info("URL registered: id=%s url=%s", file_id, url)
        return UploadedFileInfo(
            fileId=file_id,
            filename=display_name,
            fileType="webpage",
            sizeBytes=0,
            uploadTime=info["upload_time"],
        )

    def delete_file(self, *, file_id: str) -> None:
        """
        删除已上传的文件（从内存和磁盘中移除）。

        Args:
            file_id: 文件 ID

        Raises:
            ValueError: 文件不存在
        """
        info = _uploaded_files.get(file_id)
        if info is None:
            raise ValueError(f"文件不存在: {file_id}")

        # 删除磁盘文件
        file_path = info.get("file_path")
        if file_path:
            try:
                Path(file_path).unlink(missing_ok=True)
                logger.info("Deleted file from disk: %s", file_path)
            except OSError as exc:
                logger.warning("Failed to delete file from disk: %s — %s", file_path, exc)

        # 从内存中移除
        del _uploaded_files[file_id]
        logger.info("File record removed: id=%s name=%s", file_id, info.get("filename"))

    # ── 解析编排 ──────────────────────────────────────

    async def start_parse(self, *, file_ids: list[str]) -> ParseResponse:
        """
        启动异步解析任务，立即返回 task_id。

        Args:
            file_ids: 已上传文件的 ID 列表

        Returns:
            含 task_id 的响应
        """
        # 校验 file_ids
        for fid in file_ids:
            if fid not in _uploaded_files:
                raise ValueError(f"文件不存在: {fid}")

        task_id = f"task_{uuid.uuid4().hex[:12]}"

        with _tasks_lock:
            _tasks[task_id] = {
                "status": ParseTaskStatus.PENDING,
                "progress": 0,
                "phase": _phase_for_progress(0),
                "files_total": len(file_ids),
                "files_done": 0,
                "result": None,
                "error": None,
            }

        # 后台异步执行解析
        asyncio.create_task(self._run_parse(task_id, file_ids))

        logger.info("Parse task created: id=%s files=%d", task_id, len(file_ids))
        return ParseResponse(taskId=task_id)

    def get_progress(self, *, task_id: str) -> ProgressResponse:
        """
        查询解析任务进度。

        Args:
            task_id: 任务 ID

        Returns:
            进度信息
        """
        task = _tasks.get(task_id)
        if task is None:
            raise ValueError(f"任务不存在: {task_id}")

        return ProgressResponse(
            taskId=task_id,
            status=task["status"],
            progress=task["progress"],
            phase=task["phase"],
            filesTotal=task["files_total"],
            filesDone=task["files_done"],
            result=task.get("result"),
            error=task.get("error"),
        )

    # ── 后台解析流程 ──────────────────────────────────

    async def _run_parse(self, task_id: str, file_ids: list[str]) -> None:
        """后台运行完整解析 → 总结流水线"""
        try:
            self._update_task(task_id, status=ParseTaskStatus.PARSING, progress=5)

            # 阶段 1：依次解析每个文件
            all_raw_parts: list[str] = []
            media_parts: list[tuple[str, str]] = []  # [(base64, mime_type), ...]

            for i, fid in enumerate(file_ids):
                info = _uploaded_files[fid]
                logger.info("Parsing file %d/%d: %s (type=%s)", i + 1, len(file_ids), info["filename"], info["file_type"])

                self._update_task(
                    task_id,
                    phase=f"正在解析: {info['filename']} ({i + 1}/{len(file_ids)})",
                    files_done=i,
                )

                try:
                    raw = await asyncio.wait_for(
                        asyncio.to_thread(
                            parse_file,
                            info["file_path"] or "",
                            info["file_type"],
                            info.get("url"),
                        ),
                        timeout=PARSE_TIMEOUT_SECONDS,
                    )

                    if raw.startswith("__MEDIA_BASE64__:"):
                        # 音视频 Base64 → 单独处理
                        _, mime, b64 = raw.split(":", 2)
                        media_parts.append((b64, mime))
                        logger.info("Media file queued for Qwen Omni: %s", info["filename"])
                    else:
                        all_raw_parts.append(raw)
                        logger.info("File parsed: %s → %d chars", info["filename"], len(raw))

                except asyncio.TimeoutError:
                    logger.error("Parse timeout for file: %s", info["filename"])
                    all_raw_parts.append(f"[解析超时] {info['filename']}")
                except WebFetchError as exc:
                    logger.error(
                        "Web fetch error for %s: [%s] %s",
                        info["filename"],
                        exc.error_code,
                        exc.user_message,
                    )
                    # 将用户友好错误信息写入 task，供前端展示
                    self._update_task(
                        task_id,
                        status=ParseTaskStatus.FAILED,
                        progress=0,
                        phase="解析失败",
                        error=exc.user_message,
                    )
                    return  # 网页抓取失败直接终止任务
                except Exception as exc:
                    logger.exception("Parse error for file: %s", info["filename"])
                    all_raw_parts.append(f"[解析失败: {exc}] {info['filename']}")

                # 进度: 10% → 50%（按文件数线性）
                progress = 10 + int((i + 1) / len(file_ids) * 40)
                self._update_task(task_id, progress=progress, files_done=i + 1)

            # 阶段 2：调用 Qwen 大模型总结
            self._update_task(
                task_id,
                status=ParseTaskStatus.SUMMARIZING,
                progress=55,
                phase="正在调用 AI 生成摘要...",
            )

            qwen = get_qwen_client()
            markdown_results: list[str] = []

            # 文本部分汇总（asyncio.to_thread 避免阻塞事件循环）
            if all_raw_parts:
                combined_text = "\n\n=====\n\n".join(all_raw_parts)
                self._update_task(task_id, progress=60, phase="AI 正在提取核心概念...")

                # 流式进度回调：在线程内更新 _tasks（threading.Lock 保证线程安全）
                def on_text_progress(progress: int, phase: str) -> None:
                    self._update_task(task_id, progress=progress, phase=phase)

                try:
                    text_result = await asyncio.to_thread(
                        qwen.summarize, combined_text, on_progress=on_text_progress
                    )
                    markdown_results.append(text_result)
                except Exception as exc:
                    logger.exception("Qwen summarization failed for text content")
                    markdown_results.append(f"> ⚠️ AI 总结失败: {exc}")

            # 音视频多模态汇总（同样放入线程池）
            if media_parts:
                self._update_task(task_id, progress=70, phase="AI 正在分析音视频内容...")

                def on_media_progress(progress: int, phase: str) -> None:
                    self._update_task(task_id, progress=progress, phase=phase)

                for idx, (b64, mime) in enumerate(media_parts):
                    try:
                        media_result = await asyncio.to_thread(
                            qwen.summarize_media, b64, mime, on_progress=on_media_progress
                        )
                        markdown_results.append(media_result)
                    except Exception as exc:
                        logger.exception("Qwen media summarization failed")
                        markdown_results.append(f"> ⚠️ 音视频分析失败: {exc}")

            # 阶段 3：完成
            final_markdown = "\n\n---\n\n".join(markdown_results)

            self._update_task(
                task_id,
                status=ParseTaskStatus.COMPLETED,
                progress=100,
                phase="解析完成",
                result=final_markdown,
            )

            logger.info("Parse task completed: id=%s result=%d chars", task_id, len(final_markdown))

        except Exception as exc:
            logger.exception("Parse task failed: id=%s", task_id)
            self._update_task(
                task_id,
                status=ParseTaskStatus.FAILED,
                progress=0,
                phase="解析失败",
                error=str(exc),
            )

    def _update_task(self, task_id: str, **kwargs) -> None:
        """线程安全地更新任务状态"""
        with _tasks_lock:
            if task_id in _tasks:
                _tasks[task_id].update(kwargs)
                # 如果有 progress 但没有 phase，自动补全阶段文字
                if "progress" in kwargs and "phase" not in kwargs:
                    _tasks[task_id]["phase"] = _phase_for_progress(_tasks[task_id]["progress"])

    # ── 工具方法 ──────────────────────────────────────

    @staticmethod
    def _infer_file_type(filename: str, content_type: str) -> str:
        """根据文件名和 MIME 推断资源类型"""
        name_lower = filename.lower()
        if name_lower.endswith(".pdf"):
            return "pdf"
        if name_lower.endswith((".ppt", ".pptx")):
            return "ppt"
        if name_lower.endswith((".doc", ".docx")):
            return "docx"
        if name_lower.endswith(".md"):
            return "markdown"
        if name_lower.endswith((".html", ".htm")):
            return "html"
        if name_lower.endswith((".mp4", ".avi", ".mov", ".mkv", ".webm")):
            return "video"
        if name_lower.endswith((".mp3", ".wav", ".flac", ".m4a", ".ogg")):
            return "audio"
        # 按 MIME 类型兜底
        if "pdf" in content_type:
            return "pdf"
        if "presentation" in content_type or "ppt" in content_type:
            return "ppt"
        if "word" in content_type or "document" in content_type or "msword" in content_type:
            return "docx"
        if "markdown" in content_type:
            return "markdown"
        if "html" in content_type:
            return "html"
        if "video" in content_type:
            return "video"
        if "audio" in content_type:
            return "audio"
        return "other"
