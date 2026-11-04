"""
资源转笔记 —— 多格式解析工具层

为每种资源类型提供独立的解析函数，统一返回纯文本字符串。
"""

from __future__ import annotations

import base64
import logging
import re
import tempfile
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# 网页抓取超时（秒）
WEB_FETCH_TIMEOUT = 20
# 网页抓取最大重试次数
MAX_RETRIES = 2


# ═══════════════════════════════════════════════════════════
# 网页抓取错误异常（带用户友好提示）
# ═══════════════════════════════════════════════════════════

class WebFetchError(Exception):
    """网页抓取异常，携带面向用户的友好错误信息"""

    def __init__(self, user_message: str, error_code: str = "WEB_FETCH_FAILED") -> None:
        super().__init__(user_message)
        self.user_message = user_message
        self.error_code = error_code


# ═══════════════════════════════════════════════════════════
# PDF 解析
# ═══════════════════════════════════════════════════════════

def parse_pdf(file_path: str) -> str:
    """
    解析 PDF 文件，遍历每一页提取纯文本，保留段落结构。

    Args:
        file_path: PDF 文件路径

    Returns:
        提取的纯文本内容
    """
    try:
        import pdfplumber
    except ImportError:
        raise ImportError("请安装 pdfplumber: pip install pdfplumber")

    logger.info("Parsing PDF: %s", file_path)
    paragraphs: list[str] = []

    with pdfplumber.open(file_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            logger.info("  PDF page %d/%d", i, total)
            text = page.extract_text()
            if text:
                # 清理多余空白
                cleaned = re.sub(r"\n{3,}", "\n\n", text.strip())
                paragraphs.append(cleaned)

    result = "\n\n".join(paragraphs)
    logger.info("PDF parsed: %d pages → %d chars", total, len(result))
    return result


# ═══════════════════════════════════════════════════════════
# PPT / PPTX 解析
# ═══════════════════════════════════════════════════════════

def parse_ppt(file_path: str) -> str:
    """
    解析 PPT/PPTX 文件，遍历每一张幻灯片，提取文本和备注。

    Args:
        file_path: PPTX 文件路径

    Returns:
        提取的文本内容（按页拼接）
    """
    try:
        from pptx import Presentation
    except ImportError:
        raise ImportError("请安装 python-pptx: pip install python-pptx")

    logger.info("Parsing PPT: %s", file_path)
    prs = Presentation(file_path)
    slides: list[str] = []
    total = len(prs.slides)

    for i, slide in enumerate(prs.slides, start=1):
        logger.info("  PPT slide %d/%d", i, total)
        parts: list[str] = [f"## 第 {i} 页"]

        # 提取幻灯片正文
        shapes_text: list[str] = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    text = para.text.strip()
                    if text:
                        shapes_text.append(text)

        if shapes_text:
            parts.append("\n".join(shapes_text))

        # 提取备注
        if slide.has_notes_slide:
            notes_text = slide.notes_slide.notes_text_frame.text.strip()
            if notes_text:
                parts.append(f"\n> 备注：{notes_text}")

        slides.append("\n".join(parts))

    result = "\n\n---\n\n".join(slides)
    logger.info("PPT parsed: %d slides → %d chars", total, len(result))
    return result


# ═══════════════════════════════════════════════════════════
# 网页链接解析（含反爬虫分层策略）
# ═══════════════════════════════════════════════════════════

def _build_browser_headers(referer: str | None = None) -> dict[str, str]:
    """构建完整浏览器伪装请求头"""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;"
            "q=0.9,image/avif,image/webp,image/apng,*/*;"
            "q=0.8,application/signed-exchange;v=b3;q=0.7"
        ),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": (
            '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"'
        ),
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "DNT": "1",
    }
    if referer:
        headers["Referer"] = referer
    return headers


