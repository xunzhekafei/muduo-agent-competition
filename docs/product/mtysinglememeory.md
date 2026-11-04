# 记忆模式单人全栈开发计划 — mtysinglememeory

> 目标：马天一使用 Claude Code 独立完成记忆模式的数据库、后端接口、前端联调全部开发工作。

---

## 前置条件

| 项目 | 状态 |
|---|---|
| 前端页面 | 已完成（记忆库、卡片管理、AI 生成页、沉浸式复习） |
| 前端 API 层 | 已完成（含 mock 回退，后端就绪后只需删回退逻辑） |
| 后端框架 | FastAPI 已启动，notes/courses/auth 模块已有 |
| memory 模块基础 | ZhangYuxuan 已建 models 和基础 routes |
| 数据库 | SQLite，已建 memory_cards + review_records 表 |
| 契约文件 | `contracts/openapi.yaml` 定义了所有接口 |

---

## 总体开发顺序

```
Phase 1  环境验证      (0.5h)  启动后端，确认现有代码能跑
    ↓
Phase 2  数据库补全    (1h)    检查表结构，补缺失字段，Alembic 迁移
    ↓
Phase 3  卡片 CRUD     (2h)    完善增删改查接口，联调前端
    ↓
Phase 4  AI 生成卡片   (2h)    实现 generator.py，mock LLM 调通
    ↓
Phase 5  记忆库聚合    (1.5h)  实现 library.py，联调记忆库页面
    ↓
Phase 6  复习调度      (1.5h)  实现 scheduler.py + review 接口
    ↓
Phase 7  前端切换真实API (1h)  删除 mock 回退，全流程联调
    ↓
Phase 8  测试 + 收尾   (1h)    跑测试，修 bug，提交
```

预计总工时：**10-12 小时**（可分 2-3 天完成）

---

## Phase 1：环境验证（预计 0.5h）

### 目标
确认后端能启动，Python 环境正确，数据库表已存在。

### 步骤

**1.1 启动后端**

```bash
cd backend
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**1.2 验证数据库表**

浏览器打开 `http://localhost:8000/docs`，确认 Swagger 页面正常加载，左侧能看到 memory 相关的 tag。

**1.3 验证现有接口**

在 `/docs` 页面找到 `GET /api/v1/memory/cards`，点击 "Try it out" → "Execute"。预期返回空数组或已有数据。

**1.4 了解现有代码**

用 Claude Code 阅读以下文件，理解现有结构：

| 文件 | 为什么读 |
|---|---|
| `backend/app/modules/memory/models.py` | 了解 memory_cards 和 review_records 表结构 |
| `backend/app/modules/memory/routes.py` | 了解已有接口 |
| `backend/app/modules/memory/service.py` | 了解已有业务逻辑 |
| `backend/app/db/ids.py` | 了解 generate_id 用法 |
| `backend/app/core/auth.py` | 了解 get_current_user 怎么拿当前用户 |
| `backend/app/integrations/llm.py` | 了解 LLM provider 怎么调用 |

### 验证方法
- 后端启动成功，`/docs` 页面可访问
- `GET /api/v1/memory/cards` 返回 200
- Claude Code 能描述出每个文件的作用

---

## Phase 2：数据库补全（预计 1h）

### 目标
检查 memory_cards 和 review_records 表是否缺字段，补充缺失字段，建 Alembic 迁移。

### 步骤

**2.1 对照契约检查表结构**

打开 `contracts/openapi.yaml`，找到 MemoryCard schema，对照 `backend/app/modules/memory/models.py` 检查字段：

| 契约字段 | 是否已有 | 备注 |
|---|---|---|
| id (string) | 检查 | 主键 |
| ownerId | 检查 | 用户隔离 |
| front | 检查 | 正面（问题） |
| back | 检查 | 背面（答案） |
| sourceNoteId | 检查 | 来源笔记 |
| tags (array) | 检查 | 标签 |
| status | 检查 | active/suspended/archived |
| dueAt | 检查 | 下次复习时间 |
| createdAt | 检查 | 创建时间 |
| updatedAt | 检查 | 更新时间 |
| deletedAt | 检查 | 软删除 |

**2.2 补充缺失字段**

用 Claude Code 编辑 `models.py`，添加缺失字段。例如：

