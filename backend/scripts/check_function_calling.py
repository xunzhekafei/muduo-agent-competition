"""
P0 · Function Calling 可用性验证

用途：在正式做对话式 Agent 之前，确认所用模型是否支持工具调用（Function Calling），
      以及工具结果回填后能否继续对话（完整 ReAct 循环的第二段）。

运行（在 backend/ 目录下）：
    python -m scripts.check_function_calling
    python -m scripts.check_function_calling --provider deepseek
    python -m scripts.check_function_calling --model deepseek-chat --verbose

判定标准：
    ✅ 通过 = 第 1 轮返回 tool_calls + 第 2 轮回填 tool 结果后能给出自然语言回答
    ❌ 失败 = 不返回 tool_calls / 不支持 tool 角色消息 / 模型不存在

退出码：0 = 至少一个模型可用；1 = 全部不可用
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# ---- 让中文在 Windows 控制台正常显示 ----
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

BACKEND_DIR = Path(__file__).resolve().parent.parent

# 待测候选：(provider, base_url, model, 环境变量名)
CANDIDATES = [
    ("deepseek", "https://api.deepseek.com/v1", "deepseek-chat", "DEEPSEEK_API_KEY"),
    ("deepseek", "https://api.deepseek.com/v1", "deepseek-v4-flash", "DEEPSEEK_API_KEY"),
    ("deepseek", "https://api.deepseek.com/v1", "deepseek-v4-pro", "DEEPSEEK_API_KEY"),
    ("qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus", "DASHSCOPE_API_KEY"),
]

# 测试用工具：模型无法凭空知道答案，必须调用工具
TEST_TOOL = {
    "type": "function",
    "function": {
        "name": "search_notes",
        "description": (
            "检索用户的学习笔记，返回笔记标题和摘要。"
            "当用户询问'我记过什么''帮我找某主题的笔记'时必须调用此工具，"
            "不要凭空回答，因为笔记内容只有本工具能访问。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "检索关键词，如'进程调度'"},
            },
            "required": ["query"],
        },
    },
}

FIRST_QUESTION = "帮我找一下我记过的关于进程调度的笔记"

FAKE_NOTES = (
    "找到 2 篇笔记：\n"
    "- [n_1001] 进程调度算法对比：FCFS、SJF、多级反馈队列的适用场景\n"
    "- [n_1002] 多级反馈队列如何防止饥饿：老化机制与时间片调整"
)


def load_env() -> None:
    """加载 backend/.env（不覆盖已存在的环境变量）。"""
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        print(f"[警告] 未找到 {env_path}，仅使用系统环境变量\n")
        return
    try:
        from dotenv import load_dotenv

        load_dotenv(env_path, override=False)
        print(f"[信息] 已加载环境变量文件：{env_path}")
    except ImportError:
        # 无 python-dotenv 时的极简解析
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
        print(f"[信息] 已解析环境变量文件：{env_path}")


def mask_key(key: str) -> str:
    if not key:
        return "<未设置>"
    if len(key) <= 10:
        return "*" * len(key)
    return f"{key[:6]}...{key[-4:]}（长度 {len(key)}）"


def test_one(provider: str, base_url: str, model: str, key: str, verbose: bool) -> dict:
    """测试单个模型。返回 {tool_call, roundtrip, detail}"""
    from openai import OpenAI, APIError, APIConnectionError, AuthenticationError

    result = {"model": model, "tool_call": False, "roundtrip": False, "detail": ""}

    try:
        client = OpenAI(api_key=key, base_url=base_url, timeout=60.0)
    except Exception as exc:  # pragma: no cover
        result["detail"] = f"客户端初始化失败：{exc}"
        return result

    # ---------- 第 1 轮：会不会调工具 ----------
    messages = [{"role": "user", "content": FIRST_QUESTION}]
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=[TEST_TOOL],
            tool_choice="auto",
            temperature=0,
            max_tokens=512,
        )
    except AuthenticationError as exc:
        result["detail"] = f"鉴权失败（API Key 无效）：{getattr(exc, 'message', exc)}"
        return result
    except APIConnectionError as exc:
        result["detail"] = f"网络连接失败：{exc}"
        return result
    except Exception as exc:
        status = getattr(exc, "status_code", "?")
        body = getattr(exc, "body", None) or getattr(exc, "message", str(exc))
        result["detail"] = f"第1轮请求失败 [{status}]：{str(body)[:300]}"
        return result

    msg = resp.choices[0].message
    if not msg.tool_calls:
        result["detail"] = (
            "模型未发起工具调用（可能直接用自然语言回答了）——"
            "Function Calling 未生效或工具描述未被采纳"
        )
        if verbose:
            result["detail"] += f"\n    模型原文：{(msg.content or '')[:200]}"
        return result

    result["tool_call"] = True
    call = msg.tool_calls[0]
    if verbose:
        print(f"    调用工具：{call.function.name}({call.function.arguments})")

    # ---------- 第 2 轮：工具结果回填后能否继续 ----------
    messages.append(msg.model_dump(exclude_none=True))
    messages.append({
        "role": "tool",
        "tool_call_id": call.id,
        "content": FAKE_NOTES,
    })

    try:
        resp2 = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=[TEST_TOOL],
            tool_choice="auto",
            temperature=0,
            max_tokens=512,
        )
    except Exception as exc:
        status = getattr(exc, "status_code", "?")
        body = getattr(exc, "body", None) or getattr(exc, "message", str(exc))
        result["detail"] = f"第2轮（tool 角色回填）失败 [{status}]：{str(body)[:300]}"
        return result

    final = resp2.choices[0].message.content or ""
    if not final.strip():
        result["detail"] = "第2轮返回空内容"
        return result

    result["roundtrip"] = True
    result["detail"] = final.strip().replace("\n", " ")[:150]
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="验证模型是否支持 Function Calling")
    parser.add_argument("--provider", choices=["all", "deepseek", "qwen"], default="all")
    parser.add_argument("--model", help="只测指定模型名")
    parser.add_argument("--verbose", "-v", action="store_true", help="打印中间细节")
    parser.add_argument("--list", action="store_true", help="只列出待测模型")
    args = parser.parse_args()

    if args.list:
        for p, _u, m, _k in CANDIDATES:
            print(f"{p:10s} {m}")
        return 0

    load_env()
    print("=" * 78)
    print("P0 · Function Calling 可用性验证")
    print("=" * 78)
    print(f"后端目录：{BACKEND_DIR}")
    print()

    rows = []
    for provider, base_url, model, env_key in CANDIDATES:
        if args.provider != "all" and provider != args.provider:
            continue
        if args.model and model != args.model:
            continue

        key = os.environ.get(env_key, "").strip()
        print(f"▸ 测试 {provider} / {model}")
        print(f"  密钥 {env_key} = {mask_key(key)}")

        if not key:
            print("  跳过：未配置该密钥\n")
            rows.append((provider, model, "跳过", "未配置密钥"))
            continue

        res = test_one(provider, base_url, model, key, args.verbose)
        if res["tool_call"] and res["roundtrip"]:
            verdict = "✅ 可用"
        elif res["tool_call"]:
            verdict = "⚠️ 半可用"
        else:
            verdict = "❌ 不可用"

        print(f"  工具调用：{'✅' if res['tool_call'] else '❌'}    "
              f"结果回填：{'✅' if res['roundtrip'] else '❌'}")
        print(f"  结论：{verdict}")
        print(f"  详情：{res['detail']}")
        print()
        rows.append((provider, model, verdict, res["detail"]))

    # ---------- 汇总 ----------
    print("=" * 78)
    print("汇总")
    print("=" * 78)
    for provider, model, verdict, _detail in rows:
        print(f"{verdict:12s} {provider:10s} {model}")

    usable = [r for r in rows if r[2] == "✅ 可用"]
    print()
    if usable:
        print(f"✅ 共 {len(usable)} 个模型完全可用，推荐：{usable[0][1]}")
        print()
        print("下一步：把这个模型名写进 backend/.env 或 app/agent/prompts.py，进入 P1 工具层。")
        return 0
    else:
        print("❌ 没有模型通过完整验证。")
        print("   排查顺序：")
        print("   1) API Key 是否有效 / 余额是否充足")
        print("   2) 模型名是否正确（可用 --model 逐个试）")
        print("   3) 若 DeepSeek 全不支持，改用通义：配置 DASHSCOPE_API_KEY 后 --provider qwen")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
