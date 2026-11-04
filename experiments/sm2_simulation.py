"""实验二：SM-2 间隔重复的记忆保持效果模拟（纯本地，零 API 成本）。

模型假设（借鉴遗忘曲线研究）：
  - 单项知识的召回概率随距上次复习时间衰减：P = exp(-t / S)，S 为记忆强度（天）
  - 复习时按概率判断是否记得：记得则 S *= GROW（与 SM-2 的 EF 同量级），
    忘记则 S = max(1, S * 0.5) 并重学
  - 三种策略对比：不复习 / 每天全量复习 / SM-2 排期复习
指标：第 30 天平均召回概率、30 天平均保持率、总复习次数（效率）。
另外输出逐日保持率曲线 CSV（PPT 画图用）。

用法：python experiments/sm2_simulation.py
"""

from __future__ import annotations

import math
import pathlib
import random
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

N_ITEMS = 100
DAYS = 30
TRIALS = 300
INIT_STRENGTH = 3.0   # 初次学习后的记忆强度（天）
GROW = 2.5            # 成功回忆后的强度增长（≈SM-2 的默认 EF）
DECAY_ON_FAIL = 0.5   # 遗忘后的强度衰减

RESULTS_DIR = pathlib.Path(__file__).resolve().parent / "results"


def retention(day: int, strength: float) -> float:
    return math.exp(-day / max(strength, 0.1))


def simulate(policy: str, rng: random.Random) -> tuple[list[float], int]:
    """返回 (逐日平均召回概率曲线[0..DAYS], 总复习次数)。"""
    strengths = [INIT_STRENGTH] * N_ITEMS
    last_review = [0] * N_ITEMS
    ef = [2.5] * N_ITEMS          # SM-2 难度因子
    interval = [0] * N_ITEMS      # SM-2 当前间隔（天）
    due = [1] * N_ITEMS           # SM-2 下次到期日
    reviews = 0
    curve: list[float] = []

    for day in range(DAYS + 1):
        if day > 0 and policy != "none":
            targets = (
                range(N_ITEMS) if policy == "daily"
                else [i for i in range(N_ITEMS) if due[i] <= day]
            )
            for i in targets:
                reviews += 1
                p = retention(day - last_review[i], strengths[i])
                remembered = rng.random() < p
                if remembered:
                    strengths[i] *= GROW
                else:
                    strengths[i] = max(1.0, strengths[i] * DECAY_ON_FAIL)
                last_review[i] = day

                if policy == "sm2":
                    if not remembered:            # again：重置
                        interval[i] = 1
                        ef[i] = max(1.3, ef[i] - 0.2)
                    else:                         # good：按 EF 增长
                        if interval[i] in (0, 1):
                            interval[i] = 6
                        else:
                            interval[i] = max(interval[i] + 1, round(interval[i] * ef[i]))
                    due[i] = day + interval[i]

        curve.append(
            sum(retention(day - last_review[i], strengths[i]) for i in range(N_ITEMS)) / N_ITEMS
        )
    return curve, reviews


def main() -> None:
    rng = random.Random(42)
    names = {"none": "不复习", "daily": "每天全量复习", "sm2": "SM-2 间隔复习"}
    curves = {policy: [0.0] * (DAYS + 1) for policy in names}
    review_counts = {policy: 0.0 for policy in names}

    for policy in names:
        for _ in range(TRIALS):
            curve, reviews = simulate(policy, rng)
            curves[policy] = [a + b / TRIALS for a, b in zip(curves[policy], curve)]
            review_counts[policy] += reviews / TRIALS

    print(f"模拟参数：{N_ITEMS} 个知识点 × {DAYS} 天 × {TRIALS} 次重复")
    print(f"（记忆模型：P = exp(-t/S)，初始 S={INIT_STRENGTH}，成功复习 S×{GROW}）\n")
    print("策略 | 第30天保持率 | 平均保持率(第1-30天) | 总复习次数")
    print("---|---|---|---")
    for policy, name in names.items():
        curve = curves[policy]
        avg = sum(curve[1:]) / DAYS
        print(f"{name} | {curve[DAYS] * 100:.1f}% | {avg * 100:.1f}% | {review_counts[policy]:.0f} 次")

    RESULTS_DIR.mkdir(exist_ok=True)
    csv_path = RESULTS_DIR / "sm2_curve.csv"
    lines = ["day,none,daily,sm2"]
    for day in range(DAYS + 1):
        lines.append(f"{day},{curves['none'][day]:.4f},{curves['daily'][day]:.4f},{curves['sm2'][day]:.4f}")
    csv_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n逐日保持率曲线已保存：{csv_path}")


if __name__ == "__main__":
    main()
