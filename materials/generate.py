"""从代码生成 PPT 素材：系统提示词全文 + 14 个工具定义清单（与线上完全一致）。

用法：python materials/generate.py
输出：materials/01_系统提示词.md、materials/03_工具清单.md
"""

from __future__ import annotations

import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = pathlib.Path(__file__).resolve().parent
BACKEND = HERE.parent / "backend"
sys.path.insert(0, str(BACKEND))

from app.agent.prompts import FINALIZE_PROMPT, SYSTEM_PROMPT  # noqa: E402
from app.agent.schemas import TOOL_DEFINITIONS  # noqa: E402


def write_prompt_doc() -> None:
    lines = [
        "# 系统提示词全文（PPT「提示词设计截图」素材）",
        "",
        "> 来源：`backend/app/agent/prompts.py` 的 `SYSTEM_PROMPT`（线上版本，自动生成）",
        "",
        "```text",
        SYSTEM_PROMPT.strip(),
        "```",
        "",
        "---",
        "",
        "## 补充：达到步数上限后的收尾指令（`FINALIZE_PROMPT`）",
        "",
        "```text",
        FINALIZE_PROMPT.strip(),
        "```",
        "",
    ]
    (HERE / "01_系统提示词.md").write_text("\n".join(lines), encoding="utf-8")


def write_tools_doc() -> None:
    lines = [
        "# Agent 工具清单（14 个）",
        "",
        "> 来源：`backend/app/agent/schemas.py` 的 `TOOL_DEFINITIONS`（线上版本，自动生成）",
        "> 每条工具描述都包含三件事：做什么 / 什么时候用 / 返回什么，直接影响模型选工具的准确率。",
        "",
    ]
    for index, item in enumerate(TOOL_DEFINITIONS, start=1):
        fn = item["function"]
        params = fn.get("parameters", {}).get("properties", {})
        required = fn.get("parameters", {}).get("required", [])
        lines.append(f"## {index}. `{fn['name']}`")
        lines.append("")
        lines.append(fn["description"])
        lines.append("")
        if params:
            lines.append("| 参数 | 类型 | 必填 | 说明 |")
            lines.append("|------|------|------|------|")
            for pname, spec in params.items():
                ptype = spec.get("type", "-")
                if ptype == "array":
                    ptype = "array[string]"
                req = "是" if pname in required else "否"
                lines.append(f"| `{pname}` | {ptype} | {req} | {spec.get('description', '')} |")
            lines.append("")
    (HERE / "03_工具清单.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    write_prompt_doc()
    write_tools_doc()
    print(f"已生成：{HERE / '01_系统提示词.md'}")
    print(f"已生成：{HERE / '03_工具清单.md'}")


if __name__ == "__main__":
    main()
