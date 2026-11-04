# Muduo 后端入门指南 — 从零理解后端如何工作

本文档面向**第一次接触后端开发的小白**。不要求任何后端经验，只需要会基本的 Python 语法。读完你会理解：后端是什么、这个项目的后端怎么跑起来的、每个文件夹是干什么的、以及怎么动手写一个属于自己的接口。

---

## 一、后端是什么？它在前端和数据库之间做什么？

用一个日常比喻：

```
你（用户）在网页上点"新建笔记"
        ↓
     前端（React）
   "我要创建一个笔记！"  →  发一个 HTTP 请求给后端
        ↓
     后端（FastAPI）
   "收到。笔记标题是 xxx，用户是 yyy，让我存进数据库"
        ↓
     数据库（SQLite）
   "存好了，这是这条笔记的编号"
        ↓
     后端 → 前端
   "搞定了，这是你刚创建的笔记数据"
        ↓
     前端更新页面，你看到新笔记出现了
```

**后端就是前端的"服务员"**——前端说要什么，后端去数据库里取或存，然后把结果还给前端。后端本身不画界面，只处理数据和逻辑。

---

## 二、你需要知道的三个基础概念

不用学很深，理解这三个概念就够用了。

### 2.1 HTTP 请求和响应

前后端通过 HTTP 协议通信，就像写信：

```
前端发的"信"（请求）：
POST /api/v1/notes
Content-Type: application/json

{
  "title": "我的笔记",
  "courseId": "course_001"
}

后端回的"信"（响应）：
200 OK
Content-Type: application/json

{
  "data": {
    "id": "note_xxx",
    "title": "我的笔记",
    "status": "active"
  }
}
```

常见的请求类型（HTTP 方法）：

| 方法 | 含义 | 例子 |
|---|---|---|
| GET | 查数据 | 获取笔记列表 |
| POST | 新建数据 | 创建一篇新笔记 |
| PATCH | 修改数据 | 改笔记标题 |
| DELETE | 删除数据 | 删掉一篇笔记 |

### 2.2 数据库和表

**数据库就是一个 Excel 文件**，里面有很多张表（Sheet）。

比如 `notes` 表长这样：

| id | title | owner_id | status | created_at |
|---|---|---|---|---|
| note_001 | 高等数学笔记 | user_001 | active | 2026-06-01 |
| note_002 | 数据结构复习 | user_001 | draft | 2026-06-02 |

每一行叫一条"记录"，每一列叫一个"字段"。

**后端的工作就是把这些行读出来、改一改、或者插新行进去。**

### 2.3 ORM：不用写 SQL，用 Python 操作数据库

正常情况下操作数据库要用 SQL 语言：

```sql
SELECT * FROM notes WHERE owner_id = 'user_001';
```

但 Muduo 用了 **SQLAlchemy ORM**，让你用 Python 类来操作数据库：

```python
# 和上面那条 SQL 完全等价，但是 Python 写的
notes = session.query(NoteModel).filter(NoteModel.owner_id == "user_001").all()
```

注意 `NoteModel` 不是数据库表本身，而是它的"镜像"——一个 Python 类，属性名对应表中的列名。你改 Python 对象，SQLAlchemy 自动翻译成 SQL 发给数据库。

---

## 三、一条请求在后端是怎么走的（请求生命周期）

以"用户创建一篇笔记"为例，从头到尾追踪：

```
POST /api/v1/notes  ← 前端发来的请求

1. main.py（入口）
   FastAPI 应用接收到请求，交给路由系统

2. api/v1/router.py（路由分发）
   匹配到路径 /api/v1/notes → 转发给 notes 模块

3. modules/notes/routes.py（具体接口）
   @router.post("/")  ← 这个函数被调用

   函数做的事：
   a) 从请求体里取出 title、courseId
   b) 校验用户身份（core/auth.py）
   c) 调用 service.create_note(title, courseId, user.id)
   d) 把结果包成 {"data": {...}} 返回

4. modules/notes/service.py（业务逻辑）
   def create_note(title, course_id, owner_id):
       note = NoteModel(            ← 创建 Python 对象
           id=generate_id("note"),
           title=title,
           owner_id=owner_id,
           ...
       )
       session.add(note)            ← 标记为"待保存"
       session.commit()             ← 真正写入数据库
       return note

5. db/session.py（数据库连接）
   session.commit() → SQLAlchemy 生成 INSERT SQL → 发给 SQLite
```

