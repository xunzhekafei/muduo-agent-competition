"""实验一：Agent 任务完成质量（真实 LLM，每个任务跑 RUNS 次）。

每次运行使用独立的临时数据库副本，避免污染演示数据。
输出：experiments/results/experiment1_raw.json + 终端汇总表。

用法：python experiments/run_experiments.py [RUNS]
"""

from __future__ import annotations

import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = pathlib.Path(__file__).resolve().parent
BACKEND = HERE.parent / "backend"
DB = BACKEND / "muduo_dev.sqlite3"
RESULTS = HERE / "results"
sys.path.insert(0, str(HERE))

from tasks import TASKS  # noqa: E402

RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 2


def main() -> None:
    RESULTS.mkdir(exist_ok=True)
    tmp_root = pathlib.Path(tempfile.mkdtemp(prefix="muduo_exp_"))
    records: list[dict] = []

    for task_id in TASKS:
        for run in range(1, RUNS + 1):
            db_copy = tmp_root / f"{task_id}_{run}.sqlite3"
            shutil.copy(DB, db_copy)
            out_path = tmp_root / f"{task_id}_{run}.json"
            env = dict(os.environ)
            env["MUDUO_DATABASE_URL"] = f"sqlite+pysqlite:///{db_copy.as_posix()}"

            print(f"[{task_id} 第{run}次] 运行中……", flush=True)
            started = time.time()
            try:
                subprocess.run(
                    [sys.executable, str(HERE / "_single_run.py"), task_id, str(out_path)],
                    env=env, cwd=str(HERE), timeout=300, check=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                )
                record = json.loads(out_path.read_text(encoding="utf-8"))
                record["taskRun"] = run
            except Exception as exc:  # noqa: BLE001
                record = {
                    "task": task_id, "taskRun": run, "error": str(exc)[:500],
                    "stopped": "error", "steps": 0, "elapsedMs": int((time.time() - started) * 1000),
                    "tools": [], "reply": "", "usage": {},
                }
            records.append(record)
            failed = sum(1 for t in record["tools"] if not t["ok"])
            print(f"  → steps={record['steps']} tools={len(record['tools'])} "
                  f"failed={failed} {record['elapsedMs'] / 1000:.1f}s", flush=True)

    out_file = RESULTS / "experiment1_raw.json"
    out_file.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---- 汇总 ----
    print("\n任务 | 运行数 | 平均步数 | 平均耗时(s) | 工具失败数 | 结束状态")
    print("---|---|---|---|---|---")
    for task_id in TASKS:
        rows = [r for r in records if r["task"] == task_id]
        avg_steps = sum(r["steps"] for r in rows) / len(rows)
        avg_s = sum(r["elapsedMs"] for r in rows) / len(rows) / 1000
        fails = sum(1 for r in rows for t in r["tools"] if not t["ok"])
        states = ",".join(r["stopped"] for r in rows)
        print(f"{task_id} | {len(rows)} | {avg_steps:.1f} | {avg_s:.1f} | {fails} | {states}")

    print(f"\n原始结果：{out_file}")
    print(f"临时数据库副本：{tmp_root}（可删除）")


if __name__ == "__main__":
    main()
