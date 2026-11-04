# 速记模式 — 后端开发 + AI 多模态混合总结机制

本文档面向速记模式开发小组，涵盖两部分：后端开发任务拆解，以及时间流速记中 AI 结构化多模态混合总结的技术实现方案。

---

## 一、速记模式功能回顾

速记模式有两种使用方式：

| 方式 | 场景 | 输入 | AI 做什么 |
|---|---|---|---|
| **时间流速记** | 课堂/讲座 | 文本片段 + 录音 + 图片 | 多模态混合总结 → 结构化笔记 |
| **普通速记** | 自学/复习 | Markdown 文本 | 无需 AI，纯编辑器 |

后端开发的核心难点是**时间流速记的 AI 结构化**——用户边上课边记，时间流里混杂了文字、录音转写、板书照片，AI 需要在课后把这些碎片整理成有标题、有分类的结构化笔记。

---

## 二、后端开发任务拆解（2 人）

> 前端已全部完成，剩余工作在后端。普通速记只是文本存取（CRUD），工作重心在时间流速记的 AI 流水线。

### 分工总览

| 人员 | 代号 | 任务 | 独占文件（项目根目录下的完整路径） | 难度 |
|---|---|---|---|---|
| **后端 A** | 数据层 | CRUD 接口 + 数据库扩展 + 异步任务骨架 | `backend/app/modules/notes/models.py` `routes.py` `service.py` | ⭐⭐ 低 |
| **后端 B** | AI 层 | 多模态混合总结 + worker handler + 测试 | `backend/app/services/summarizer.py`（新） `backend/app/workers/handlers.py` `backend/tests/test_quick_notes.py`（新） | ⭐⭐⭐⭐ 高 |

### 两人能否独立开发？

**完全可以，互不阻塞。** 两个人的文件完全不同，不存在 merge 冲突。

### 涉及的所有文件一览

```
D:\Muduo\Muduo-notes-v1\
│
├── backend\app\modules\notes\
│   ├── models.py                 ← 后端 A 扩展（已有，加 note_type 字段）
│   ├── routes.py                 ← 后端 A 独占（已有，补充速记接口）
│   ├── service.py                ← 后端 A 独占（已有，补充速记业务逻辑）
│   └── repository.py             ← 已有，只读不写
│
├── backend\app\modules\ai_tasks\
│   ├── models.py                 ← 已有，A 只读（复用 create_ai_task）
│   ├── routes.py                 ← 已有，A 只读
│   └── service.py                ← 已有，A 只读
│
├── backend\app\services\
│   └── summarizer.py             ← 后端 B 独占（新文件！B 在这里写核心算法）
│
├── backend\app\workers\
│   ├── handlers.py               ← 后端 B 独占（已有，追加一个 handler）
│   └── registry.py               ← 已有，B 只读
│
├── backend\app\integrations\
│   ├── llm.py                    ← 已有，B 通过 get_llm_provider() 调用
│   ├── asr.py                    ← 已有，B 通过 get_asr_provider() 调用
│   └── ocr.py                    ← 已有，B 通过 get_ocr_provider() 调用
│
├── backend\app\schemas\
│   └── notes.py                  ← 已有，A 扩展 Pydantic schema
│
├── backend\migrations\versions\
│   └── xxxx_add_note_type.py     ← A 新增迁移文件
│
├── backend\tests\
│   └── test_quick_notes.py       ← 后端 B 独占（新文件！）
│
├── contracts\
│   ├── openapi.yaml              ← 两人需对齐（A 定义接口后更新）
│   └── enums.md                  ← 两人需对齐（补充速记相关枚举）
│
└── frontend\                      ← 已完成，无需修改
    └── src\
        ├── api\quickNotes.js      ← 已有，后端完成后删 mock 回退
        ├── features\quick-notes\
        │   ├── QuickNotesHub.jsx  ← 已完成
        │   ├── QuickNotes.jsx     ← 已完成
        │   └── RegularNote.jsx    ← 已完成
        └── pages\QuickNotesPage.jsx ← 已完成
```

两个人唯一的交集是：A 在 `routes.py` 里调用 B 的 `summarize()` 函数。B 只需要告诉 A：

> "我写好了，函数签名是 `summarize(timeline_items: list[dict]) -> list[dict]`，你 `from app.services.summarizer import summarize` 就行。"

A 在开发期间可以先 import 一个返回空列表的占位函数，不阻塞自己的进度。

