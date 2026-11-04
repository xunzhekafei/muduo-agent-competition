# 记忆模式 — 业务逻辑文档

本文档面向记忆模式开发小组全体成员，从前端已实现的功能出发，逐层梳理业务逻辑、数据模型、API 接口和后端开发任务。

---

## 一、功能总览

记忆模式是 Muduo 四大核心模式之一，让用户把笔记内容转化为记忆卡片，按间隔重复规律进行复习。

```
用户笔记 → AI 生成卡片 → 选择记忆周期 → 每日复习 → 掌握知识
```

三个核心页面：

| 页面 | 路由 | 说明 |
|---|---|---|
| 记忆库 | `/memory-mode` | 总仪表盘，查看所有笔记的记忆状态 |
| 记忆卡片管理 | `/memory-mode` (内部视图) | 某篇笔记的卡片列表，可增删改 |
| 沉浸式复习 | 全屏覆盖 | 翻转卡片 + 上一张/下一张导航 |

---

## 二、核心业务概念

### 2.1 笔记的记忆状态

每篇笔记在记忆库中有四种展示状态：

```
未生成 ──(AI生成卡片+选周期)──→ 未开始 ──(当天复习)──→ 记忆中 ──(全部复习完)──→ 已完成
                                  ↑ 红色标签          ↑ 蓝色标签          ↑ 绿色标签
                               daysUntilNext=0     daysUntilNext>0     reviewedCards=totalCards
```

| 状态 | 英文标识 | 颜色 | 含义 | 判定条件 |
|---|---|---|---|---|
| 未生成 | `none` | 灰色 | 还没为这篇笔记生成过记忆卡片 | `status === 'none'` |
| 未开始 | `pending` | **红色** | 当天该复习了但还没开始 | `daysUntilNext === 0` |
| 记忆中 | `active` | 蓝色 | 有卡片在复习周期中 | `status === 'active'` 且未到期 |
| 已完成 | `completed` | 绿色 | 全部卡片都复习完了 | `status === 'completed'` |

### 2.2 记忆周期

用户生成卡片后必须选择一个记忆周期，选定后不可更改。三种周期对应不同的复习间隔：

| 周期 | 场景 | 复习间隔（天） |
|---|---|---|
| ⚡ 考前冲刺 | 30天内有考试 | 1 → 2 → 4 → 7 → 14 |
| 📚 标准学习（推荐） | 日常课程 | 1 → 3 → 7 → 15 → 30 → 60 |
| 🎯 长期掌握 | 考研/核心专业课 | 1 → 3 → 7 → 15 → 30 → 90 → 180 |

数字代表"第 N 天"进行下一次复习。例如标准学习：生成后第 1 天首次复习 → 第 3 天第二次 → 第 7 天第三次...

**重要**：周期一旦确认，记忆库中只展示不可修改。

### 2.3 卡片类型

AI 从笔记中提取知识点，生成四种类型的卡片：

| 类型 | 说明 | 示例问题 |
|---|---|---|
| 概念定义 | 核心概念的解释 | "导数的定义是什么？" |
| 填空卡片 | 关键术语填空 | "梯度下降是一种\_\_\_\_算法" |
| 辨析卡片 | 正误判断 | "连续一定可导，对吗？" |
| 翻转问答 | 综合问答 | "什么是微分的概念？" |

---

## 三、用户操作流程

### 流程 A：首次为笔记创建记忆卡片

```
1. 进入记忆库 → 点击 "+ 新建记忆"
2. 弹出文件选择器 → 选择一篇笔记
3. AI 解析过程页（4 阶段动画）：
   - 📖 正在读取笔记内容...
   - 🔍 识别知识结构与核心概念...
   - 🧠 提取关键知识点...
   - ✨ 生成四种类型记忆卡片...
4. 展示生成的卡片预览 → 可手动添加/修改卡片
5. 点击 "下一步：选择记忆周期" → 三选一
6. 确认 → 回到记忆库，笔记状态变为 "未开始" 或 "记忆中"
```

