"""Agent 端到端冒烟测试（不经过 HTTP，直接调用编排层）。

运行（在 backend/ 目录下）：
    python -m scripts.smoke_agent            # 跑全部场景
    python -m scripts.smoke_agent 1          # 只跑第 1 个场景
    python -m scripts.smoke_agent "自定义问题"
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

BACKEND_DIR = Path(__file__).resolve().parent.parent

SCENARIOS = [
    "我有哪些课程？",
    "我下周要考操作系统，帮我制定复习计划",
    "帮我找一下关于进程调度的笔记",
]


def main() -> int:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env", override=False)

    from sqlalchemy import select

    from app.agent.config import AGENT_MODEL, AGENT_REASONING_EFFORT
    from app.agent.orchestrator import run_agent
    from app.db.session import get_session_factory
    from app.modules.users.models import UserModel

    session = get_session_factory()()
    try:
        user = session.execute(select(UserModel).limit(1)).scalar_one_or_none()
        if user is None:
            print("❌ 数据库里没有用户，请先运行：python seed_data.py")
            return 1

        print("=" * 74)
        print(f"Agent 冒烟测试   模型={AGENT_MODEL}  推理等级={AGENT_REASONING_EFFORT}")
        print(f"测试用户：{user.email}  id={user.id}")
        print("=" * 74)

        arg = sys.argv[1] if len(sys.argv) > 1 else None
        if arg is None:
            questions = SCENARIOS
        elif arg.isdigit() and 1 <= int(arg) <= len(SCENARIOS):
            questions = [SCENARIOS[int(arg) - 1]]
        else:
            questions = [arg]

        failures = 0
        for index, question in enumerate(questions, start=1):
            print(f"\n【场景 {index}】{question}")
            print("-" * 74)
            started = time.time()
            try:
                result = run_agent(
                    session, user.id, [{"role": "user", "content": question}]
                )
            except Exception as exc:  # noqa: BLE001
                print(f"❌ 抛出异常：{type(exc).__name__}: {exc}")
                failures += 1
                continue

            elapsed = time.time() - started
            print(f"耗时 {elapsed:.1f}s  步数 {result['steps']}  结束原因 {result['stopped']}")
            print("\n工具轨迹：")
            if not result["trace"]:
                print("  （未调用任何工具）")
            for item in result["trace"]:
                mark = "✓" if item["ok"] else "✗"
                print(f"  {mark} [{item['step']}] {item['tool']}({item['args']})")
                preview = item["result"].replace("\n", " ")[:120]
                print(f"      → {preview}")
            print("\n最终答复：")
            print(result["reply"])
            print()

            if result["stopped"] == "error":
                failures += 1
            elif index == 2 and len(result["trace"]) < 2:
                print("⚠️  场景 2 预期应串联多个工具，实际步数偏少")
                failures += 1

        print("=" * 74)
        print("冒烟测试结束：" + ("✅ 全部通过" if failures == 0 else f"❌ {failures} 个场景有问题"))
        return 0 if failures == 0 else 1
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