### 开发顺序

```
Week 1 ─┬─ 后端 A：扩展 notes 表 → 写 CRUD 路由 → 调通普通速记存取
        │
        └─ 后端 B：研究 prompt 工程 → 用 mock ASR/OCR/LLM 调通 summarize 核心逻辑

Week 2 ─┬─ 后端 A：实现时间流条目存取 → POST /timeline → 路由里 import B 的函数
        │
        └─ 后端 B：接入 worker + ai_tasks → 写异步 handler → 写测试

Week 3 ─── 两人联调：从前端走通"录音→结束→AI 总结→面板显示"全流程
```

---

### 后端 A：数据层 — CRUD + 数据库扩展 + 异步任务骨架

**负责文件（绝对路径）**：
- `D:\Muduo\Muduo-notes-v1\backend\app\modules\notes\models.py` — 已有，扩展 `note_type` 字段
- `D:\Muduo\Muduo-notes-v1\backend\app\modules\notes\routes.py` — 已有，补充速记专用接口
- `D:\Muduo\Muduo-notes-v1\backend\app\modules\notes\service.py` — 已有，补充速记业务逻辑
- `D:\Muduo\Muduo-notes-v1\backend\app\schemas\notes.py` — 已有，补充 Pydantic schema
- `D:\Muduo\Muduo-notes-v1\backend\migrations\versions\` — 新增一条 migration

> 速记本质就是笔记（notes 表），只是多了 `note_type` 字段区分 `"timeline"` / `"regular"`。不需要新建模块。

**第一步：扩展数据模型**

在 `backend\app\modules\notes\models.py` 的 `NoteModel` 中加一个字段：
- `note_type` — `"regular"`（普通速记，默认值）或 `"timeline"`（时间流速记）

新建 `timeline_items` 表（在同一个 models.py 或新建 `backend\app\modules\notes\timeline_models.py`）：

```python
# backend/app/modules/notes/models.py 中追加

class TimelineItemModel(Base):
    __tablename__ = "timeline_items"
    id            # 主键，格式 tli_xxxxxxxxxxxx
    note_id       # 外键 → notes.id
    type          # text / recording / image / system
    content       # 文本内容
    timestamp     # 时间戳字符串，如 "08:02"
    duration      # 录音时长（秒），可为 null
    transcript    # ASR 转写文本，可为 null
    storage_key   # 图片/音频的对象存储 key，可为 null
    position      # 排序序号
```

加 Alembic 迁移：

```bash
cd backend
alembic revision --autogenerate -m "add note_type and timeline_items"
alembic upgrade head
```

**第二步：实现接口**

| 方法 | 路径 | 说明 | 在哪个文件写 |
|---|---|---|---|
| GET | `/api/v1/quick-notes` | 速记列表，支持 `?type=timeline` | `routes.py` |
| GET | `/api/v1/quick-notes/{id}` | 速记详情，含时间流条目 | `routes.py` |
| POST | `/api/v1/quick-notes` | 创建速记 `{ title, type }` | `routes.py` |
| PATCH | `/api/v1/quick-notes/{id}` | 保存速记内容（普通速记的 markdown） | `routes.py` |
| POST | `/api/v1/quick-notes/{id}/timeline` | 追加一条时间流条目 | `routes.py` |
| DELETE | `/api/v1/quick-notes/{id}` | 软删除速记 + 其下所有时间流条目 | `routes.py` |
| POST | `/api/v1/quick-notes/{id}/summarize` | 触发 AI 总结（调用 B 的函数） | `routes.py` |

**第三步：对接 B 的 summarize 函数**

在 `backend\app\modules\notes\routes.py` 中：

```python
# 文件：backend/app/modules/notes/routes.py

from app.services.summarizer import summarize  # ← B 写的函数

@router.post("/{noteId}/summarize")
def trigger_summarize(noteId: str, ...):
    # 1. 读时间流条目
    items = get_timeline_items(noteId, session)

    # 2. 创建 ai_task（复用已有 ai_tasks 模块）
    task = create_ai_task(type="quick_note_summarize", input={
        "note_id": noteId,
        "timeline_items": items,
    })

    # 3. 异步执行（worker 在后台调 summarize + 回写状态）
    enqueue_worker_task(task)

    # 4. 立即返回 taskId
    return {"data": {"taskId": task.id, "status": "queued"}}