```python
# 如果缺少 deleted_at
deleted_at = Column(DateTime, nullable=True)

# 如果缺少 due_at
due_at = Column(DateTime, nullable=True)

# 如果缺少 source_note_id
source_note_id = Column(String, nullable=True)
```

**2.3 生成并执行迁移**

```bash
cd backend
alembic revision --autogenerate -m "补全 memory_cards 缺失字段"
alembic upgrade head
```

**2.4 检查迁移文件**

打开 `backend/migrations/versions/` 下最新生成的 `.py` 文件，确认 upgrade 和 downgrade 函数内容正确。

### 验证方法
- `alembic upgrade head` 执行成功，无报错
- `alembic current` 显示最新版本号
- 用 SQLite 客户端打开 `backend/muduo_dev.sqlite3`，确认表结构正确
- 或者用 Claude Code 写一个简单的 Python 脚本查询表结构

---

## Phase 3：卡片 CRUD 接口（预计 2h）

### 目标
完善 memory cards 的增删改查接口，前后端联调通过。

### 步骤

**3.1 完善 service.py**

需要实现的函数：

```python
# backend/app/modules/memory/service.py

def list_cards(session, owner_id, source_note_id=None, page=1, page_size=20):
    """查卡片列表，支持按笔记过滤"""

def create_card(session, owner_id, data):
    """手动创建一张卡片"""

def update_card(session, card_id, owner_id, data):
    """编辑卡片，需校验 owner"""

def delete_card(session, card_id, owner_id):
    """软删除卡片"""
```

参考已有的 `notes/service.py` 照搬模式。

**3.2 完善 routes.py**

对应 service 中的函数，补齐路由：

| 接口 | 说明 |
|---|---|
| `GET /api/v1/memory/cards?sourceNoteId=xxx` | 列表，已部分实现 |
| `POST /api/v1/memory/cards` | 创建卡片 |
| `PATCH /api/v1/memory/cards/{cardId}` | 编辑卡片 |
| `DELETE /api/v1/memory/cards/{cardId}` | 删除卡片 |

**3.3 验证接口**

在 `/docs` 页面逐个测试：

```bash
# 用 curl 测试创建卡片
curl -X POST http://localhost:8000/api/v1/memory/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"front":"测试问题","back":"测试答案","sourceNoteId":"note_a1b2c3d4e5f6"}'
```

**3.4 前端联调**

启动前端 `cd frontend && npm run dev`，进入记忆库 → 点击一篇已有卡片的笔记：

- 卡片列表正常显示
- 手动添加卡片成功
- 编辑卡片成功
- 删除卡片成功

### 验证方法
- `/docs` 页面四个接口全部返回正确数据
- 前端卡片管理页增删改查功能正常
- 删除后刷新，卡片不再出现

---

## Phase 4：AI 生成卡片（预计 2h）

### 目标
实现"用户选笔记 → AI 读内容 → 生成四种类型卡片"的完整流程。

### 步骤

**4.1 创建 generator.py**

新建 `backend/app/modules/memory/generator.py`，参考 [记忆模式业务逻辑文档](memory-mode-business-logic.md) 第五章的代码骨架。

核心函数：

```python
def generate_cards(note_id: str, owner_id: str, session) -> dict:
    """读笔记 → 调 LLM → 生成卡片 → 存入数据库 → 返回结果"""
    # 1. 查询笔记内容
    # 2. 拼接文本
    # 3. 调 LLM（MVP 用 mock provider）
    # 4. 解析 JSON
    # 5. 批量写入 memory_cards
    # 6. 返回卡片列表
```

**4.2 注册路由**

在 `routes.py` 中添加：

```python
@router.post("/notes/{noteId}/generate")
def generate(noteId: str, user=Depends(get_current_user), session=Depends(get_session)):
    result = generate_cards(noteId, user.id, session)
    return {"data": result}
```

**4.3 测试生成接口**

```bash
curl -X POST http://localhost:8000/api/v1/memory/notes/note_a1b2c3d4e5f6/generate \
  -H "Authorization: Bearer <token>"
```

**4.4 实现周期设置接口**

```python
# PUT /api/v1/memory/notes/{noteId}/cycle
def set_cycle(note_id, cycle, owner_id, session):
    """根据周期计算每张卡片的 due_at"""
    schedules = {
        "cram": [1, 2, 4, 7, 14],
        "standard": [1, 3, 7, 15, 30, 60],
        "longterm": [1, 3, 7, 15, 30, 90, 180],
    }
```

