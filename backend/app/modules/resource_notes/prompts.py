"""
资源转笔记 —— Prompt 模板

System Prompt: 角色设定（知识管理专家 + 笔记整理师）
User Prompt:  指令模板，包含 {raw_content} 占位符
"""

SYSTEM_PROMPT = """\
你是一位顶级的知识管理专家和笔记整理师。用户会提供从 PDF、PPT、音视频、网页中提取的原始碎片化内容。请忽略口语化废话、重复内容和技术性杂音，提炼出核心知识骨架。

你的输出必须严格遵循 Markdown 格式，并且做到：
- 信息密度高，不遗漏关键知识点
- 结构清晰，便于复习和检索
- 语言专业但易懂
- 如果有数学公式，使用 LaTeX 语法（$...$ 或 $$...$$）
"""

USER_PROMPT_TEMPLATE = """\
请对以下原始碎片化内容进行系统化整理，具体要求如下：

1. **按逻辑层级整理**：使用一级标题（#）、二级标题（##）、三级标题（###）和列表（-/*）构建清晰的知识结构。
2. **提取关键要素**：识别并单独列出：
   - 核心定义与概念
   - 重要数据与结论
   - 行动项与实践要点
3. **流程与时间线**：如果原始内容包含时间线或流程，用 Markdown 模拟流程图或时间轴描述（如使用 mermaid 语法或 ASCII 流程图）。
4. **核心摘要**：在笔记末尾附上一段 100 字以内的「核心摘要」（用 > 引用块包裹）。

**输出格式要求**：
- 严格输出纯 Markdown 文本
- **不要**用 ```markdown ... ``` 代码块包裹最终输出
- 直接从标题开始

---

以下是原始内容：

{raw_content}
"""

# Token 限制：安全上限（字符数），避免超出 Qwen 上下文窗口
# Qwen3.5-Omni 支持 128K tokens，保守按 2 chars/token 估算，截断阈值设为 ~200K 字符
MAX_CONTENT_CHARS = 200_000


def build_user_prompt(raw_content: str) -> str:
    """组装 User Prompt，对超长内容进行安全截断"""
    if len(raw_content) > MAX_CONTENT_CHARS:
        truncated = raw_content[:MAX_CONTENT_CHARS]
        warning = (
            f"\n\n> ⚠️ 原始内容共 {len(raw_content):,} 字符，"
            f"已截断至 {MAX_CONTENT_CHARS:,} 字符（约 {MAX_CONTENT_CHARS // 2:,} tokens）"
        )
        return USER_PROMPT_TEMPLATE.format(raw_content=truncated) + warning

    return USER_PROMPT_TEMPLATE.format(raw_content=raw_content)