```

**难度**：低。标准 FastAPI CRUD，参照已有 notes 模块（`backend\app\modules\notes\routes.py`）照搬模式。行数多但逻辑简单。

---

### 后端 B：AI 层 — 多模态混合总结 + Worker + 测试

**负责文件（绝对路径）**：
- `D:\Muduo\Muduo-notes-v1\backend\app\services\summarizer.py`（新文件！核心算法，纯函数）
- `D:\Muduo\Muduo-notes-v1\backend\app\workers\handlers.py`（已有，追加一个 handler）
- `D:\Muduo\Muduo-notes-v1\backend\tests\test_quick_notes.py`（新文件！测试套件）

**参考的已有文件（只读，不修改）**：
- `D:\Muduo\Muduo-notes-v1\backend\app\integrations\llm.py` — LLM provider 抽象
- `D:\Muduo\Muduo-notes-v1\backend\app\integrations\asr.py` — ASR provider 抽象
- `D:\Muduo\Muduo-notes-v1\backend\app\integrations\ocr.py` — OCR provider 抽象

**第一步：写 summarize 核心函数（独立开发，不依赖 A）**

在 `backend\app\services\summarizer.py` 中写一个**纯函数**，输入是时间流条目数组，输出是结构化笔记数组。不碰数据库、不碰 HTTP，可以直接在 Python shell 里调试。

```python
# 文件：backend/app/services/summarizer.py

import json
from app.integrations.llm import get_llm_provider
from app.integrations.asr import get_asr_provider
from app.integrations.ocr import get_ocr_provider

PROMPT = """你是一个教育 AI 助手。下面是一堂课的实时记录……（见第四章完整 prompt）"""

def summarize(timeline_items: list[dict]) -> list[dict]:
    """输入时间流条目 → 输出结构化笔记"""
    items = preprocess_multimodal(timeline_items)
    context = build_context(items)
    if not context.strip():
        return []
    llm = get_llm_provider()
    response = llm.chat(PROMPT.format(timeline_context=context[:8000]))
    return parse_summary(response)


def preprocess_multimodal(timeline_items: list[dict]) -> list[dict]:
    """预处理：录音→ASR转写，图片→OCR识别"""
    asr = get_asr_provider()
    ocr = get_ocr_provider()
    for item in timeline_items:
        if item["type"] == "recording" and not item.get("transcript"):
            if item.get("audioFile"):
                item["transcript"] = asr.transcribe(item["audioFile"])
        if item["type"] == "image" and not item.get("ocrText"):
            if item.get("storageKey"):
                item["ocrText"] = ocr.extract_text(item["storageKey"])
    return timeline_items


def build_context(timeline_items: list[dict]) -> str:
    """把混合模态条目拼成 LLM 可读的纯文本"""
    parts = []
    for item in timeline_items:
        ts = item.get("timestamp", "")
        t = item.get("type", "")
        if t == "text":
            parts.append(f"[{ts}] 学生笔记：{item.get('content', '')}")
        elif t == "recording":
            parts.append(f"[{ts}] 录音转写：{item.get('transcript', '')}")
        elif t == "image":
            parts.append(f"[{ts}] 图片识别：{item.get('ocrText', '')}")
        elif t == "system":
            parts.append(f"[{ts}] 系统标记：{item.get('content', '')}")
    return "\n\n".join(parts)


def parse_summary(llm_response: str) -> list[dict]:
    """解析 LLM 返回的 JSON，加容错"""
    try:
        return json.loads(llm_response)
    except json.JSONDecodeError:
        pass
    start = llm_response.find("[")
    end = llm_response.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(llm_response[start:end])
        except json.JSONDecodeError:
            pass
    return []
```

不用等 A 写完就能自测：

```bash
cd D:\Muduo\Muduo-notes-v1\backend
python -c "
from app.services.summarizer import summarize
items = [
    {'type':'text','content':'导数定义...','timestamp':'08:02'},
    {'type':'recording','content':'讲解','timestamp':'08:08','transcript':'...'},
]
result = summarize(items)
print(result)
"
```

**第二步：写 worker handler**

在 `backend\app\workers\handlers.py` 末尾追加：

```python
# 文件：backend/app/workers/handlers.py（末尾追加，不要改已有代码）

def handle_quick_note_summarize(task):
    """处理速记 AI 总结任务"""
    from app.services.summarizer import summarize
    items = task.input.get("timeline_items", [])
    notes = summarize(items)
    return {"notes": notes, "count": len(notes)}