**你只需要关注第 3 和第 4 步**——写 `routes.py` 和 `service.py`。其他的（入口、路由分发、数据库连接）已经写好了，直接用就行。

---

## 四、项目后端架构详解

### 4.1 分层架构图

```
backend/app/
│
├── main.py                    ← 🚪 大门：FastAPI 应用启动
│
├── api/v1/                    ← 🧭 导航：URL 路由
│   ├── router.py              ← 把所有模块的路由拼在一起
│   └── routes.py              ← 系统级路由（健康检查等）
│
├── core/                      ← 🔧 工具箱：通用能力
│   ├── config.py              ← 读环境变量、配置
│   ├── auth.py                ← 用户登录、JWT 验证
│   ├── errors.py              ← 错误处理
│   ├── security.py            ← 密码加密等
│   └── responses.py           ← 统一响应格式 {"data": ...}
│
├── modules/                   ← 📦 业务模块（核心！你要写的就是这里）
│   ├── auth/                  ← 登录、注册
│   ├── users/                 ← 用户资料
│   ├── courses/               ← 课程管理
│   ├── notes/                 ← 笔记（速记也复用这个模块）
│   ├── memory/                ← 记忆卡片
│   ├── thinking/              ← 思考模式
│   ├── feynman/               ← 费曼练习
│   ├── knowledge_graph/       ← 知识图谱
│   ├── community/             ← 共享社区
│   ├── resources/             ← 资源管理
│   ├── import_export/         ← 导入导出
│   ├── ai_tasks/              ← AI 异步任务
│   └── dashboard/             ← 学习仪表盘
│
├── db/                        ← 🗄️ 数据库层
│   ├── base.py                ← 所有模型的基类
│   ├── session.py             ← 数据库连接管理
│   ├── models.py              ← 所有模型的汇总入口
│   ├── ids.py                 ← ID 生成规则（note_xxx 这种）
│   └── types.py               ← 自定义数据类型
│
├── schemas/                   ← 📋 数据形状定义（Pydantic）
│   ├── notes.py               ← 笔记的请求/响应格式
│   ├── memory.py              ← 记忆卡片的格式
│   └── ...
│
├── services/                  ← 🔗 跨模块编排
│   ├── resource_note_workflow.py  ← 资源转笔记工作流
│   └── summarizer.py              ← 速记 AI 总结（待开发）
│
├── integrations/              ← 🌐 外部服务
│   ├── llm.py                 ← 大语言模型（通义千问/OpenAI）
│   ├── asr.py                 ← 语音识别
│   ├── ocr.py                 ← 图片文字识别
│   ├── embedding.py           ← 文本向量化
│   └── storage.py             ← 文件存储（OSS/S3）
│
└── workers/                   ← ⚙️ 后台任务
    ├── handlers.py            ← 具体任务的处理函数
    ├── registry.py            ← 任务注册中心
    └── models.py              ← 任务数据模型
```

### 4.2 每个层的职责（一句话）

| 层 | 文件夹 | 一句话 | 类比 |
|---|---|---|---|
| 入口 | `main.py` + `api/` | 接收 HTTP 请求，分发给对应的模块 | 公司前台 |
| 核心 | `core/` | 提供认证、配置、错误处理等共用能力 | 公司行政部 |
| 业务 | `modules/` | 每个模块处理一类业务（笔记、记忆、课程...） | 各业务部门 |
| 数据 | `db/` | 管理数据库连接，定义表结构 | 档案室 |
| 形状 | `schemas/` | 定义请求和响应的数据格式 | 表格模板 |
| 编排 | `services/` | 串联多个模块完成复杂流程 | 项目经理 |
| 外部 | `integrations/` | 调 AI、语音识别等外部服务 | 外包供应商 |
| 后台 | `workers/` | 处理耗时任务，不阻塞用户请求 | 夜班员工 |

