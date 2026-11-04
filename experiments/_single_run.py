"""单次 Agent 运行（由 run_experiments.py 以子进程方式调用，隔离环境与数据库）。

用法：python _single_run.py <task_id> <输出json路径>
环境变量：MUDUO_DATABASE_URL 由调用方指向临时数据库副本
"""

from __future__ import annotations

import json
import os
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = pathlib.Path(__file__).resolve().parent
BACKEND = HERE.parent / "backend"
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(HERE))

# 加载 backend/.env（app 的 _load_dotenv 只认 cwd）
for line in (BACKEND / ".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, _, value = line.partition("=")
    os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
os.environ.setdefault("MUDUO_EMBEDDING_PROVIDER", "zhipu")

from tasks import TASKS  # noqa: E402


def main() -> None:
    task_id = sys.argv[1]
    out_path = pathlib.Path(sys.argv[2])
    prompt = TASKS[task_id]

    from app.agent.orchestrator import run_agent
    from app.db.session import get_session_factory

    db = get_session_factory()()
    try:
        result = run_agent(
            db, "user_001", [{"role": "user", "content": prompt}]
        )
    finally:
        db.close()

    payload = {
        "task": task_id,
        "prompt": prompt,
        "stopped": result["stopped"],
        "steps": result["steps"],
        "elapsedMs": result["elapsedMs"],
        "usage": result["usage"],
        "tools": [
            {"tool": t["tool"], "ok": t["ok"]} for t in result["trace"]
        ],
        "reply": result["reply"],
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
