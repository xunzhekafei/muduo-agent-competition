# 木铎 · AI 学习导师智能体

> 面向大学生 / 考研学生学习场景的 AI Agent：
> **听懂需求 → 自主规划 → 调用学习工具 → 记住你的掌握度 → 陪你把「记录 → 理解 → 记住 → 输出」的学习闭环走完。**
>
> 它不是问答机器人——你说一句模糊的话，它自己判断该做什么，并把事情做完。

---

## 它和「AI 问答助手」的区别

| 维度 | 普通问答助手 | 木铎 Agent |
|------|-------------|-----------|
| 工具调用 | 只能用模型自己的知识 | **14 个学习工具**（查笔记/知识库/记忆卡/SM-2/费曼/苏格拉底…） |
| 自主编排 | 一问一答 | **ReAct 循环**：一次请求可连续规划与调用多个工具，直到任务完成 |
| 记忆 | 会话结束即忘记 | **长期记忆**：薄弱笔记、待复习卡片、最近练习自动注入上下文 |
| 知识来源 | 通用知识，容易幻觉 | **基于你自己的笔记**：分块向量化检索（RAG）后作答 |
| 可验证性 | 黑盒 | **工具调用轨迹可见**：每一步调用什么、传了什么、返回什么都展示在界面上 |

## 学习闭环

```
记录 ──────────► 理解 ──────────► 记住 ──────────► 输出
create_note      ask_thinking_question   generate_memory_cards   run_feynman
search_notes     (苏格拉底式追问)         list_due_cards          feynman_add_question
                 search_knowledge         schedule_review (SM-2)  evaluate_feynman
                 (知识库 RAG)
                       ▲                                          │
                       └──────────── get_mastery / get_overview ◄─┘
                              （掌握度画像驱动下一轮规划）
```

## Agent 工作流程

```
用户消息
  → 注入学习者状态（薄弱点 / 待复习 / 最近练习）
  → 模型规划（要不要调工具、调哪个）
  → 执行工具 → 观察结果 → 再规划 ……（最多 8 步，180 秒超时）
  → 最终答复 + 完整工具调用轨迹（SSE 实时推送）
```

## 14 个工具

| 分组 | 工具 | 作用 |
|------|------|------|
| 记录与检索 | `list_courses` `search_notes` `get_note` `create_note` | 课程/笔记的发现与读写 |
| 知识库 | `search_knowledge` | 分块级语义检索，返回原文片段 |
| 理解 | `ask_thinking_question` | 苏格拉底式追问（socratic / gap_check / counter_example / revision） |
| 理解 | `run_feynman` `feynman_add_question` `evaluate_feynman` | 费曼讲解记录 → 追问 → 评分评估 |
| 记忆 | `generate_memory_cards` `list_due_cards` `schedule_review` | 卡片生成、到期查询、SM-2 排期 |
| 规划 | `get_overview` `get_mastery` | 学习总览、掌握度画像 |

工具定义（Function Calling Schema）见 `backend/app/agent/schemas.py`，实现见 `backend/app/agent/tools.py`——
Web 端与 CLI 端共用同一套实现与系统提示词（单一来源）。

## 系统架构

```
React 前端（对话页 + 工具轨迹 UI）
   │  SSE: /api/v1/agent/chat/stream
   ▼
FastAPI 后端
   ├─ orchestrator：ReAct 循环（步数/超时/trace/收尾）
   ├─ memory：学习者状态注入（长期记忆）
   ├─ tools ×14：直接调用各业务 service 层
   └─ knowledge_base：笔记分块 → 向量化 → SQLite 向量库 → 余弦检索
   ▼
SQLite（笔记/记忆卡/费曼/思考/知识块）
   ▼
模型服务：智谱 GLM-4.5（工具调用）+ embedding-3（向量）；DeepSeek 备用；mock 降级
```

学习科学方法论内置其中：**费曼学习法**（以教代学）、**苏格拉底式提问**（认知冲突）、
**SM-2 间隔重复**（记忆曲线）、**掌握度画像**（数据驱动规划）。

## 快速开始（本地）

```bash
# 后端
cd backend
python -m venv venv && venv/bin/pip install -r requirements.txt   # Windows: venv\Scripts\pip
cp .env.example .env        # 填入 ZHIPU_API_KEY / DEEPSEEK_API_KEY
python seed_data.py          # 构建演示数据
python scripts/seed_demo.py  # 匿名演示账号 + 知识库索引（幂等）
venv/bin/uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install && npm run dev   # http://localhost:3000（已配置 /api 代理）
```

打开对话页，输入「帮我安排今天的复习」即可体验完整 Agent 链路。

## 命令行版学习导师（可选）

`cli-agent/` 是本项目的 Agent 扩展，可接到一个 Claude Code 风格的 CLI 壳子上运行，
说明见 [cli-agent/README.md](cli-agent/README.md)。

## 测试与实验

```bash
cd backend && python -m pytest tests/ -q      # 94 个离线测试
python experiments/run_experiments.py         # Agent 任务质量实验（真实 LLM）
python experiments/sm2_simulation.py          # SM-2 记忆保持率模拟（本地）
```

实验结果摘要：5 类典型学习任务 × 10 次运行，**32 次工具调用 0 失败、任务完成 10/10**；
SM-2 以约 1/4 的复习量达到每天全量复习 82% 的记忆保持率。详见
[materials/05_实验报告.md](materials/05_实验报告.md)。

## 目录结构

```
backend/            FastAPI 后端
  app/agent/        Agent 核心：orchestrator / tools / schemas / prompts / memory
  app/modules/      业务模块（笔记/记忆/费曼/思考/知识图谱/知识库…）
  scripts/          运维脚本（seed_demo 演示环境初始化）
  tests/            后端测试（94 个）
frontend/           React + Vite 前端（AgentChat / ToolTrace）
cli-agent/          CLI 学习导师扩展（基于自研 Agent 壳子）
deploy/             服务器一键部署脚本
experiments/        实验代码与结果
materials/          PPT 素材包（提示词/工具清单/截图清单/实验报告）
docs/               部署手册、评委体验指引、架构与历史文档
```

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | 公网演示环境部署手册（Nginx + systemd + 一键脚本） |
| [docs/评审体验指引.md](docs/评审体验指引.md) | 1 页评委体验路径 |
| [cli-agent/MUDEO.md](cli-agent/MUDEO.md) | CLI 端集成说明与架构 |
| [docs/参赛准备与Agent化包装方案.md](docs/参赛准备与Agent化包装方案.md) | 参赛定位、材料清单与改造路线 |
| [docs/平台功能说明.md](docs/平台功能说明.md) | 产品功能与开发手册（历史版 README） |

## 合规与许可

- 运行依赖均为开源组件（FastAPI / SQLAlchemy / React / Vite / Nginx 等），许可清晰
- 演示数据为原创教学内容，不含第三方数据集，无版权与隐私风险
- 提交材料须匿名（不含学校、姓名、Logo 等信息）