### 4.3 每个模块内部的统一结构

每个 `modules/xxx/` 文件夹都遵循相同的结构，以 `notes` 为例：

```
modules/notes/
├── __init__.py      ← 空文件，标识这是一个 Python 包
├── models.py        ← 数据库表结构（SQLAlchemy 模型）
├── routes.py        ← HTTP 接口（FastAPI router）
├── service.py       ← 业务逻辑（被 routes.py 调用）
└── repository.py    ← 数据库查询封装（被 service.py 调用）
```

**调用链永远是单向的**：

```
routes.py  →  service.py  →  repository.py  →  数据库
（接请求）     （做判断）      （查数据）
```

不会反过来。routes 不直接碰数据库，service 不直接处理 HTTP 请求。

### 4.4 一个完整模块的代码示例

假设你要在 notes 模块里加一个"获取笔记列表"的接口，三层的代码大概是这样的：

**models.py** — 定义表结构（已有，不用写）

```python
class NoteModel(Base):
    __tablename__ = "notes"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    owner_id = Column(String, nullable=False)
    status = Column(String, default="active")
```

**service.py** — 业务逻辑

```python
def list_notes(session, owner_id, page=1, page_size=20):
    query = session.query(NoteModel).filter(
        NoteModel.owner_id == owner_id,
        NoteModel.deleted_at.is_(None),  # 不显示已删除的
    )
    total = query.count()
    items = query.offset((page-1)*page_size).limit(page_size).all()
    return items, total
```

**routes.py** — HTTP 接口

```python
@router.get("/")
def list_notes(
    page: int = 1,
    page_size: int = 20,
    user = Depends(get_current_user),    # 自动校验登录
    session = Depends(get_session),       # 自动创建数据库连接
):
    items, total = list_notes(session, user.id, page, page_size)
    return {
        "data": [format_note(n) for n in items],
        "pagination": {"page": page, "pageSize": page_size, "total": total},
    }
```

这个模式每个模块都一样，学会一个就全会了。

---

## 五、数据库相关：模型怎么变成表

### 5.1 SQLAlchemy 模型就是表的蓝图

```python
# 写在 models.py 里
class NoteModel(Base):
    __tablename__ = "notes"          # 对应数据库里的 notes 表

    id = Column(String, primary_key=True)   # id 列，主键
    title = Column(String)                  # title 列，字符串
    owner_id = Column(String)               # owner_id 列
    created_at = Column(DateTime)           # 创建时间列
```

这个类一定义，SQLAlchemy 就知道数据库里应该有一张结构完全相同的 `notes` 表。

### 5.2 Alembic 迁移：改表结构的版本控制

当你修改了 `models.py`（比如加了一个新字段 `note_type`），数据库不会自动跟着变。你需要建一个"迁移"来告诉数据库怎么改：

```bash
cd backend

# 1. 自动检测 models.py 的变化，生成迁移文件
alembic revision --autogenerate -m "add note_type to notes"

# 2. 执行迁移，真正修改数据库
alembic upgrade head
```

迁移文件存在 `backend/migrations/versions/` 里，按编号排列（`0001_xxx.py`, `0002_xxx.py`...）。它是数据库结构的版本历史，就像 Git 对代码一样。

### 5.3 主键 ID 的格式

这个项目的主键不用自增数字，而是有意义的字符串：

```
user_3f8a2b1c7d4e    ← user_ 前缀 + 12位随机字符
note_a1b2c3d4e5f6    ← note_ 前缀
card_7d2e9a5f1b6c    ← card_ 前缀
task_1b6c8e3d0f2a    ← task_ 前缀
```

生成方式在 `backend/app/db/ids.py` 里已经封装好了：

```python
from app.db.ids import generate_id
new_id = generate_id("note")  # → "note_a1b2c3d4e5f6"
```

