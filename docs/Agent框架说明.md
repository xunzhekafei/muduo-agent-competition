# 木铎 Agent 框架说明

> 本文档对应 `D:\Phd\muduo-agent`（从 `D:\Phd\Muduo\Muduo-notes-v1` 复制出来的独立开发副本）。
> 原项目未做任何改动。

## 1. 这一版做了什么

把「AI 辅助学习平台」改造成「对话式 Agent」的**基础框架**：

```
用户一句话
   ↓
DeepSeek（deepseek-v4-pro, reasoning_effort=high）
   ↓  自己决定下一步做什么
   ├─ list_courses          我有哪些课
   ├─ search_notes          在笔记里搜
   ├─ get_note              读某篇笔记
   ├─ get_overview          学习总览 / 掌握度
   ├─ list_due_cards        到期记忆卡
   ├─ generate_memory_cards 生成记忆卡（写操作）
   └─ create_note           创建笔记（写操作）
   ↓  结果回灌给模型，继续判断
   ↓  直到模型给出最终答复
自然语言回复 + 工具调用轨迹（trace）
```

基础功能（笔记、课程、记忆卡、费曼、思考模式等）**全部保留**，只是把入口换成了对话。

## 2. 新增与改动的文件

### 后端

| 文件 | 说明 |
| --- | --- |
| `app/integrations/llm.py` | 新增 `generate_with_tools()`：OpenAI 兼容的 tools / tool_calls 往返；新增 `LLMToolCall`、`LLMToolResponse` |
| `app/agent/config.py` | Agent 配置（模型、推理等级、最大步数、超时） |
| `app/agent/schemas.py` | 7 个工具的 JSON Schema 定义 |
| `app/agent/tools.py` | 7 个工具的实现 + 统一执行入口 `run_tool()` |
| `app/agent/prompts.py` | 系统提示词（先查再答、少问多做）+ 收尾提示词 |
| `app/agent/orchestrator.py` | ReAct 主循环：限步数、限时、超限后强制收尾 |
| `app/agent/routes.py` | `POST /agent/chat`、`GET /agent/tools`、`GET /agent/config` |
| `app/api/v1/router.py` | 挂载 agent 路由 |
| `scripts/smoke_agent.py` | 直接调用 `run_agent()` 的冒烟脚本 |
| `scripts/http_agent_check.py` | 走 HTTP 的冒烟脚本（登录 → 工具 → 对话） |

### 前端

| 文件 | 说明 |
| --- | --- |
| `src/features/agent/AgentChat.jsx` | 对话界面（气泡、建议问题、打字态、步数/耗时） |
| `src/features/agent/ToolTrace.jsx` | 工具轨迹折叠面板 —— 让「Agent 在工作」可见 |
| `src/pages/AgentPage.jsx` | 页面壳 |
| `src/api/agent.js` | 接口封装 |
| `src/app/App.jsx` | `/agent` 路由；`/` 与登录后跳转改为 `/agent` |
| `src/layouts/Sidebar.jsx` | 主菜单顶部加「对话助手」；Logo 指向 `/agent` |
| `src/features/auth/Login.jsx` | 登录成功跳 `/agent` |

## 3. 怎么跑

### 后端

```bash
cd D:/Phd/muduo-agent/backend
python -m alembic upgrade head      # 首次
python -m scripts.seed_data         # 首次，生成演示数据
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 前端

```bash
cd D:/Phd/muduo-agent/frontend
npm install      # 首次
npm run dev      # http://localhost:3000
```

### 登录

- 账号：`student@example.com`
- 密码：`muduo123456`

登录后直接进入「对话助手」。

### 命令行验证

```bash
cd D:/Phd/muduo-agent/backend
python scripts/smoke_agent.py                 # 不过 HTTP，直接跑 Agent
python scripts/http_agent_check.py            # 走 HTTP，需后端已启动
```

## 4. 配置项（`backend/.env`）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MUDUO_AGENT_MODEL` | `deepseek-v4-pro` | 使用的模型 |
| `MUDUO_AGENT_REASONING_EFFORT` | `high` | 推理等级；留空则不传该参数 |
| `MUDUO_AGENT_MAX_STEPS` | `8` | 单次对话最多工具调用轮数 |
| `MUDUO_AGENT_TIMEOUT` | `180` | 单次对话总超时（秒） |
| `MUDUO_AGENT_MAX_HISTORY` | `20` | 携带的历史消息条数 |
| `MUDUO_AGENT_TEMPERATURE` | `0.3` | 采样温度 |

也可以按单次请求覆盖（`POST /api/v1/agent/chat` 的 body 里带 `model` / `reasoning_effort`），方便做「快慢双档」演示。

## 5. 实测数据（2026-10-27）

| 问题 | 步数 | 工具链 | 耗时 |
| --- | --- | --- | --- |
| 我有哪些课程？ | 1 | `list_courses` | 5.5 ~ 15.7s |
| 我下周考操作系统，帮我制定复习计划 | 多步 | 多工具串联 | 约 40s |
| 帮我在操作系统笔记里找进程调度 | 5 | `list_courses` → `search_notes` ×3 → `get_note` | 43.4s |
| 我最薄弱的是哪门课？ | 3 | `get_overview` → `list_courses` → `list_due_cards` | 42.5s |

**关于延迟**：`deepseek-v4-pro` + `reasoning_effort=high` 每次模型调用约 8~15 秒，多步对话累计到 40 秒以上。这是当前配置的固有代价，不是 bug。演示时如果嫌慢：

- 把 `MUDUO_AGENT_REASONING_EFFORT` 改成 `medium` 或留空；
- 或把 `MUDUO_AGENT_MODEL` 改成 `deepseek-v4-flash`；
- 或在请求体里临时覆盖。

## 6. 刻意没做的（下一步）

按「不追求一步到位、先把框架立起来」的要求，以下留到后续：

1. **流式输出（SSE）** —— 目前是整段返回，用户体验上最大的短板，也是压延迟的关键手段。
2. **Agent 内部进度回传** —— 现在只有一个「正在思考」的转圈，看不到第几步在调什么工具。
3. **第 8 个工具 `evaluate_feynman`** —— 费曼模式的评分能力还没接进来。
4. **RAG / Embedding** —— `search_notes` 目前是关键词匹配，Embedding 还是 Mock。
5. **会话持久化** —— 历史存在前端内存，刷新即丢。
6. **写操作的二次确认** —— `generate_memory_cards` 会覆盖已有卡片，目前靠模型自己口头征询确认。
7. **安全清理** —— `backend/app/modules/resource_notes/qwen_client.py` 里有硬编码 API Key，参赛前必须换成环境变量并轮换密钥。

## 7. 扩展一个新工具的做法

1. 在 `app/agent/schemas.py` 的 `TOOL_DEFINITIONS` 里加一条 OpenAI 格式的函数定义（说明「做什么 + 什么时候用 + 返回粒度」）。
2. 在 `app/agent/tools.py` 里写实现函数（签名带 `db: Session, user_id: int`，返回字符串）。
3. 把函数注册进 `TOOL_IMPLS`。
4. 重启后端。`run_tool()` 会自动按函数签名过滤参数、捕获异常并回滚事务。

无需改动 orchestrator。