### 验证方法
- 用 curl 调生成接口，返回 4 种类型卡片
- 调周期设置接口，卡片 `due_at` 正确更新
- 前端走通完整流程：记忆库 → 新建记忆 → 选笔记 → AI 解析 → 生成卡片预览 → 选周期 → 确认 → 回记忆库

---

## Phase 5：记忆库聚合接口（预计 1.5h）

### 目标
实现 `GET /api/v1/memory/library` 聚合查询，前端记忆库页面正常展示。

### 步骤

**5.1 创建 library.py**

新建 `backend/app/modules/memory/library.py`，参考 [业务逻辑文档](memory-mode-business-logic.md) 第七章。

核心函数：

```python
def build_library(owner_id: str, session) -> list[dict]:
    """联表查询 notes + memory_cards + review_records，返回聚合数据"""
    # 返回格式：见 contracts/openapi.yaml 中的 MemoryLibraryResponse
```

**5.2 注册路由**

在 `routes.py` 中添加：

```python
@router.get("/library")
def get_library(user=Depends(get_current_user), session=Depends(get_session)):
    data = build_library(user.id, session)
    return {"data": data}
```

**5.3 联调前端**

启动前端 → 进入记忆库页面：

- 笔记列表正确显示
- 状态分类正确（未生成/未开始/记忆中/已完成）
- 复习进度条正确
- 距下次复习天数正确
- 点击笔记可进入卡片详情

### 验证方法
- curl 调 `/api/v1/memory/library`，返回数据结构正确
- 前端记忆库各项数据与后端返回一致
- 生成卡片后刷新记忆库，状态从"未生成"变为"记忆中"

---

## Phase 6：复习调度（预计 1.5h）

### 目标
实现复习记录接口和间隔重复算法，沉浸式复习可用。

### 步骤

**6.1 创建 scheduler.py**

新建 `backend/app/modules/memory/scheduler.py`，纯函数：

```python
def next_interval(current_interval_days: int, grade: str) -> int:
    """根据用户评分计算下次复习间隔"""

def next_due_at(now, current_interval_days: int, grade: str):
    """计算下次复习的具体时间"""
```

**6.2 实现 review 接口**

完善 `POST /api/v1/memory/cards/{cardId}/reviews`：

```python
@router.post("/cards/{cardId}/reviews")
def record_review(cardId: str, body: ReviewRequest, ...):
    # 1. 记录本次复习（review_records 表）
    # 2. 调用 scheduler 计算新 due_at
    # 3. 更新卡片的 due_at
    # 4. 返回更新后的卡片
```

> 注意：前端沉浸式复习已改为"上一张/查看答案/下一张"导航模式，不再用 again/hard/good/easy 评分。但后端评分接口仍需实现（一次浏览即记录复习，默认 grade 为 "good"）。

**6.3 调整复习逻辑**

由于前端改为了导航模式，后端复习接口需适配：

- 每次调用 review 接口 = 用户浏览了这张卡片的答案
- 默认 grade = "good"，间隔按标准算法递增
- 前端每翻一张调一次 review 接口

### 验证方法
- curl 调 review 接口，返回的 `dueAt` 正确更新
- 多次复习同一张卡片，间隔逐步增加
- 前端沉浸式复习功能正常，退出后记忆库进度更新

---

## Phase 7：前端切换真实 API（预计 1h）

### 目标
删除前端 mock 回退逻辑，所有数据走真实后端。

### 步骤

**7.1 删除 mock 回退**

编辑 `frontend/src/api/memory.js`，删除每个函数中的 catch 回退：

```js
// 删除前
export async function fetchMemoryCards(params) {
  try {
    return await apiRequest(...);
  } catch {
    return mockMemoryCardsResponse;  // ← 删除这行和 catch 块
  }
}

// 删除后
export async function fetchMemoryCards(params) {
  return apiRequest(...);
}
```

同理处理 `fetchMemoryLibrary`、`generateMemoryCards`。

**7.2 确保认证通过**

确认 `frontend/src/api/client.js` 中的 `ensureAuth()` 能正常获取 token（用默认账号 `student@example.com` 自动登录）。

后端需确认 `seed_data.py` 已执行，`student@example.com` 用户已存在。

**7.3 全流程测试**

从零开始走一个完整链路：