```

然后在 `backend\app\workers\registry.py` 中注册（只需加一行，确认 registry 的注册方式后告知 A）：

```python
# backend/app/workers/registry.py（已有，只加一行注册）
registry.register("quick_note_summarize", handle_quick_note_summarize)
```

**第三步：写测试**

在 `backend\tests\test_quick_notes.py`（新文件）：

```python
# 文件：backend/tests/test_quick_notes.py

import unittest
from app.services.summarizer import summarize, parse_summary, build_context

class TestSummarizer(unittest.TestCase):

    def test_empty_input_returns_empty(self):
        self.assertEqual(summarize([]), [])

    def test_text_only_input(self):
        items = [{"type":"text","content":"导数定义","timestamp":"08:00"}]
        result = summarize(items)
        self.assertIsInstance(result, list)

    def test_build_context_formats_correctly(self):
        items = [
            {"type":"text","content":"导数定义","timestamp":"08:02"},
            {"type":"recording","content":"讲解","timestamp":"08:08","transcript":"导数表示..."},
        ]
        ctx = build_context(items)
        self.assertIn("08:02", ctx)
        self.assertIn("学生笔记", ctx)
        self.assertIn("录音转写", ctx)

    def test_parse_summary_valid_json(self):
        result = parse_summary('[{"title":"测试","type":"概念定义"}]')
        self.assertEqual(len(result), 1)

    def test_parse_summary_with_noise(self):
        result = parse_summary('好的，这是结果：[{"title":"测试"}]')
        self.assertEqual(len(result), 1)

if __name__ == "__main__":
    unittest.main()
```

运行：

```bash
cd D:\Muduo\Muduo-notes-v1\backend
python -m pytest tests/test_quick_notes.py -v
```

**难度**：高。核心挑战在 prompt 工程和 LLM 输出解析（详见第三～六章）。但代码量不大（~150 行），且 mock provider 降低了调试门槛。

---

### 两人协作方式

```
B 先定义函数签名（写在 backend/app/services/summarizer.py）：
  def summarize(timeline_items: list[dict]) -> list[dict]

A 在 backend/app/modules/notes/routes.py 里 import 调用：
  from app.services.summarizer import summarize
  result = summarize(items)

开发期间：
  - A 在 routes.py 里先写一个空的占位函数，不阻塞自己开发
  - B 独立在 summarizer.py 里迭代 prompt，随时用 python -c "..." 自测
  - B 写好后，A 不需要改代码，import 自动生效

联调时：
  - A 启动后端 → B 用 curl 调 POST /summarize → 验证全流程
```

---

## 三、AI 多模态混合总结 — 机制原理

### 3.1 输入是什么

时间流速记结束后，后端从 `timeline_items` 表读到一组**按时间排列的混合数据**：

```json
[
  { "type": "text",     "content": "导数定义：f'(x)=lim...",           "timestamp": "08:02" },
  { "type": "recording","content": "教师讲解导数的几何意义",           "timestamp": "08:08", "transcript": "导数在几何上表示..." },
  { "type": "image",    "content": null, "storageKey": "board_photo.jpg", "timestamp": "08:15" },
  { "type": "text",     "content": "可导一定连续，连续不一定可导",      "timestamp": "08:20" },
  { "type": "recording","content": "例题讲解",                        "timestamp": "08:25", "transcript": "求 y=x² 在 x=1 处的导数..." }
]
```

三种模态混在一起：
- **文本**：用户手动输入的文字片段
- **录音**：课堂录音 + ASR 转写文本
- **图片**：板书/PPT 照片

### 3.2 处理流水线

```
D:\Muduo\Muduo-notes-v1\backend\app\services\summarizer.py 中的处理流程：

时间流原始数据
      │
      ├─→ [文本] ──────────────────────────┐
      ├─→ [录音] → ASR 转写 → 纯文本 ──────┤
      └─→ [图片] → OCR 识别 → 纯文本 ──────┤
                                           ↓
                              build_context() 拼接为统一文本
                                           ↓
                              LLMProvider.chat() 做结构化
                                           ↓
                              parse_summary() 解析 JSON
                                           ↓
                              输出结构化笔记数组
