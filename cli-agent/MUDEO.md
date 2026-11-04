# 木铎笔记 × myagent 集成说明

把木铎笔记的业务能力接到 myagent 壳子上，得到「木铎 AI 学习导师」的 CLI 与 Web 两个入口。
这是参赛方案（《参赛准备与Agent化包装方案.md》Step 1-3、6）的落地实现。

## 架构（CLI 与 Web 共用同一套大脑）

```
agent.py（myagent 壳子：ReAct 循环 + Hooks + Skills + Memory）── CLI 入口
   │  挂载工具池
muduo_tools.py（适配层：@beta_tool 包装 + DB 会话）─────────────┤
   │  转发 run_tool                                             │ 同一套实现
   ▼                                                           ▼
muduo-agent/backend/app/agent/                                FastAPI /agent/chat(/stream)
   tools.py      13 个工具实现（单一来源）                       │ Web 入口（SSE）
   schemas.py    Function Calling Schema                       ▼
   prompts.py    系统提示词 SYSTEM_PROMPT（单一来源）        frontend AgentChat + ToolTrace
   orchestrator.py  ReAct 循环（步数/超时/trace/收尾）
```

## 改动清单

### myagent 壳子仓库（本仓库）
| 文件 | 作用 |
|------|------|
| `muduo_tools.py` | 适配层：13 个 @beta_tool 包装 + DB 接线，提示词与实现均取自木铎后端 |
| `skills/feynman-method/` | 费曼学习法技能（run_feynman 三步流程 + 评估四维度） |
| `skills/sm2-review/` | SM-2 间隔重复技能（复习组织 + again/hard/good/easy 评级标准） |
| `skills/socratic-thinking/` | 苏格拉底提问技能（四类引导问题 + 节奏控制） |
| `smoke_muduo_tools.py` | 工具冒烟测试（不走 LLM、不消耗 token） |

### 木铎仓库（../muduo-agent）
| 文件 | 作用 |
|------|------|
| `backend/app/agent/tools.py` | 新增 7 个工具实现：run_feynman / feynman_add_question / evaluate_feynman / ask_thinking_question / schedule_review / get_mastery / search_knowledge |
| `backend/app/agent/schemas.py` | 新增 7 个 Function Calling 定义（含触发条件与评级标准） |
| `backend/app/agent/prompts.py` | SYSTEM_PROMPT 增加「学习方法论工具」使用规范 |
| `backend/app/agent/memory.py` | **Step 4 长期记忆**：学习者状态摘要（薄弱笔记/待复习/最近练习）自动注入 system 上下文 |
| `backend/app/modules/knowledge_base/` | **Step 5 知识库 RAG**：笔记分块 → 向量化（智谱 embedding-3）→ SQLite 向量库 → 语义检索；mock/失败降级关键词 |
| `backend/tests/test_agent_tools.py` | 14 个工具的离线测试（注册表对齐 + 费曼/思考/SM-2/掌握度流程） |
| `backend/tests/test_agent_memory.py` / `test_knowledge_base.py` | 记忆注入与知识库的离线测试 |
| `frontend/src/features/agent/ToolTrace.jsx` | 新工具的中文标签 + 深链到费曼/思考/复习页 |

## 14 个工具一览（对应参赛方案 Step 2 工具表）

| 工具 | 能力 | 实现位置 |
|------|------|---------|
| `list_courses` / `search_notes` / `get_note` / `create_note` | 记录与检索 | app/agent/tools.py |
| `get_overview` / `list_due_cards` / `generate_memory_cards` | 总览与记忆卡 | app/agent/tools.py |
| `run_feynman` / `feynman_add_question` / `evaluate_feynman` | 费曼练习/评估 | app/agent/tools.py（调 feynman service） |
| `ask_thinking_question` | 苏格拉底式追问 | app/agent/tools.py（调 thinking service） |
| `schedule_review` | SM-2 复习排期 | app/agent/tools.py（调 memory service） |
| `get_mastery` | 掌握度画像 | app/agent/tools.py |
| `search_knowledge` | 知识库语义检索（RAG） | app/agent/tools.py（调 knowledge_base retriever） |

## 配置（环境变量，均有默认值）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MUDEO_BACKEND` | `<工作区>/muduo-agent/backend` | 木铎后端目录 |
| `MUDEO_USER_ID` | `user_001` | 演示用户（种子数据属主） |

`backend/.env` 的键（DeepSeek/智谱密钥等）会自动补进环境变量（已有不覆盖）。

## 运行

```bash
# CLI
python smoke_muduo_tools.py   # 先冒烟：验证工具 ↔ 数据库接线
python agent.py               # 交互模式：体验学习导师对话

# Web（在 ../muduo-agent/backend 与 frontend 下按 docs/RECENT.md 启动）
# 打开 /agent 页即是同一个大脑（AgentChat + 工具调用轨迹）
```

试一句话：「帮我看看今天该复习什么，安排一下」——预期它先调 get_overview / list_due_cards，
再给出具体到卡片的复习安排。

## 测试

```bash
python -m pytest              # 壳子全部离线测试（回归）
cd ../muduo-agent/backend && python -m pytest tests/ -q   # 木铎后端测试（含 test_agent_tools.py）
```

## 后续工作（对应参赛方案 Step 3-6 剩余部分）

1. ~~**Web 演示**~~ ✅ 已完成：后端 orchestrator 的 ReAct 循环 + 14 工具 + 学习导师提示词，
   前端 AgentChat/ToolTrace 直接展示工具调用轨迹（参赛演示截图素材）
2. ~~**长期记忆（Step 4）**~~ ✅ 已完成：`app/agent/memory.py` 把薄弱笔记/待复习/最近费曼与思考练习
   注入 system 上下文，Agent 开口就记得学习者状态
3. ~~**知识库 RAG（Step 5）**~~ ✅ 已完成：`app/modules/knowledge_base/`（分块/向量化/SQLite 向量库/
   语义检索 + 关键词降级），检索走 `search_knowledge` 工具；知识库**数据**经「资源转笔记」导入即自动入库
4. **提示词素材沉淀**：SYSTEM_PROMPT + 三个 SKILL.md 可直接做成 PPT「提示词设计截图」（≥3 个的要求）
5. ~~**部署与脱敏**~~ ✅ 准备工作已完成：`backend/scripts/seed_demo.py`（匿名账号+演示数据+知识库
   一键初始化，幂等）+ `docs/DEPLOY.md`（服务器部署手册）+ `docs/评审体验指引.md`（评委 1 页指引）。
   剩下的是**买服务器 + 按手册执行 + 填链接**（涉及付款，由团队完成）
6. ~~**实验数据与素材包**~~ ✅ 已完成：`experiments/`（Agent 任务质量实验 + SM-2 保持率模拟）、
   `materials/`（提示词全文/设计示例/工具清单/截图清单/实验报告，PPT 直接取用）
