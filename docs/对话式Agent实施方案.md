# 对话式 Agent · 实施方案（分阶段）

> 生成时间：2026-10-27
> 方案形态：**对话式 Agent（Chat Agent）** —— 一个聊天框 + 现有功能整合为工具
> 团队：前端 1 / 后端 2，Claude Code 辅助
> 目标：MVP 可演示 → 打磨 → 参赛

---

## 一、方案定义与边界

### 1.1 做成什么样

用户在一个对话框里说**模糊的自然语言**，Agent 自己拆解、调用多个工具、给出结果。

```
用户：我下周要考操作系统，帮我制定复习计划
  ↓ Agent 自主执行（用户没告诉它该点什么）
  [1] get_courses              → 找到"操作系统"
  [2] search_notes             → 找到 12 篇相关笔记
  [3] get_overview             → 掌握度：进程调度 0.31（最弱）
  [4] get_due_cards            → 3 张卡明天到期
  [5] generate_memory_cards    → 针对薄弱笔记补 5 张卡
  ↓
"你操作系统 12 篇笔记，最弱是进程调度(31%)。
 明天有 3 张卡到期。已为你补了 5 张进程调度专项卡。
 建议：周一练这 8 张 → 周三费曼讲解进程调度 → 周五整章测试。"
```

### 1.2 明确不做什么（控制范围）

| 不做 | 原因 |
|------|------|
| ❌ 流式输出（SSE） | MVP 用非流式 + 工具轨迹展示，反而更能让评委"看见"Agent 在思考 |
| ❌ 长期记忆 / 用户画像向量库 | 用现有 dashboard 掌握度代替 |
| ❌ RAG 向量检索 | Embedding 仍是 Mock，本期不碰 |
| ❌ 多 Agent 协作 | 单 Agent 足够 |
| ❌ 后端会话持久化 | 前端持有 history，每次请求带上（沿用 `memory/chat` 的既有模式） |

> **范围收缩的理由**：这些加起来占 60% 工作量，但对"是不是 Agent"这个判断没有增量。先把 L1 → L3 跨过去。

---

## 二、工具清单（映射到真实接口）

从 80+ 端点里挑 **8 个**组成 MVP 工具集。原则：**粗粒度、任务导向、返回摘要**。

| # | 工具名 | 复用接口 | 返回给模型的内容 |
|---|--------|---------|----------------|
| 1 | `list_courses` | `GET /courses` | 课程名 + id 列表 |
| 2 | `search_notes` | `GET /notes?q=&courseId=` | 标题 + id + 摘要（截断 200 字）|
| 3 | `get_note` | `GET /notes/{noteId}` | 标题 + 正文（截断 3000 字）|
| 4 | `create_note` | `POST /notes` | 新建笔记 id + 标题 |
| 5 | `get_overview` | `GET /dashboard/overview` | 各课掌握度 + 到期卡数 + 最近活动 |
| 6 | `list_due_cards` | `GET /memory/cards` | 到期卡片 front/back（最多 20 张）|
| 7 | `generate_memory_cards` | `POST /memory/notes/{noteId}/generate` | 任务 id（异步，提示"生成中"）|
| 8 | `evaluate_feynman` | `POST /feynman/sessions/{id}/evaluation` | 五维评分 + 漏洞 + 建议 |

### 工具描述示例（决定 Agent 智商的 80%）

```python
{
  "type": "function",
  "function": {
    "name": "search_notes",
    "description": (
      "按关键词或课程检索用户的笔记，返回标题和摘要。"
      "当用户提到某门课、某个知识点、某篇笔记，或需要了解'我记过什么'时使用。"
      "只返回摘要，若需要完整内容请再用 get_note 读取。"
    ),
    "parameters": {
      "type": "object",
      "properties": {
        "query":   {"type": "string", "description": "检索关键词，如'进程调度'"},
        "courseId":{"type": "string", "description": "限定课程，可选"}
      },
      "required": ["query"]
    }
  }
}
```

**写描述的三条铁律**：
1. 说清**什么时候用**（触发条件），不只是"是什么"
2. 说清**不要什么时候用**（防误调）
3. 说清**输出有多详细**（防止模型以为拿到了全文）

---

## 三、工程量

### 3.1 分项估算

| 阶段 | 内容 | 后端 | 前端 | 合计 |
|------|------|------|------|------|
| P0 | Function Calling 可用性验证 | 0.5 | — | **0.5** |
| P1 | 工具层（8 工具 + 结果封装） | 2.0 | — | **2.0** |
| P2 | Agent 循环 + 会话 | 1.5 | — | **1.5** |
| P3 | 前端 Chat 界面 | — | 2.5 | **2.5** |
| P4 | 打磨（轨迹展示/错误兜底/彩排） | 1.0 | 1.0 | **2.0** |
| P5 | 参赛材料（PPT/视频） | 1.0 | 1.0 | **2.0** |
| | | **6.0** | **4.5** | **10.5 人日** |