### 流程 B：从记忆库进入已有卡片的笔记

```
1. 记忆库中点击某篇 "未开始"/"记忆中"/"已完成" 的笔记
2. 加载已有卡片列表 → 每张卡片展示问题 + 答案
3. 可执行操作：
   - 手动添加新卡片
   - 编辑/删除单张卡片
   - 点击 "开始记忆 (N)" → 进入沉浸式复习
```

### 流程 C：沉浸式复习

```
1. 全屏显示当前卡片正面（问题）
2. 点击卡片或 "查看答案" → 翻转显示背面（答案）
3. "上一张" / "下一张" 浏览卡片
4. "退出" → 回到记忆库
```

---

## 四、四人分工总览

> **重要前提**：现有后端已有 `memory_cards` 和 `review_records` 的 SQLAlchemy 模型和基础 CRUD 路由（ZhangYuxuan 之前完成）。**不需要从零建表**，大家直接写业务逻辑。

### 分工原则

每人负责**自己独立的文件**，互不编辑同一个文件。需要别人的功能时，用 `from xxx import xxx` 调用，不直接改别人的代码。

### 一人一张图

| 人员 | 做啥 | 独占文件 | 一句话描述 |
|---|---|---|---|
| **A — 吴晨阳** | AI 生成卡片 | `generator.py`（新） | 读笔记 → 调 LLM → 生成四种卡片 |
| **B — 任思睿** | 接口 + 路由 | `routes.py` + `schemas/memory.py` | 对接前端所有请求，串联其他人的代码 |
| **C — 刘宇童** | 记忆库 + 周期 | `library.py`（新） | 聚合查询 + 设置复习节奏 |
| **D — 李兆一** | 复习算法 + 测试 | `scheduler.py`（新）+ 测试文件 | 算啥时候该复习 + 保证代码没 bug |

### 文件归属总览

```
backend/app/modules/memory/
├── models.py        ← 已有，不用改
├── repository.py    ← 已有，不用改
├── service.py       ← 已有基础逻辑，B 视情况扩展
├── routes.py        ← B 负责
├── generator.py     ← A 独占（新文件）
├── library.py       ← C 独占（新文件）
├── scheduler.py     ← D 独占（新文件）

backend/app/schemas/
└── memory.py        ← B 负责

backend/tests/
└── test_memory.py   ← D 负责
```

四个人不碰同一个文件，**零冲突**。联调时 B 在 `routes.py` 里统一注册所有人的端点，其他人只需要告诉 B："我写好了，函数名是 xxx，路径是 xxx"。

---

## 五、吴晨阳（A）开发指南 — AI 生成卡片

### 你要做什么

用户在前端选了一篇笔记，点"生成记忆卡片"，你的代码负责把这篇文章交给 AI，让 AI 自动提取知识点，生成四种类型的卡片。

### 你要写的文件

新建一个文件：`backend/app/modules/memory/generator.py`

### 一步步来

**第一步：读懂笔记内容**

```python
from app.modules.notes.models import NoteModel, NoteBlockModel
from app.db.session import Session

def get_note_text(note_id: str, session: Session) -> str:
    """把一篇笔记的所有 block 拼成一段完整文本"""
    blocks = session.query(NoteBlockModel).filter(
        NoteBlockModel.note_id == note_id
    ).order_by(NoteBlockModel.position).all()

    return "\n\n".join(b.content for b in blocks if b.content)
```

就这么简单。去 `notes` 模块的 `models.py` 里找到 `NoteBlockModel`，按 `position` 排序，拼接所有 `content` 字段。

**第二步：写 prompt 让 AI 生成卡片**

