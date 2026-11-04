"""HTTP 层冒烟测试：登录 → 工具列表 → 配置 → 一次真实对话。

用法：
    python scripts/http_agent_check.py [base_url]
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"
EMAIL = "student@example.com"
PASSWORD = "muduo123456"


def request(method: str, path: str, token: str | None = None, body: dict | None = None,
            timeout: int = 240) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise SystemExit(f"HTTP {exc.code} on {path}: {detail}") from exc


def wait_ready(retries: int = 40) -> None:
    for i in range(retries):
        try:
            urllib.request.urlopen(BASE + "/health", timeout=2)
            return
        except Exception:
            time.sleep(0.5)
    raise SystemExit("服务在等待期内未就绪")


def main() -> None:
    wait_ready()

    session = request("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD})
    token = session["data"]["accessToken"]
    print(f"[1/4] 登录成功，用户：{session['data'].get('user', {}).get('displayName', '?')}")

    tools = request("GET", "/api/v1/agent/tools", token)
    names = [item["name"] for item in tools["data"]]
    print(f"[2/4] 工具列表 {len(names)} 个：{', '.join(names)}")

    config = request("GET", "/api/v1/agent/config", token)
    print(f"[3/4] 配置：{json.dumps(config['data'], ensure_ascii=False)}")

    question = "我有哪些课程？简单列一下。"
    print(f"[4/4] 对话：{question}")
    started = time.time()
    result = request(
        "POST",
        "/api/v1/agent/chat",
        token,
        {"messages": [{"role": "user", "content": question}]},
    )
    elapsed = time.time() - started
    data = result["data"]
    for item in data["trace"]:
        print(f"    step{item['step']} {item['tool']}({json.dumps(item['args'], ensure_ascii=False)}) "
              f"-> {'OK' if item['ok'] else 'FAIL'}")
    print(f"\n--- 回复（{data['steps']} 步 / {elapsed:.1f}s / stopped={data['stopped']}）---")
    print(data["reply"])

    assert data["reply"].strip(), "回复为空"
    print("\nHTTP 层冒烟测试通过 OK")


if __name__ == "__main__":
    main()