**排期**：2 后端 + 1 前端并行，**约 1.5–2 周**（含缓冲）。

### 3.2 相比其他方案为什么省

| 做了会多花 | 省下 |
|-----------|------|
| 流式 SSE | 1–2 天 |
| 向量库 / RAG | 3–5 天 |
| 长期记忆表 | 1–2 天 |
| 多 Agent 调度 | 4–6 天 |
| 后端会话持久化 | 1 天 |

---

## 四、vibe coding 可行性评估

### 结论：**适合度 8/10，但有两个地方必须人来把关**

### 4.1 为什么适合

| 特征 | 说明 |
|------|------|
| **每层都能立刻看到输出** | Agent 循环跑一次就能打印完整轨迹，改 prompt 立即见效——这正是 vibe coding 最高效的反馈回路 |
| **样板代码占比高** | 工具 schema、注册表、React 气泡组件都是套路代码，Claude Code 很熟 |
| **技术栈无冷门** | FastAPI + React + OpenAI 兼容 API，训练数据充足 |
| **文档现成** | Function Calling 是公开协议，不需要摸索 |

### 4.2 为什么不是 10/10（必须人来定）

| 风险点 | 为什么 AI 靠不住 | 你要做什么 |
|--------|----------------|-----------|
| **循环终止条件** | AI 会写出没有 `max_steps` 兜底的循环，API 出错时无限重试烧钱 | 人工钉死 `max_steps=8` + 超时 + 异常返回 |
| **工具描述质量** | AI 写的 description 会偏"文档体"（说是什么，不说何时用），导致模型不调用或乱调用 | 8 条描述逐条人工审，用真实问题试 |
| **"能跑"≠"稳定"** | 模型非确定性，跑通一次不代表可以演示 | 每个场景跑 10 次，统计成功率 |
| **错误信息透传** | 会把 `HTTPError 500` 原样返给用户 | 人工定义错误 → 人话映射表 |

### 4.3 vibe coding 使用建议

1. **先写验收标准，再让 AI 写代码**。每个 Phase 的"验收清单"（见下文）当成 prompt 的一部分。
2. **一次只让它改一层**。别一次性说"实现整个 agent"，会得到看似完整实则跑不通的代码。
3. **要求它输出可复现的测试命令**。比如 `python -m app.agent.smoke_test`，每次改完自己跑。
4. **工具描述不让 AI 自由发挥**。你先写中文意图，让它转成 schema。

---

## 五、分阶段实施方案

### P0 · 技术验证（0.5 人日）

**目标**：确认模型支不支持 Function Calling。**过不了这关，整个方案不成立。**

**产出**：
- `backend/scripts/check_function_calling.py`

```python
"""验证模型是否支持 tools 参数。运行：python -m scripts.check_function_calling"""
import json, os, urllib.request

def main():
    body = {
        "model": os.environ.get("MUDUO_TEST_MODEL", "deepseek-chat"),
        "messages": [{"role": "user", "content": "北京今天天气怎么样"}],
        "tools": [{
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "查询指定城市的天气",
                "parameters": {
                    "type": "object",
                    "properties": {"city": {"type": "string", "description": "城市名"}},
                    "required": ["city"],
                },
            },
        }],
    }
    req = urllib.request.Request(
        "https://api.deepseek.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {os.environ['DEEPSEEK_API_KEY']}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read())
    msg = result["choices"][0]["message"]
    calls = msg.get("tool_calls")
    print("✅ 支持 Function Calling" if calls else "❌ 不支持")
    print(json.dumps(msg, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
```

**验收**：输出里有 `tool_calls: [{function: {name: "get_weather", arguments: '{"city":"北京"}'}}]`

**Plan B**：不支持就换**通义千问**——你们 `resource_notes/qwen_client.py` 已有基础，DashScope 支持 function calling。

#### ✅ 验证结果（2026-10-27 实测）

| provider | 模型 | 工具调用 | 结果回填 | 结论 |
|----------|------|---------|---------|------|
| deepseek | `deepseek-chat` | ✅ | ✅ | 可用 |
| deepseek | `deepseek-v4-flash` | ✅ | ✅ | 可用 |
| deepseek | `deepseek-v4-pro` | ✅ | ✅ | 可用 |
| qwen | `qwen-plus` | — | — | 未测（无 `DASHSCOPE_API_KEY`） |

**结论：Function Calling 完全可用，P0 通过，无需 Plan B。**