```

**关键洞察**：无论原始输入是什么模态，最终都转为纯文本，然后交给 LLM 统一处理。这就是"多模态混合总结"的本质——不是让 LLM 直接理解图片/音频，而是通过 ASR/OCR 把非文本模态转为文本，再统一总结。

### 3.3 每一步的技术实现

#### Step 1：文本条目 → 直接使用

无需处理，`build_context()` 直接拼入。

#### Step 2：录音 → ASR 转写

```python
# 调用 backend/app/integrations/asr.py 中已有的 provider
from app.integrations.asr import get_asr_provider

asr = get_asr_provider()  # MVP 阶段用 mock，生产用阿里云/讯飞/Whisper
transcript = asr.transcribe("path/to/audio.mp3")
```

ASR 返回纯文本。Mock provider（`backend/app/integrations/asr.py` 中）直接返回写死的转写结果，开发阶段不走真实 API。

#### Step 3：图片 → OCR 识别

```python
# 调用 backend/app/integrations/ocr.py 中已有的 provider
from app.integrations.ocr import get_ocr_provider

ocr = get_ocr_provider()
text = ocr.extract_text("path/to/image.jpg")
```

OCR 识别图片中的文字（板书、公式、图表标注）。Mock provider 返回占位文本。

#### Step 4：拼接上下文（`build_context`）

把所有条目的文本按时间顺序拼接成一个完整的"课堂记录"，每条前面标注时间戳和来源类型，帮助 LLM 理解上下文。

#### Step 5：LLM 结构化总结

把拼接好的全文发给 LLM（通过 `backend/app/integrations/llm.py`），要求它输出结构化笔记数组。

---

## 四、Prompt 工程 — 让 LLM 输出结构化笔记

### 4.1 Prompt 模板

（写在 `backend/app/services/summarizer.py` 的 `PROMPT` 常量中）

```
你是一个教育 AI 助手。下面是一堂课的实时记录，包含学生的文字笔记、
录音转写内容和图片识别结果。请将这些碎片化信息整理为结构化的学习笔记。

课堂记录：
{timeline_context}

要求：
1. 提取 3-8 个知识点，每个知识点包含：
   - title：知识点的标题
   - type：类型（概念定义 / 关键结论 / 推导步骤 / 例题分析 / 教师强调）
   - content：完整的解释说明（100-300 字）
   - source：来源标注（如"第3段录音"、"08:15图片"）

2. 只输出 JSON 数组，不要加任何解释：

[
  {
    "title": "导数的定义",
    "type": "概念定义",
    "content": "导数是函数在某一点的变化率...",
    "source": "08:02 文本笔记 + 08:08 录音"
  }
]
```

### 4.2 LLM 为什么会输出正确格式

| 技巧 | 为什么 |
|---|---|
| 先给角色（"教育 AI 助手"） | LLM 进入"教师思维"，输出更结构化 |
| 标注时间+来源 | 帮助 LLM 把同一话题的多个片段合并 |
| 明确枚举类型（5 种） | 限制 LLM 的输出空间，减少随机性 |
| 只输出 JSON | 避免 LLM 在前面加"好的，我来整理..." |
| 给一个完整示例 | LLM 会模仿示例的格式和风格 |

### 4.3 解析 + 容错

`parse_summary()` 在 `backend/app/services/summarizer.py` 中实现，三重容错：

1. 直接 `json.loads` 解析
2. 截取 `[` 到 `]` 再解析（处理 LLM 输出的废话前缀）
3. 返回空列表（彻底失败也不崩溃）

---

## 五、完整代码骨架（供后端 B 参考）

最终 `backend/app/services/summarizer.py` 的完整结构：

```python
# D:\Muduo\Muduo-notes-v1\backend\app\services\summarizer.py

import json
from app.integrations.llm import get_llm_provider
from app.integrations.asr import get_asr_provider
from app.integrations.ocr import get_ocr_provider

PROMPT = """
你是一个教育 AI 助手。下面是一堂课的实时记录……（见第四章）
课堂记录：
{timeline_context}
"""

def build_context(timeline_items: list[dict]) -> str: ...
def preprocess_multimodal(timeline_items: list[dict]) -> list[dict]: ...
def summarize(timeline_items: list[dict]) -> list[dict]: ...
def parse_summary(llm_response: str) -> list[dict]: ...
```

---

## 六、异步执行流程

时间流速记的 AI 总结不能阻塞 HTTP 请求（可能需要 5-15 秒），必须走异步任务。

```
用户在前端点击"结束学习"
    ↓