def _fetch_with_retry(url: str) -> str:
    """
    带重试和完整浏览器伪装的网页抓取。

    Args:
        url: 网页 URL

    Returns:
        响应 HTML 文本

    Raises:
        WebFetchError: 所有抓取失败均转为用户友好错误
    """
    try:
        import requests
    except ImportError:
        raise ImportError("请安装 requests: pip install requests")

    session = requests.Session()
    headers = _build_browser_headers()

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            logger.info(
                "Fetching webpage (attempt %d/%d): %s",
                attempt + 1,
                MAX_RETRIES + 1,
                url,
            )
            response = session.get(
                url,
                headers=headers,
                timeout=WEB_FETCH_TIMEOUT,
                allow_redirects=True,
            )

            # 反爬虫状态码 → 不重试，直接给友好提示
            if response.status_code in (403, 406):
                raise WebFetchError(
                    "该网站检测到自动化访问，拒绝提供内容。"
                    "建议：① 尝试将页面保存为本地 HTML 文件后上传解析；"
                    "② 手动复制网页内容后粘贴上传。",
                    error_code="ANTI_CRAWL_DETECTED",
                )
            if response.status_code == 404:
                raise WebFetchError(
                    "网页不存在（404），请检查链接是否正确。",
                    error_code="WEB_NOT_FOUND",
                )
            if response.status_code == 451:
                raise WebFetchError(
                    "该网页因法律原因不可访问。",
                    error_code="WEB_UNAVAILABLE_LEGAL",
                )

            response.raise_for_status()
            response.encoding = response.apparent_encoding or "utf-8"
            return response.text

        except WebFetchError:
            raise
        except requests.Timeout:
            last_error = requests.Timeout(
                f"网页请求超时（{WEB_FETCH_TIMEOUT}秒），请检查链接是否可访问。"
            )
            if attempt < MAX_RETRIES:
                wait = 1 * (2 ** attempt)
                logger.warning(
                    "Request timeout (attempt %d), retrying in %ds...",
                    attempt + 1,
                    wait,
                )
                time.sleep(wait)
        except requests.ConnectionError as exc:
            last_error = exc
            raise WebFetchError(
                "无法连接到该网站，请检查链接是否正确，"
                "或确认网络连接正常。",
                error_code="WEB_CONNECTION_FAILED",
            )
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                wait = 1 * (2 ** attempt)
                logger.warning(
                    "Request failed (attempt %d): %s, retrying in %ds...",
                    attempt + 1,
                    exc,
                    wait,
                )
                time.sleep(wait)
            else:
                raise WebFetchError(
                    "网页内容获取失败，建议手动复制网页内容后粘贴上传。",
                    error_code="WEB_FETCH_FAILED",
                )

    # 所有重试耗尽（仅超时情况会走到这里）
    raise WebFetchError(
        f"网页请求多次超时（共 {MAX_RETRIES + 1} 次），请稍后重试或检查链接。",
        error_code="WEB_TIMEOUT_EXHAUSTED",
    )


def _extract_webpage_text(html: str, url: str) -> str:
    """从 HTML 中提取正文文本"""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise ImportError("请安装 beautifulsoup4: pip install beautifulsoup4")

    soup = BeautifulSoup(html, "html.parser")

    # 移除无用标签
    for tag in soup(
        ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"]
    ):
        tag.decompose()

    # 优先提取 <article> 或 <main> 标签，否则使用 <body>
    content = soup.find("article") or soup.find("main") or soup.find("body")
    if content is None:
        logger.warning("No meaningful content found in %s", url)
        return ""

    text = content.get_text(separator="\n")

    # 清洗：合并多余空行
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    result = "\n".join(lines)

    logger.info("Webpage text extracted: %s → %d chars", url, len(result))
    return result


def parse_webpage(url: str) -> str:
    """
    抓取网页，剔除 script/style 标签，提取正文文本。

    分层反爬虫策略：
    1. 完整浏览器头伪装 + Session 维持 Cookie
    2. 自动重试（最多 2 次，指数退避）
    3. 反爬/超时/连接错误 → 用户友好提示

    Args:
        url: 网页 URL

    Returns:
        清洗后的正文文本

    Raises:
        WebFetchError: 抓取失败，携带用户友好提示
    """
    html = _fetch_with_retry(url)
    return _extract_webpage_text(html, url)


# ═══════════════════════════════════════════════════════════
# 音视频处理（多模态直传 Qwen Omni）
# ═══════════════════════════════════════════════════════════

def encode_media_base64(file_path: str) -> tuple[str, str]:
    """
    将音频/视频文件编码为 Base64 字符串，供 Qwen Omni 多模态接口直接使用。

    Args:
        file_path: 媒体文件路径

    Returns:
        (base64_string, mime_type) 元组
    """
    ext_to_mime = {
        ".mp3":  "audio/mpeg",
        ".wav":  "audio/wav",
        ".flac": "audio/flac",
        ".m4a":  "audio/mp4",
        ".ogg":  "audio/ogg",
        ".mp4":  "video/mp4",
        ".avi":  "video/x-msvideo",
        ".mov":  "video/quicktime",
        ".mkv":  "video/x-matroska",
        ".webm": "video/webm",
    }

    ext = Path(file_path).suffix.lower()
    mime_type = ext_to_mime.get(ext, "application/octet-stream")

    logger.info("Encoding media file: %s (mime: %s)", file_path, mime_type)

    with open(file_path, "rb") as f:
        data = f.read()

    b64 = base64.b64encode(data).decode("ascii")
    logger.info("Media encoded: %s → %d bytes base64", file_path, len(b64))
    return b64, mime_type