测试方法：用一个模型无法凭空回答的工具（`search_notes`）提问，验证
① 第一轮是否返回 `tool_calls`；② 回填 `role=tool` 结果后能否产出自然语言回答。

**模型选型建议**：Agent 循环最多 8 步，速度与成本敏感，建议用 **`deepseek-v4-flash`**（响应快、已在 `notes` / `quick_notes` 模块验证过）；复杂规划场景可切 `deepseek-v4-pro`。写成配置项，不写死。

> 这组数据可直接用于附件1「（三）模型与流程 · 实验证明合理性」章节。

---

### P1 · 工具层（2 人日）

**目标**：把 8 个功能包成模型能调用的工具。

**产出**：
```
backend/app/agent/
├── __init__.py
├── schemas.py      # 8 个工具的 JSON Schema
├── tools.py        # 8 个执行函数（调内部 service，不走 HTTP）
└── registry.py     # name → 执行函数 映射
```

**关键设计——不要直接 HTTP 自调用**：

```python
# ❌ 错：Agent 循环里再去请求自己的 REST 接口，多一层序列化 + 认证开销
requests.get("http://localhost:8000/api/v1/notes?q=xxx")

# ✅ 对：直接调 service/repository 层，复用已有业务逻辑
from app.modules.notes.repository import NotesRepository
notes = NotesRepository(db).search(user_id, query)
```

**结果封装层**（这是真正的工作量所在）：

```python
def fmt_notes(notes):
    if not notes:
        return "没有找到相关笔记。请尝试换关键词，或先创建一篇笔记。"
    lines = [f"找到 {len(notes)} 篇："]
    for n in notes[:10]:
        excerpt = (n.content or "").replace("\n", " ")[:200]
        lines.append(f"- [{n.note_id}] {n.title}：{excerpt}")
    return "\n".join(lines)
```

**验收清单**：
- [ ] 8 个工具单独调通，返回可读字符串（不是 JSON 大对象）
- [ ] 空结果返回"人话"而非 `[]`
- [ ] 异常返回"人话"而非堆栈
- [ ] 单工具耗时 < 500ms（`generate_memory_cards` 除外，它是异步）

---

### P2 · Agent 循环（1.5 人日）

**目标**：让模型自己决定调什么、调几次。

**产出**：
```
backend/app/agent/
├── prompts.py        # 系统提示词（学习导师人设）
├── orchestrator.py   # ReAct 循环
└── routes.py         # POST /agent/chat
```

**核心循环（约 60 行）**：

```python
def run_agent(db, user_id, messages, max_steps=8, timeout_s=60):
    trace = []                       # 工具调用轨迹，返回给前端展示
    started = time.time()
    convo = [{"role": "system", "content": SYSTEM_PROMPT}, *messages]

    for step in range(max_steps):
        if time.time() - started > timeout_s:
            return {"reply": "任务太复杂了，我先给部分结果…", "trace": trace}

        resp = llm.generate_with_tools(convo, TOOLS)
        if not resp.tool_calls:
            return {"reply": resp.content, "trace": trace}   # 模型认为可以说完了

        for call in resp.tool_calls:
            try:
                result = execute_tool(db, user_id, call.name, call.args)
            except Exception as e:
                result = f"工具执行失败：{humanize_error(e)}"
            trace.append({"tool": call.name, "args": call.args, "result": result[:300]})
            convo.append({"role": "tool", "tool_call_id": call.id, "content": result})

    return {"reply": "步骤太多了，先到这儿。要我继续吗？", "trace": trace}
```

**系统提示词要点**：
```
你是"木铎"——学生的学习导师 Agent。
目标：帮学生把笔记、理解、记忆、检验串成完整学习闭环。

工作方式：
1. 先想清楚用户真实想干什么，再选工具，不要一上来就调。
2. 信息不足时先查（list_courses / search_notes），不要反问用户。
3. 一次尽量把事情做完（查笔记→看掌握度→出卡片），不要每步都停下问。
4. 回答要具体：说清"做什么、为什么、下一步"。

约束：
- 只用提供的工具，不要编造不存在的笔记或数据。
- 查不到就直说"没找到"，不要假装有。
- 涉及删除、覆盖的操作，先确认再执行。
```

**验收清单**：
- [ ] "我有哪些课程" → 调 `list_courses`，正确回答
- [ ] "我下周考操作系统" → **连续调用 ≥3 个工具**，输出计划
- [ ] "帮我看看 xx 笔记" → 调 `search_notes` + `get_note`
- [ ] 问无关问题（"今天天气"）→ 不调工具，直接回答
- [ ] 工具报错 → 不崩溃，给出人话提示
- [ ] 同一场景跑 10 次，成功率 ≥ 8/10

---

### P3 · 前端 Chat 界面（2.5 人日）