前端调 POST /api/v1/quick-notes/{noteId}/summarize
    ↓
后端 A 的 routes.py 收到请求：
  1. 读取 timeline_items（从 timeline_items 表）
  2. 调用 create_ai_task(type="quick_note_summarize")（复用 backend/app/modules/ai_tasks/）
  3. 立即返回 { "taskId": "task_xxx", "status": "queued" }
    ↓
worker（backend/app/workers/handlers.py）在后台执行：
  1. 调 B 的 summarize(timeline_items)
  2. 结果写入 note_blocks 表（结构化笔记）
  3. 更新 ai_tasks 状态为 succeeded
    ↓
前端轮询 GET /api/v1/ai-tasks/{taskId}
    ↓
状态变为 succeeded → 前端刷新 AI 结构化面板
```

这个机制和资源转笔记的异步流程一模一样（参考 `backend/app/services/resource_note_workflow.py`），直接复用 `ai_tasks` + `workers` 基础设施。

---

## 七、与记忆模式 AI 生成的区别

| 维度 | 记忆模式 AI 生成 | 速记模式 AI 总结 |
|---|---|---|
| 后端文件 | `backend/app/modules/memory/generator.py` | `backend/app/services/summarizer.py` |
| 输入 | 一篇完整笔记（notes + note_blocks） | 时间流碎片（timeline_items 表） |
| 预处理 | 无需（纯文本） | ASR + OCR → 拼为纯文本 |
| LLM 任务 | 生成记忆卡片（问答对） | 总结为结构化笔记（标题+正文+分类） |
| 输出 | 4 种类型的卡片数组 | 5 种类型的知识点数组 |
| 难度 | ⭐⭐⭐ | ⭐⭐⭐⭐（多了多模态预处理） |

---

## 八、开发顺序建议

```
Week 1 ─┬─ 后端 A：扩展 notes 表 → CRUD 路由 → 普通速记存取完成
        │         文件：backend/app/modules/notes/models.py routes.py service.py
        │
        └─ 后端 B：研究 prompt 工程 → 用 mock ASR/OCR/LLM 调通 summarize
                  文件：backend/app/services/summarizer.py

Week 2 ─┬─ 后端 A：时间流条目存取 → POST /timeline → 路由里 import B
        │         文件：同上
        │
        └─ 后端 B：接入 worker + ai_tasks → 写异步 handler → 写测试
                  文件：backend/app/workers/handlers.py
                        backend/tests/test_quick_notes.py

Week 3 ─── 两人联调：从前端走通"录音→结束→AI 总结→面板显示"全流程
```

两人第一周完全独立，第二周 A 调 B 的函数（一行 import），第三周联调。

---

## 九、前端对接（后端完成后）

> 前端代码已完成，文件位置：
> - `D:\Muduo\Muduo-notes-v1\frontend\src\features\quick-notes\QuickNotes.jsx`
> - `D:\Muduo\Muduo-notes-v1\frontend\src\api\quickNotes.js`
>
> 目前 `triggerAiParse()` 用的是假进度动画。后端接口就绪后，只需替换为真实 API 调用。

```js
// 现在（假进度）
const triggerAiParse = () => {
  setAiProgress(0);
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 20;
    if (p >= 100) { p = 100; clearInterval(iv); }
    setAiProgress(p);
  }, 400);
};

// 改为（真实 API）
const triggerAiParse = async () => {
  setAiProgress(0);
  const res = await summarizeQuickNote(noteId);  // POST /api/v1/quick-notes/{id}/summarize
  const taskId = res.data.taskId;

  const poll = setInterval(async () => {
    const task = await fetchAiTask(taskId);       // GET /api/v1/ai-tasks/{taskId}
    if (task.data.status === 'succeeded') {
      clearInterval(poll);
      setStructuredNotes(task.data.output.notes);
      setAiProgress(100);
    } else if (task.data.status === 'failed') {
      clearInterval(poll);
      showToast('AI 解析失败');
    } else {
      setAiProgress((prev) => Math.min(prev + 10, 90));
    }
  }, 1000);
};
```

前端 API 层（`frontend/src/api/quickNotes.js`）需新增两个函数：
- `summarizeQuickNote(noteId)` → `POST /api/v1/quick-notes/{noteId}/summarize`
- `fetchAiTask(taskId)` → `GET /api/v1/ai-tasks/{taskId}`（可复用已有的 `backend/app/modules/ai_tasks/routes.py`）
