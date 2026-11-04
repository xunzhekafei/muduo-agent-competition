# 速记模式单人全栈开发计划 — mtysinglenotes

> 目标：马天一使用 Claude Code 在 g1-mty 分支独立完成速记模式的后端接口、数据库扩展、AI 总结全部后端开发工作。

---

## 前置条件

| 项目 | 状态 |
|---|---|
| 前端页面 | 已完成（导览页、时间流速记、普通速记 Markdown 编辑器） |
| 前端 API 层 | 已完成（quickNotes.js，含 mock 回退） |
| 速记后端 | **未开始**（notes 模块只有基础 CRUD，无速记专用逻辑） |
| 数据库 | notes 表存在但缺少 `note_type` 字段；`timeline_items` 表不存在 |
| AI 总结 | 未实现（summarizer.py 不存在） |
| 契约文件 | `openapi.yaml` 无速记相关端点 |

---

## 总体开发顺序

```
Phase 1  审阅现有代码   (0.5h)  读 notes 模块 + 前端 quick-notes 代码
    ↓
Phase 2  数据库补全     (0.5h)  补 note_type 字段，建 timeline_items 表，Alembic 迁移
    ↓
Phase 3  速记 CRUD      (1.5h)  速记列表/详情/创建/保存/删除接口 + 时间流条目存取
    ↓
Phase 4  普通速记存取   (0.5h)  普通速记 Markdown 内容保存和读取
    ↓
Phase 5  AI 总结        (1.5h)  创建 summarizer.py，多模态混合总结
    ↓
Phase 6  前端切换真实API (0.5h)  删除 quickNotes.js 的 mock 回退，全流程联调
    ↓
Phase 7  测试 + 收尾    (0.5h)  写测试，修 bug，提交
```

预计总工时：**5-6 小时**（1-2 天可完成）

---

## Phase 1：审阅现有代码（预计 0.5h）

### 目标
理解 notes 模块现有能力，明确哪些可以复用、哪些需要新建。

### 步骤

**1.1 读后端 notes 模块**

| 文件 | 关注点 |
|---|---|
| `backend/app/modules/notes/models.py` | NoteModel 有哪些字段？有 note_type 吗？ |
| `backend/app/modules/notes/routes.py` | 有哪些已有接口？哪些可以给速记复用？ |
| `backend/app/modules/notes/service.py` | 有哪些方法？list_notes / create_note / update_note 等 |

**1.2 读前端 quick-notes 代码**

| 文件 | 关注点 |
|---|---|
| `frontend/src/api/quickNotes.js` | 调了哪些 API？期望的请求/响应格式是什么？ |
| `frontend/src/features/quick-notes/QuickNotesHub.jsx` | 导览页展示什么数据？ |
| `frontend/src/features/quick-notes/QuickNotes.jsx` | 时间流速记需要什么接口？ |
| `frontend/src/features/quick-notes/RegularNote.jsx` | 普通速记需要什么接口？ |

**1.3 确认后端能启动**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

浏览器打开 `http://localhost:8000/docs`，确认 notes 相关接口可访问。

---

## Phase 2：数据库补全（预计 0.5h）

### 目标
给 notes 表加 `note_type` 字段，新建 `timeline_items` 表，Alembic 迁移。

### 步骤

**2.1 给 NoteModel 加 note_type 字段**

编辑 `backend/app/modules/notes/models.py`，在 NoteModel 中添加：

```python
note_type: Mapped[str] = mapped_column(
    String(20),
    default="regular",
    nullable=False,
    index=True,
)
# "regular" = 普通速记，"timeline" = 时间流速记
```

**2.2 新建 TimelineItemModel**

在同一文件中新增：

```python
class TimelineItemModel(Base, TimestampMixin):
    __tablename__ = "timeline_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True,
        default=lambda: new_prefixed_id("tli"))
    note_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # text / recording / image / system
    content: Mapped[str] = mapped_column(String, nullable=False, default="")
    timestamp: Mapped[str] = mapped_column(String(20), nullable=True)  # "08:02"
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
```

