# PPT 素材包索引

> 本目录内容由代码/实验直接生成，与线上系统一致；队友写 PPT 时按表取用即可。

| 文件 | 内容 | 对应 PPT 章节 |
|------|------|--------------|
| `01_系统提示词.md` | 系统提示词全文（自动从 `backend/app/agent/prompts.py` 生成） | （六）提示词设计截图 /（三）模型与流程 |
| `02_提示词设计示例.md` | 4 个提示词设计示例：设计意图 + 实测效果 | （六）提示词设计截图（≥3 个要求） |
| `03_工具清单.md` | 14 个工具的定义全文（自动从 `schemas.py` 生成） | （三）模型与流程 /（二）预处理中的 Agent 用途 |
| `04_截图清单.md` | 10 张截图照单执行清单（对话/轨迹/提示词/深链） | （六）应用演示截图 |
| `05_实验报告.md` | 两组实验：Agent 任务质量 + SM-2 保持率模拟 | （三）实验证明合理性 |
| `generate.py` | 重新生成 01/03（代码变更后跑一次即可） | — |

## 实验复现

```bash
cd muduo-agent
python experiments/run_experiments.py     # 实验一：真实 LLM，约 5-6 分钟，消耗少量 token
python experiments/sm2_simulation.py      # 实验二：本地模拟，秒级，零成本
```

结果文件：`experiments/results/experiment1_raw.json`、`experiments/results/sm2_curve.csv`
（曲线 CSV 可直接导入 Excel/WPS 画折线图）。

## 数据规模口径（PPT 第二章引用）

- 演示数据：6 门课程 / 12 篇笔记 / 66 张记忆卡 / 12 次费曼练习 / 8 次思考练习
- 知识库：12 篇笔记 → 14 个知识块 → 14 个 2048 维向量（智谱 embedding-3）