**目标**：好用的对话框 + **工具调用轨迹可视化**（这是评分加分项）。

**产出**：
```
frontend/src/features/agent/
├── AgentChat.jsx      # 主界面：消息列表 + 输入框
├── ChatMessage.jsx    # 消息气泡（用户/AI 两种样式）
├── ToolTrace.jsx      # 工具轨迹：可展开的调用链
└── index.jsx
frontend/src/api/agent.js
frontend/src/pages/AgentPage.jsx
```

**接线路由**：`frontend/src/app/App.jsx` 加路由 + `layouts/Sidebar.jsx` 加入口（建议放侧边栏最上方，作为主入口）

**ToolTrace 组件设计**（决定演示观感）：

```
┌─────────────────────────────────┐
│ 🔍 正在检索笔记...               │
│  ├ search_notes("进程调度")  ✓  │
│  ├ get_overview()           ✓  │
│  └ generate_memory_cards()  ✓  │
│    └ 已生成 5 张卡片            │
└─────────────────────────────────┘
```

**可复用**：`features/feynman/FeynmanModeDemo.jsx`（443 行）里的对话气泡样式可直接抽出来。

**验收清单**：
- [ ] 能发消息、收消息、显示"思考中"
- [ ] 工具调用过程可见（不是黑盒等 5 秒）
- [ ] 历史消息在会话内保留
- [ ] 空状态有引导

---

### P4 · 打磨（2 人日）

| 事项 | 验收 |
|------|------|
| 三个演示场景串词 | 每个跑 10 次，成功率 ≥ 80% |
| 错误兜底 | 断网/超时/API 报错都有友好提示 |
| 性能 | 单轮响应 < 8 秒 |
| 成本 | 单次对话 token < 8k |
| 会话清空 / 重新开始 | 可用 |
| 移动端窄屏 | 不崩 |

---

### P5 · 参赛材料（2 人日）

按附件1 要求产出。**三个演示场景直接复用为 PPT 的"≥3 个提示词示例"**：

| # | 提示词 | 展示的工具链 | 对应 PPT 章节 |
|---|--------|-------------|--------------|
| 1 | "我下周要考操作系统，帮我制定复习计划" | 5 工具串联 | （五）应用结果 |
| 2 | "帮我检验我对 TCP 三次握手的理解" | 检索 + 费曼评估 | （六）应用截图 |
| 3 | "把这篇笔记整理成复习卡片，挑重点" | 检索 + 生成卡片 | （六）应用截图 |

---

## 六、关键风险与对策

| 风险 | 概率 | 对策 |
|------|------|------|
| 模型不支持 Function Calling | 中 | P0 先验证；备选通义千问 |
| Agent 不调工具（只聊天） | **高** | 工具描述人工重写；system prompt 里加"必须先查再答" |
| Agent 乱调工具 / 死循环 | 中 | `max_steps=8` + 每次调用前校验必填参数 |
| 演示现场 API 抖动 | 中 | 提前录好视频；准备 Mock 模式兜底（`MUDUO_LLM_PROVIDER=mock`）|
| 单次响应太慢（评委等不住） | 中 | 非流式但先显示"正在检索…"骨架；限制 `max_steps` |
| 被质疑"只是 API 换皮" | 中 | **演示必须展示多步自主**，且把 ToolTrace 摆在最显眼位置 |

---

## 七、文件改动总览

```
backend/
├── app/agent/                    ← 新增（5 个文件）
│   ├── __init__.py
│   ├── schemas.py
│   ├── tools.py
│   ├── registry.py
│   ├── prompts.py
│   ├── orchestrator.py
│   └── routes.py
├── app/integrations/llm.py       ← 修改：LLMProvider 加 generate_with_tools
├── app/integrations/registry.py  ← 修改：无需变（provider 已可切换）
├── app/api/v1/router.py          ← 修改：注册 agent_router
└── scripts/check_function_calling.py  ← 新增（P0 验证）

frontend/
├── src/features/agent/           ← 新增（4 个文件）
├── src/api/agent.js              ← 新增
├── src/pages/AgentPage.jsx       ← 新增
├── src/app/App.jsx               ← 修改：加路由
└── src/layouts/Sidebar.jsx       ← 修改：加入口
```

**改动集中在"新增"，对现有代码只有 4 处轻量修改** —— 这是选对话式方案最大的优势：不碰既有功能，风险可控，可随时回滚。

---

## 八、一句话总结

> **8 个工具 + 60 行循环 + 一个聊天框 = 10.5 人日、约两周。**
> **vibe coding 很适合这个任务（每层都能立刻验证），但工具描述、循环边界、稳定性验证这三件事必须人来把关。**
> **先做 P0 那 30 分钟的验证——它决定这条路走不走得通。**