**2.3 Alembic 迁移**

```bash
cd backend
alembic revision --autogenerate -m "add note_type to notes, create timeline_items"
alembic upgrade head
```

### 验证方法
- `alembic upgrade head` 执行成功
- SQLite 中 notes 表有 `note_type` 列
- `timeline_items` 表存在

---

## Phase 3：速记 CRUD 接口（预计 1.5h）

### 目标
实现速记列表、详情、创建、保存、删除，以及时间流条目的追加。

### 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/quick-notes` | 速记列表，支持 `?type=timeline` 过滤 |
| GET | `/api/v1/quick-notes/{id}` | 速记详情，含时间流条目 |
| POST | `/api/v1/quick-notes` | 创建速记 `{ title, type }` |
| PATCH | `/api/v1/quick-notes/{id}` | 保存速记内容 |
| POST | `/api/v1/quick-notes/{id}/timeline` | 追加一条时间流条目 |
| DELETE | `/api/v1/quick-notes/{id}` | 软删除速记 + 关联条目 |

### 步骤

**3.1 新建 routes/quick_notes.py**

```python
router = APIRouter(prefix="/quick-notes", tags=["quick-notes"])

@router.get("/")
async def list_quick_notes(
    note_type: str | None = Query(default=None, alias="type"),
    ...
):
    """速记列表，可按 type=timeline/regular 过滤"""
```

**3.2 在 api/v1/router.py 注册路由**

```python
from app.modules.quick_notes import router as qn_router
api_v1_router.include_router(qn_router)
```

**3.3 实现各接口**

- `GET /` — 调 NoteService 配合 note_type 过滤
- `GET /{id}` — 返回笔记详情 + 时间流条目列表
- `POST /` — 创建笔记，设置 note_type
- `PATCH /{id}` — 更新笔记内容（普通速记的 markdown）
- `POST /{id}/timeline` — 追加 TimelineItemModel
- `DELETE /{id}` — 软删除笔记 + 关联条目

### 验证方法
- `/docs` 页面可看到 quick-notes 标签
- 创建一条速记 → 列表能查到 → 详情能看到 → 删除后查不到

---

## Phase 4：普通速记存取（预计 0.5h）

### 目标
前端 RegularNote 可正常保存和读取 Markdown 内容。

### 原理
普通速记就是 `note_type="regular"` 的笔记，Markdown 内容存在 `note_blocks` 表中。已有 notes 模块的 blocks CRUD 可以复用。

### 步骤

**4.1 确认已有 block 接口可用**

notes 模块已有：
- `POST /api/v1/notes/{id}/blocks` — 添加 block
- `PATCH /api/v1/notes/{id}/blocks/{blockId}` — 编辑 block

普通速记的"保存 Markdown 内容"就是把全文作为一个 paragraph block 写入。

**4.2 前端对接点**

前端 `RegularNote.jsx` 的 `handleSave` 调用 `updateQuickNote(id, { title, content })`。后端 PATCH 接口把 content 作为 note_block 写入即可。

### 验证方法
- 前端创建普通速记 → 写内容 → 保存 → 刷新 → 内容还在

---

## Phase 5：AI 多模态总结（预计 1.5h）

### 目标
实现时间流速记的 AI 总结：把录音+文字+图片的混合时间流拼成统一文本，送给 LLM 生成结构化笔记。

### 原理

见 `quick-notes-development.md` 第三章的完整说明。核心流程：

```
时间流条目（text/recording/image）
  ↓ 预处理（ASR转录音、OCR识别图片）
  ↓ 拼接为统一文本
  ↓ 送 LLM
  ↓ 解析 JSON
  ↓ 返回结构化笔记
```

### 步骤

**5.1 创建 summarizer.py**

新建 `backend/app/services/summarizer.py`：

```python
def summarize(timeline_items: list[dict]) -> list[dict]:
    """输入时间流条目 → 输出结构化笔记数组"""
    items = preprocess_multimodal(timeline_items)
    context = build_context(items)
    llm = get_default_integrations().llm
    response = llm.generate(...)
    return parse_summary(response)
```