```python
PROMPT_TEMPLATE = """
你是一个教育领域的 AI 助手。阅读以下笔记，生成记忆卡片。

笔记内容：
{note_text}

要求：
1. 生成四种类型的卡片：
   - 概念定义：提取核心概念，问定义是什么
   - 填空卡片：把关键术语挖掉，让用户填空
   - 辨析卡片：制造一个常见误解，让用户判断对错
   - 翻转问答：把重要结论变成问答
2. 每类至少 1 张，总共不超过 10 张
3. 返回纯 JSON 数组，格式如下：
[
  {{
    "type": "概念定义",
    "front": "导数的定义是什么？",
    "back": "导数是函数在某一点的变化率，定义为...",
    "difficulty": "中等"
  }}
]
"""
```

**为什么用 mock？** 项目里已经有一个假的 LLM（mock provider），开发阶段直接用。只需写几行调用代码：

```python
from app.integrations.llm import get_llm_provider

llm = get_llm_provider()  # 开发环境返回 mock，生产环境返回真实模型
response = llm.chat(PROMPT_TEMPLATE.format(note_text=text))
```

mock provider 会直接返回一个写死的卡片列表，这样你不用等真实 API 也能开发调试。

**第三步：解析 AI 返回的结果**

AI 返回的是字符串（可能是 JSON 也可能夹杂废话），你需要：

```python
import json

def parse_cards(llm_response: str) -> list[dict]:
    """从 LLM 返回中提取卡片数组"""
    # 尝试直接解析
    try:
        return json.loads(llm_response)
    except json.JSONDecodeError:
        pass

    # 如果夹了废话，找第一个 [ 和最后一个 ]
    start = llm_response.find("[")
    end = llm_response.rfind("]") + 1
    if start >= 0 and end > start:
        return json.loads(llm_response[start:end])

    # 实在不行返回空列表，不崩溃
    return []
```

**第四步：存入数据库**

```python
from app.modules.memory.models import MemoryCardModel

def save_cards(note_id: str, cards: list[dict], owner_id: str, session: Session):
    """把所有卡片写入 memory_cards 表"""
    from app.db.ids import generate_id

    for card in cards:
        model = MemoryCardModel(
            id=generate_id("card"),
            owner_id=owner_id,
            front=card["front"],
            back=card["back"],
            source_note_id=note_id,
            tags=[f"type:{card['type']}", f"difficulty:{card['difficulty']}"],
            status="active",
        )
        session.add(model)
    session.commit()
```

**第五步：拼成对外函数**

```python
def generate_cards(note_id: str, owner_id: str, session: Session) -> dict:
    """供 routes.py 调用的主函数"""
    text = get_note_text(note_id, session)
    if not text:
        raise ValueError("笔记内容为空")

    llm = get_llm_provider()
    response = llm.chat(PROMPT_TEMPLATE.format(note_text=text[:4000]))
    cards = parse_cards(response)

    if not cards:
        raise RuntimeError("AI 未能生成卡片")

    save_cards(note_id, cards, owner_id, session)

    return {"noteId": note_id, "cards": cards}
```

### 你需要谁帮忙？

- **确认 `llm.py` 里 `get_llm_provider()` 的调用方式**，可以问已有的 `backend/app/integrations/llm.py` 文件作者（ChaiYifan）
- **确认 `generate_id("card")` 的用法**，参考 `backend/app/db/ids.py`

### 做完怎么验证？

```bash
cd backend
python3 -c "
from app.modules.memory.generator import generate_cards
# 用 mock llm 测试
result = generate_cards('note_a1b2c3d4e5f6', 'user_001', session)
print(result)
"
```

能跑通、不报错、返回的 `cards` 数组有内容 → 成了。

---

## 六、任思睿（B）开发指南 — 接口 + 路由

### 你要做什么

你是前后端的"接线员"。前端发了请求过来，你要接住，调别人的函数处理数据，再把结果按统一格式返回给前端。

### 你要写的文件

- `backend/app/modules/memory/routes.py` — 补充接口
- `backend/app/schemas/memory.py` — 定义请求和响应的"形状"（如没有则新建）

### 接口清单

你需要实现这些 API 端点。如果已有雏形，就补充完善：