# ═══════════════════════════════════════════════════════════
# Word (.docx) 解析
# ═══════════════════════════════════════════════════════════

def parse_docx(file_path: str) -> str:
    """
    解析 .docx 文件，提取段落、表格文本和标题层级。

    Args:
        file_path: .docx 文件路径

    Returns:
        提取的结构化文本内容
    """
    try:
        from docx import Document
        from docx.oxml.ns import qn
    except ImportError:
        raise ImportError("请安装 python-docx: pip install python-docx")

    logger.info("Parsing DOCX: %s", file_path)
    doc = Document(file_path)
    parts: list[str] = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            parts.append("")
            continue

        # 判断段落样式以确定标题层级
        style_name = (para.style.name if para.style else "").lower()
        if "heading 1" in style_name or para.style.name == "Heading 1":
            parts.append(f"# {text}")
        elif "heading 2" in style_name:
            parts.append(f"## {text}")
        elif "heading 3" in style_name:
            parts.append(f"### {text}")
        elif "heading" in style_name:
            parts.append(f"**{text}**")
        else:
            parts.append(text)

    # 提取表格
    if doc.tables:
        parts.append("\n---\n")
        for t_idx, table in enumerate(doc.tables, start=1):
            parts.append(f"\n**表格 {t_idx}**\n")
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                parts.append(" | ".join(cells))

    result = "\n\n".join(part for part in parts if part)
    # 清理过多连续空行
    result = re.sub(r"\n{4,}", "\n\n\n", result)
    logger.info("DOCX parsed: %s → %d chars", file_path, len(result))
    return result


# ═══════════════════════════════════════════════════════════
# Markdown (.md) 解析
# ═══════════════════════════════════════════════════════════

def parse_markdown_file(file_path: str) -> str:
    """
    读取 .md 文件，保留 Markdown 格式标记。

    Args:
        file_path: .md 文件路径

    Returns:
        文件原始内容
    """
    logger.info("Reading Markdown file: %s", file_path)
    try:
        text = Path(file_path).read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # 尝试其他编码
        text = Path(file_path).read_text(encoding="gbk")
    logger.info("Markdown file read: %s → %d chars", file_path, len(text))
    return text


# ═══════════════════════════════════════════════════════════
# HTML (.html / .htm) 文件解析
# ═══════════════════════════════════════════════════════════

def parse_html_file(file_path: str) -> str:
    """
    解析本地 .html 文件，提取正文文本。

    Args:
        file_path: .html / .htm 文件路径

    Returns:
        清洗后的正文文本
    """
    logger.info("Parsing HTML file: %s", file_path)
    try:
        html = Path(file_path).read_text(encoding="utf-8")
    except UnicodeDecodeError:
        html = Path(file_path).read_text(encoding="gbk")

    return _extract_webpage_text(html, file_path)


# ═══════════════════════════════════════════════════════════
# 统一解析入口
# ═══════════════════════════════════════════════════════════

def parse_file(file_path: str, file_type: str, url: str | None = None) -> str:
    """
    根据文件类型自动选择解析器。

    Args:
        file_path: 本地文件路径（网页链接时可为空）
        file_type: 文件类型（pdf / ppt / docx / markdown / html / video / audio / webpage）
        url: 网页链接（仅 webpage 类型使用）

    Returns:
        解析后的纯文本（音视频返回 Base64 编码字符串，实际调用 Qwen 由 service 层处理）
    """
    type_lower = file_type.lower()

    if type_lower == "pdf":
        return parse_pdf(file_path)
    elif type_lower in ("ppt", "pptx"):
        return parse_ppt(file_path)
    elif type_lower == "docx":
        return parse_docx(file_path)
    elif type_lower == "markdown":
        return parse_markdown_file(file_path)
    elif type_lower == "html":
        return parse_html_file(file_path)
    elif type_lower == "webpage":
        if not url:
            raise ValueError("网页类型必须提供 URL")
        return parse_webpage(url)
    elif type_lower in ("audio", "video"):
        # 音视频不解码为文本，返回 Base64 供 Qwen 多模态处理
        b64, mime = encode_media_base64(file_path)
        # 返回一个标记，service 层据此调用 summarize_media
        return f"__MEDIA_BASE64__:{mime}:{b64}"
    else:
        raise ValueError(f"不支持的文件类型: {file_type}")