### 5.4 软删除

项目不物理删除数据，而是标记 `deleted_at` 字段：

```python
# "删除" 操作
note.deleted_at = datetime.utcnow()
session.commit()

# 查询时过滤掉已删除的
session.query(NoteModel).filter(NoteModel.deleted_at.is_(None))
```

这样数据不会丢，误删了可以恢复。

---

## 六、如何启动后端并验证

### 6.1 首次启动

```bash
cd D:\Muduo\Muduo-notes-v1\backend

# 1. 安装 Python 依赖
pip install -e ".[dev]"

# 2. 执行数据库迁移（创建表）
alembic upgrade head

# 3. 初始化测试数据
python seed_data.py

# 4. 启动服务
uvicorn app.main:app --reload --port 8000
```

看到这行说明启动成功：

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 6.2 验证接口

浏览器打开 `http://localhost:8000/docs` → FastAPI 自动生成的 Swagger 文档页面，可以在网页上直接测试每个接口：

- 点开一个接口
- 点 "Try it out"
- 填参数
- 点 "Execute"
- 看返回结果

### 6.3 运行测试

```bash
cd backend
python -m pytest tests/ -v
```

---

## 七、你作为新手怎么上手

### 推荐学习路径

```
第 1 步：跑通后端（启动 → 打开 /docs → Try it out 玩一玩）
        ↓
第 2 步：打开 backend/app/modules/notes/routes.py，读一个最简单的接口
        理解 @router.get("/") 在做什么
        ↓
第 3 步：打开 backend/app/modules/notes/service.py，看业务逻辑怎么写
        ↓
第 4 步：打开 backend/app/modules/notes/models.py，看表结构怎么定义
        ↓
第 5 步：试着在 notes 模块里加一个最简单的接口，比如
        GET /api/v1/notes/count → 返回笔记总数
        ↓
第 6 步：运行 pytest 验证你的代码
```

### 不会的时候去哪找答案

| 问题 | 去哪里看 |
|---|---|
| FastAPI 语法怎么写 | `backend/app/modules/notes/routes.py`（照抄） |
| 数据库查询怎么写 | `backend/app/modules/notes/service.py`（照抄） |
| 表结构怎么定义 | `backend/app/modules/notes/models.py`（照抄） |
| 错误处理怎么写 | `backend/app/core/errors.py` |
| 认证怎么加 | `backend/app/core/auth.py` + routes.py 里的 `Depends(get_current_user)` |
| 这个错误码是什么意思 | `contracts/errors.md` |
| 接口字段怎么定义 | `contracts/openapi.yaml` + `backend/app/schemas/` |

**最好的老师是项目里已有的代码。** notes 模块是写得最完整的，你想加什么功能，先在 notes 里找类似的实现，改一改就行。

---

## 八、常见疑问

### Q：FastAPI 是什么？

一个 Python 的 Web 框架，帮你把 Python 函数变成 HTTP 接口。你写一个普通函数，加个 `@router.get("/")` 装饰器，它就变成了一个可以通过浏览器访问的 API。

### Q：Pydantic 是什么？

数据校验库。你定义一个类，FastAPI 自动校验前端发来的 JSON 是否符合这个类的格式。不符合就返回 422 错误，不用你手写校验代码。

### Q：SQLAlchemy 是什么？

ORM（对象关系映射）。让你用 Python 类操作数据库，不用写 SQL。`session.query(NoteModel).filter(...)` 会被自动翻译成 `SELECT ... FROM notes WHERE ...`。

### Q：Alembic 是什么？

数据库迁移工具。记录数据库结构的每一次变化（加表、加字段、改类型），像 Git 一样可以升级和回滚。

### Q：为什么每个模块都有 routes / service / models 三个文件？

这叫"分层架构"，每层只管自己的事：
- `models.py` 只管"表长什么样"
- `service.py` 只管"业务逻辑怎么做"
- `routes.py` 只管"HTTP 请求怎么接"

改数据库结构只改 models，改业务规则只改 service，改接口路径只改 routes。互不影响。