| 方法 | 路径 | 做什么 | 难度 |
|---|---|---|---|
| GET | `/api/v1/memory/cards?sourceNoteId=xxx` | 查某篇笔记的所有卡片 | 低 |
| POST | `/api/v1/memory/cards` | 手动创建一张卡片 | 低 |
| PATCH | `/api/v1/memory/cards/{cardId}` | 编辑卡片内容 | 低 |
| DELETE | `/api/v1/memory/cards/{cardId}` | 软删除卡片 | 低 |
| POST | `/api/v1/memory/notes/{noteId}/generate` | 调人员 A 生成卡片 | 中 |

### 一步步来

**第一步：定义数据形状（Schema）**

在 `schemas/memory.py` 里写 Pydantic 模型。它告诉 FastAPI：请求体长什么样，响应体长什么样。

```python
from pydantic import BaseModel
from typing import Optional

class CreateCardRequest(BaseModel):
    front: str
    back: str
    sourceNoteId: Optional[str] = None
    tags: list[str] = []

class UpdateCardRequest(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    tags: Optional[list[str]] = None

class CardResponse(BaseModel):
    id: str
    front: str
    back: str
    sourceNoteId: Optional[str] = None
    tags: list[str]
    status: str
```

前端传给后端的数据必须符合这个形状，FastAPI 会自动校验，不合格的直接返回 422 错误。

**第二步：写路由（Route）**

在 `routes.py` 里写接口。以"查卡片列表"为例：

```python
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.db.session import get_session
from app.schemas.memory import CardResponse
from app.modules.memory.service import list_cards

router = APIRouter(prefix="/api/v1/memory")

@router.get("/cards")
def get_cards(
    sourceNoteId: str = None,
    user=Depends(get_current_user),
    session=Depends(get_session),
):
    cards = list_cards(session, user.id, sourceNoteId)
    return {"data": [CardResponse.model_validate(c).model_dump() for c in cards]}
```

**关键模式**：
- `Depends(get_current_user)` → 自动校验登录，拿到当前用户
- `Depends(get_session)` → 自动创建数据库连接
- 响应统一用 `{"data": ...}` 包起来

**第三步：学会抄**

项目里已经有 `notes`、`courses` 模块的 routes.py，写得很好。**直接看他们怎么写，照搬结构和风格**。比如：
- `backend/app/modules/notes/routes.py` — 参考查列表 + 创建
- `backend/app/modules/courses/routes.py` — 参考编辑 + 删除

**第四步：对接人员 A 的生成接口**

当用户调用 `POST /api/v1/memory/notes/{noteId}/generate` 时：

```python
@router.post("/notes/{noteId}/generate")
def generate(
    noteId: str,
    user=Depends(get_current_user),
    session=Depends(get_session),
):
    from app.modules.memory.generator import generate_cards
    result = generate_cards(noteId, user.id, session)
    return {"data": result}
```

如果人员 A 还没写完，你可以先写一个假的，返回写死的数据，等 A 写好了再换掉。

### 你需要谁帮忙？

- **人员 A** 的 `generate_cards` 函数
- **人员 C** 注册聚合接口时，在你的 `routes.py` 末尾加一两行 import
- **参考已有模块**的 routes.py 写法

### 做完怎么验证？

```bash
cd backend
# 启动服务
uvicorn app.main:app --reload --port 8000
# 打开浏览器访问 http://localhost:8000/docs
```

FastAPI 自动生成了 Swagger 文档页面，你可以在页面上直接点"Try it out"测试每个接口。

---

## 七、刘宇童（C）开发指南 — 记忆库聚合 + 周期设置

### 你要做什么

前端记忆库页面需要一张"总表"：列出每篇笔记有多少卡片、复习到哪了、下次啥时候复习。你负责把分散在三四张表里的数据聚合到一起，算出一个汇总结果。

### 你要写的文件

新建：`backend/app/modules/memory/library.py`

### 两个接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/memory/library` | 记忆库总览 |
| PUT | `/api/v1/memory/notes/{noteId}/cycle` | 设置记忆周期 |

### 一步步来

**第一步：理解数据源头**

你需要从三张表取数据：

