"""端到端冒烟：用真实 LLM 跑一次 run_agent（与 Web /agent/chat 同一代码路径）。

- 数据库用临时副本，不污染演示数据
- 会消耗少量真实 token（一次对话、几个工具调用）

用法：python smoke_web_agent.py [木铎backend目录] ["你的问题"]
"""
import os
import pathlib
import shutil
import sys
import tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BACKEND = pathlib.Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else r"d:\刘宇童\其它\老马笔记——笔记类agent\muduo-agent\backend"
).resolve()
QUESTION = sys.argv[2] if len(sys.argv) > 2 else "我今天该复习什么？帮我安排一下"

sys.path.insert(0, str(BACKEND))

# 用临时副本数据库，避免写坏演示数据
tmpdir = pathlib.Path(tempfile.mkdtemp(prefix="muduo_smoke_"))
db_copy = tmpdir / "smoke.sqlite3"
shutil.copy(BACKEND / "muduo_dev.sqlite3", db_copy)
os.environ["MUDUO_DATABASE_URL"] = f"sqlite+pysqlite:///{db_copy.as_posix()}"

# 显式加载 backend/.env（app 的 _load_dotenv 只认当前目录，这里不从 backend 目录启动）
env_file = BACKEND / ".env"
if env_file.is_file():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value

from app.agent.orchestrator import run_agent  # noqa: E402
from app.db.session import get_session_factory  # noqa: E402
from app.integrations.registry import get_llm_provider  # noqa: E402

provider = get_llm_provider()
print(f"provider: {provider.provider_name} | question: {QUESTION}")

db = get_session_factory()()
try:
    result = run_agent(
        db,
        "user_001",
        [{"role": "user", "content": QUESTION}],
        on_event=lambda event, payload: print(f"[event] {event}: {str(payload)[:120]}"),
    )
finally:
    db.close()
    shutil.rmtree(tmpdir, ignore_errors=True)

print("\n=== 结果 ===")
print(f"stopped={result['stopped']} steps={result['steps']} "
      f"elapsed={result['elapsedMs']}ms usage={result['usage']}")
print("--- reply ---")
print(result["reply"][:1000])
print("--- trace ---")
for item in result["trace"]:
    print(f"{item['step']}. {item['tool']}({item['args']}) ok={item['ok']}")

sys.exit(0 if result["stopped"] == "finished" and result["trace"] else 1)