**5.2 新建总结接口**

在 quick_notes 路由中添加：

```
POST /api/v1/quick-notes/{noteId}/summarize
→ 立即返回 taskId（异步执行）
→ 后台调 summarize()
→ 结果写入 note_blocks 表（结构化笔记）
```

**5.3 复用 DeepSeek**

当前 provider 已配置为 DeepSeek（`MUDUO_LLM_PROVIDER=deepseek`），summarizer 无需任何额外配置。

### 验证方法
- 创建时间流速记 → 追加几条文本条目 → 调 summarize 接口
- 轮询 task 状态 → succeeded → 查看生成的 structured notes

---

## Phase 6：前端切换真实 API（预计 0.5h）

### 目标
删除 `frontend/src/api/quickNotes.js` 的 mock 回退，全部走真实后端。

### 步骤

**6.1 删除 mock 回退**

quickNotes.js 当前有 mock 回退的函数：
- `fetchQuickNotesList` → 删 catch 中的 `return mockQuickNotesHistory`
- `fetchQuickNote` → 删 catch 中的 `return mockRegularNoteContent`

**6.2 保证认证正常**

确认 `ensureAuth()` 能在后端自动登录 `student@example.com`。

**6.3 全流程联调**

```
记忆库 → 新建时间流速记 → 添加文本条目 → AI 总结 → 查看结构化笔记
记忆库 → 新建普通速记 → 写 Markdown → 保存 → 刷新
记忆库 → 查看历史列表 → 点击历史速记 → 加载内容
```

### 验证方法
- 浏览器 Console 无 404/500
- Network 面板所有 `/api/v1/quick-notes/*` 返回 200
- 后端 uvicorn 日志无异常

---

## Phase 7：测试 + 收尾（预计 0.5h）

### 目标
写基本测试，跑构建，提交代码。

### 步骤

**7.1 写后端测试**

新建 `backend/tests/test_quick_notes.py`：

```python
class TestSummarizer:
    def test_empty_input(self): ...
    def test_text_items_converted(self): ...
    def test_parse_llm_response(self): ...

class TestQuickNotesAPI:
    def test_create_quick_note(self): ...
    def test_list_filtered_by_type(self): ...
    def test_add_timeline_item(self): ...
    def test_delete_cascades(self): ...
```

**7.2 跑测试**

```bash
cd backend
python -m pytest tests/test_quick_notes.py -v
```

**7.3 前端构建**

```bash
cd frontend
npm run build
```

**7.4 更新契约**

在 `contracts/openapi.yaml` 中添加：

| 端点 | 说明 |
|---|---|
| GET `/quick-notes` | 速记列表 |
| GET `/quick-notes/{id}` | 速记详情 |
| POST `/quick-notes` | 创建速记 |
| PATCH `/quick-notes/{id}` | 保存速记 |
| POST `/quick-notes/{id}/timeline` | 追加时间流条目 |
| DELETE `/quick-notes/{id}` | 删除速记 |
| POST `/quick-notes/{id}/summarize` | AI 总结 |
| PUT `/quick-notes/{id}/cycle` | 空（普通速记不需要） |

**7.5 Git 提交**

```bash
git checkout g1-mty
git add .
git commit -m "feat: 速记模式后端完成 — 数据库+CRUD+AI总结+测试+契约更新"
git push origin g1-mty
```

---

## 附录 A：记忆模式 vs 速记模式开发对比

| 维度 | 记忆模式 | 速记模式 |
|---|---|---|
| 后端模块 | `modules/memory/` | 复用 `modules/notes/` + 新建端点 |
| 数据库 | 已有 memory_cards 表 | 需加 note_type + 建 timeline_items |
| AI 功能 | `generator.py` 调用 DeepSeek 生成卡片 | `summarizer.py` 多模态混合总结 |
| AI 难度 | 中 | 中（多了 ASR/OCR 预处理） |
| 前端状态 | 重构后完成 | 已完成 |
| 预计工时 | 10-12h（已完） | 5-6h |