```
notes 表           → 笔记标题、课程名
memory_cards 表    → 每篇笔记的卡片
review_records 表   → 每次复习的记录
```

用 SQL 的思路理解：以 `notes` 为主表，LEFT JOIN 另外两张，按用户过滤，按笔记分组统计。

**第二步：写聚合查询**

```python
from sqlalchemy import func
from app.modules.notes.models import NoteModel
from app.modules.memory.models import MemoryCardModel, ReviewRecordModel

def build_library(owner_id: str, session):
    """返回记忆库总览数据"""

    # 查出该用户所有笔记
    notes = session.query(NoteModel).filter(
        NoteModel.owner_id == owner_id,
        NoteModel.deleted_at.is_(None),
    ).all()

    result = []
    for note in notes:
        # 统计卡片
        cards = session.query(MemoryCardModel).filter(
            MemoryCardModel.source_note_id == note.id,
            MemoryCardModel.deleted_at.is_(None),
        ).all()

        total = len(cards)
        if total == 0:
            result.append({
                "noteId": note.id,
                "noteTitle": note.title,
                "status": "none",
                "totalCards": 0,
                "reviewedCards": 0,
                "dueCards": 0,
                "daysUntilNext": None,
                "cycle": None,
            })
            continue

        # 统计复习次数（每张卡有多少条复习记录）
        card_ids = [c.id for c in cards]
        reviewed = session.query(func.count(ReviewRecordModel.id)).filter(
            ReviewRecordModel.card_id.in_(card_ids),
        ).scalar()

        # 到期卡片数
        from datetime import datetime
        now = datetime.utcnow()
        due = sum(1 for c in cards if c.due_at and c.due_at <= now)

        # 距离下次复习天数
        future = [c.due_at for c in cards if c.due_at and c.due_at > now]
        next_due = min(future) if future else None
        days = (next_due - now).days if next_due else None

        result.append({
            "noteId": note.id,
            "noteTitle": note.title,
            "status": "completed" if due == 0 else "active",
            "totalCards": total,
            "reviewedCards": reviewed,
            "dueCards": due,
            "daysUntilNext": days,
            "cycle": cards[0].cycle if hasattr(cards[0], 'cycle') else None,
        })

    return result
```

**第三步：周期设置接口**

```python
CYCLE_SCHEDULES = {
    "cram": [1, 2, 4, 7, 14],
    "standard": [1, 3, 7, 15, 30, 60],
    "longterm": [1, 3, 7, 15, 30, 90, 180],
}

def set_cycle(note_id: str, cycle: str, session):
    """给某篇笔记的所有卡片设置复习周期"""
    from datetime import datetime, timedelta

    schedule = CYCLE_SCHEDULES.get(cycle)
    if not schedule:
        raise ValueError(f"无效的周期: {cycle}")

    cards = session.query(MemoryCardModel).filter(
        MemoryCardModel.source_note_id == note_id,
    ).all()

    now = datetime.utcnow()
    for card in cards:
        card.due_at = now + timedelta(days=schedule[0])  # 第一次复习 = 周期第一天
        card.cycle = cycle

    session.commit()
    return {"noteId": note_id, "cycle": cycle}
```

### 你需要谁帮忙？

- **人员 B** 帮你在 `routes.py` 里注册路由
- 如果需要加 `cycle` 字段到 `memory_cards` 表，需要**全组商量**（改 `models.py` + 加 migration）

### 做完怎么验证？

```python
# 后端 shell 测试
from app.modules.memory.library import build_library
data = build_library("user_001", session)
print(len(data))  # 应该返回笔记数量
print(data[0])    # 检查字段是否齐全
```

---

## 八、李兆一（D）开发指南 — 复习算法 + 测试

### 你要做什么

两件事：第一，实现"啥时候该复习"的计算逻辑；第二，给整个记忆模块写测试。

### 你要写的文件

- `backend/app/modules/memory/scheduler.py`（新） — 纯数学计算
- `backend/tests/test_memory.py` — 测试用例

