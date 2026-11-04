"""木铎工具冒烟测试：直接调用工具函数验证数据库接线（不走 LLM，不消耗 token）。

用法：python smoke_muduo_tools.py
"""
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):  # Windows 终端默认 GBK，中文输出需要 UTF-8
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import muduo_tools  # noqa: E402


def main() -> None:
    checks = [
        ("get_overview", {}),
        ("list_courses", {}),
        ("get_mastery", {}),
        ("list_due_cards", {"limit": 3}),
        ("search_notes", {"query": "操作系统"}),
    ]
    failed = 0
    for name, args in checks:
        tool = next(t for t in muduo_tools.TOOL_OBJECTS if t.name == name)
        try:
            result = str(tool.call(args))
        except Exception as exc:  # noqa: BLE001
            result = f"异常：{type(exc).__name__}: {exc}"
        ok = not result.startswith(("工具执行失败", "工具执行异常", "异常"))
        failed += 0 if ok else 1
        print(f"--- [{name}] {'OK' if ok else 'FAIL'} ---")
        print(result[:500])
        print()

    print(f"工具数：{len(muduo_tools.TOOL_OBJECTS)}，失败 {failed} 项")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