```
1. 打开记忆库 → 显示空列表或已有笔记
2. 点击 + 新建记忆 → 选笔记 → AI 解析过程 → 卡片预览
3. 选择周期 → 确认 → 回到记忆库
4. 点击该笔记 → 卡片管理页 → 编辑/删除/添加
5. 开始记忆 → 沉浸式复习 → 翻卡片 → 退出
6. 刷新记忆库 → 进度正确更新
```

### 验证方法
- 浏览器控制台无 404/500 错误
- Network 面板中所有 `/api/v1/memory/*` 请求返回真实数据
- 不再出现 mock 数据（如固定的"导数的定义是什么"）

---

## Phase 8：测试 + 收尾（预计 1h）

### 目标
写基本测试，修 bug，提交代码。

### 步骤

**8.1 写后端测试**

新建或扩展 `backend/tests/test_memory.py`：

```python
def test_create_card():
    """创建一张卡片，验证返回数据"""

def test_list_cards_filtered_by_note():
    """按笔记过滤卡片"""

def test_generate_cards_with_mock_llm():
    """用 mock LLM 生成卡片，验证返回 4 条"""

def test_scheduler_next_interval():
    """测试复习间隔算法"""

def test_library_aggregation():
    """测试记忆库聚合查询"""
```

**8.2 跑测试**

```bash
cd backend
python -m pytest tests/test_memory.py -v
```

**8.3 前端构建检查**

```bash
cd frontend
npm run build
```

确保无报错。

**8.4 生成种子数据**

更新 `backend/seed_data.py`，加入几条示例记忆卡片和复习记录，让前端演示时有数据可看。

**8.5 Git 提交**

```bash
git checkout g3-mty
git status
git add .
git commit -m "feat: 记忆模式全栈完成（数据库+后端+前端联调）"
git push origin g3-mty
```

### 验证方法
- 所有测试通过
- `npm run build` 无错误
- 前端全流程可用
- Git 提交日志清晰

---

## 附录 A：关键技术点速查

### A.1 怎么拿到当前用户 ID

```python
from app.core.auth import get_current_user

@router.get("/cards")
def xxx(user = Depends(get_current_user)):
    owner_id = user.id  # 当前登录用户的 ID
```

### A.2 怎么操作数据库

```python
from app.db.session import get_session

@router.get("/cards")
def xxx(session = Depends(get_session)):
    # 查询
    cards = session.query(MemoryCard).filter(...).all()
    # 创建
    card = MemoryCard(id=generate_id("card"), ...)
    session.add(card)
    session.commit()
```

### A.3 怎么返回统一格式

```python
# 单对象
return {"data": card_to_dict(card)}

# 列表
return {"data": [...], "pagination": {"page": 1, "pageSize": 20, "total": 10}}

# 错误
from app.core.errors import raise_not_found
raise_not_found("卡片不存在")
```

### A.4 怎么调 Mock LLM

```python
from app.integrations.llm import get_llm_provider

llm = get_llm_provider()  # 开发环境自动返回 mock
response = llm.chat("你的 prompt")
```

---

## 附录 B：文件清单（按开发顺序）

| Phase | 文件 | 操作 |
|---|---|---|
| 1 | `backend/app/modules/memory/models.py` | 只读，了解结构 |
| 1 | `backend/app/modules/memory/routes.py` | 只读 |
| 1 | `backend/app/modules/memory/service.py` | 只读 |
| 2 | `backend/app/modules/memory/models.py` | 编辑，补字段 |
| 2 | `backend/migrations/versions/xxxx.py` | 新建（Alembic 自动生成） |
| 3 | `backend/app/modules/memory/service.py` | 编辑，补 CRUD |
| 3 | `backend/app/modules/memory/routes.py` | 编辑，补接口 |
| 3 | `backend/app/schemas/memory.py` | 编辑，补 Pydantic |
| 4 | `backend/app/modules/memory/generator.py` | **新建** |
| 4 | `backend/app/modules/memory/routes.py` | 编辑，加 generate 路由 |
| 5 | `backend/app/modules/memory/library.py` | **新建** |
| 5 | `backend/app/modules/memory/routes.py` | 编辑，加 library 路由 |
| 6 | `backend/app/modules/memory/scheduler.py` | **新建** |
| 6 | `backend/app/modules/memory/routes.py` | 编辑，完善 review 接口 |
| 7 | `frontend/src/api/memory.js` | 编辑，删 mock 回退 |
| 8 | `backend/tests/test_memory.py` | **新建** |