### Part 1：复习调度算法

这本质上就是一个计算公式：用户今天复习了一张卡片，告诉他下次哪天再复习。

**核心公式（SM-2 算法简化版）**：

```
新间隔 = 旧间隔 × 难度系数

难度系数：
  完全忘了 → 1（重来）
  有点难   → 1.3
  正常     → 2.0
  太简单   → 2.5
```

**代码实现**：

```python
# scheduler.py — 纯函数，不依赖数据库

GRADE_FACTORS = {
    "again": 1,      # 重新学
    "hard": 1.3,     # 有点难
    "good": 2.0,     # 正常
    "easy": 2.5,     # 太简单
}

def next_interval(current_interval_days: int, grade: str) -> int:
    """计算下一次复习间隔（天）"""
    factor = GRADE_FACTORS.get(grade, 2.0)
    new_interval = max(1, round(current_interval_days * factor))
    return new_interval

def next_due_at(now, current_interval_days: int, grade: str):
    """计算下一次复习的具体日期"""
    from datetime import timedelta
    interval = next_interval(current_interval_days, grade)
    return now + timedelta(days=interval), interval
```

**为什么这很好写？** 因为它不碰数据库、不调 API，就是输入数字→输出数字。你可以像做数学题一样测试它：

```python
# 测试：正常复习 → 间隔翻倍
assert next_interval(1, "good") == 2
assert next_interval(2, "good") == 4

# 测试：忘了 → 重头开始
assert next_interval(10, "again") == 10  # 保持原间隔

# 测试：太简单 → 大幅延长
assert next_interval(1, "easy") == 2  # round(1 * 2.5) = round(2.5) = 2
```

### Part 2：写测试

**测试结构**：

```python
# tests/test_memory.py

import unittest
from app.modules.memory.scheduler import next_interval, next_due_at

class TestScheduler(unittest.TestCase):

    def test_next_interval_good(self):
        self.assertEqual(next_interval(1, "good"), 2)
        self.assertEqual(next_interval(3, "good"), 6)

    def test_next_interval_again_resets(self):
        self.assertEqual(next_interval(5, "again"), 5)

    def test_next_interval_easy_longer(self):
        self.assertEqual(next_interval(1, "easy"), 2)

    def test_next_due_at_returns_future_date(self):
        from datetime import datetime
        now = datetime(2026, 6, 1)
        due, interval = next_due_at(now, 1, "good")
        self.assertEqual(interval, 2)
        self.assertEqual(due.day, 3)

if __name__ == "__main__":
    unittest.main()
```

**运行测试**：

```bash
cd backend
python -m pytest tests/test_memory.py -v
```

看到满屏绿勾 → 通过。

### Part 3：集成测试（等其他人完成后）

等 A、B、C 都写完之后，你可以加集成测试——模拟一个完整流程：

```
1. 创建一篇测试笔记
2. 调用生成卡片接口（用 mock LLM）
3. 查记忆库聚合接口，确认卡片数正确
4. 复习一张卡片，确认 dueAt 更新了
5. 再查记忆库，确认进度变了
```

这种测试不需要跑前端，全程在后端模拟 HTTP 请求。

### 你需要谁帮忙？

- 基本不依赖别人。算法是纯函数，自己写完就能测。
- 集成测试阶段需要 A/B/C 的接口已经可用。

### 做完怎么验证？

```bash
cd backend
python -m pytest tests/test_memory.py -v
```

全部测试绿色通过即完成。

---

### 四人联调 Checklist

全部人完成后，按这个顺序检查：

- [ ] 后端能启动：`uvicorn app.main:app --reload`
- [ ] 访问 `/docs` 能看到所有新增接口
- [ ] 前端删掉 `api/memory.js` 里的 `catch { return mockXxx }` 回退逻辑
- [ ] 从前端走通完整流程：记忆库 → 新建记忆 → AI 生成 → 选周期 → 查看卡片 → 开始复习
- [ ] 刷新记忆库，状态正确更新
