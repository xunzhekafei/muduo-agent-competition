# Muduo - AI 辅助学习平台

## 项目简介

**Muduo** 是一个 **AI 辅助学习平台**，目标是搭建一个完整学习工作流。

简单来说，这是一个帮助学生更好地学习和记忆的工具。

---

## 核心功能

### 四大核心模式

| 模式 | 说明 |
|------|------|
| **速记模式** | 快速记录课堂重点，支持录音跟进、时间流沉淀、快捷标签 |
| **思考模式** | AI 引导深度思考，苏格拉底式提问促进理解 |
| **记忆卡片** | 从笔记和资源中生成复习卡片，支持复习计划 |
| **费曼练习** | 用自己的话解释概念，系统给出追问和评估 |

### 三大支撑体系

| 体系 | 说明 |
|------|------|
| **资源转笔记** | 上传 PDF、图片、音频、视频等，系统解析生成结构化笔记 |
| **笔记管理** | 按课程、章节、知识点组织笔记，沉淀知识树和知识图谱 |
| **共享社区** | 共享优质笔记、思考链路、复习模板，支持收藏和引用 |

---

## 技术栈

### 前端
| 技术           | 版本     | 用途                  |
| ------------ | ------ | ------------------- |
| React        | 18.2.0 | 【骨架】前端界面框架          |
| Vite         | 5.0.8  | 【运行工具】前端「运行 + 构建工具」 |
| Tailwind CSS | 3.4.0  | 【化妆】页面外观样式框架        |
| React Router | 6.22.3 | 【导航】「页面跳转、导航」路由管理   |

### 后端
| 技术         | 版本     | 用途                                    |
| ---------- | ------ | ------------------------------------- |
| Python     | 3.11+  | 编程语言                                  |
| FastAPI    | 0.115+ | Python 写后端接口的 Web 框架                  |
| SQLAlchemy | 2.0+   | ORM——把 Python 代码自动翻译成 SQL 代码，交给数据库执行】 |
| Alembic    | 1.13+  | 管理数据库结构 ：建表、改表、版本控制                   |

---

## 项目结构

```
Muduo-notes-v1/
├── frontend/                        # ========== 前端应用 ==========
│   ├── dist/                       # 构建产物目录（npm run build输出）
│   ├── src/
│   │   ├── api/                    # API封装（与后端通信）
│   │   ├── app/                    # 应用入口+路由配置
│   │   ├── features/               # 业务功能模块（10个）
│   │   ├── layouts/                 # 布局组件
│   │   ├── mocks/                   # Mock数据
│   │   ├── pages/                  # 页面组件（路由入口）
│   │   ├── shared/                 # 共享组件和常量
│   │   ├── styles/                 # 全局样式
│   │   ├── main.jsx                # 前端入口
│   │   └── README.md               # 前端说明文档
│   ├── index.html                  # HTML入口
│   ├── package.json                # 前端依赖
│   ├── vite.config.js              # Vite构建配置
│   ├── tailwind.config.js          # Tailwind配置
│   └── BACKEND_API_FOR_FRONTEND.md # API参考文档
│
├── backend/                         # ========== 后端应用 ==========
│   ├── app/
│   │   ├── api/v1/                 # API路由层（版本1）
│   │   ├── core/                   # 核心基础设施（认证/配置/错误处理等）
│   │   ├── db/                     # 数据库层（ORM/模型/会话）
│   │   ├── integrations/           # 外部服务集成（LLM/OCR/ASR等）
│   │   ├── modules/                # 业务模块（12个）
│   │   ├── schemas/                # Pydantic数据模型
│   │   ├── services/               # 跨模块工作流编排
│   │   ├── workers/                # 异步任务处理器
│   │   └── main.py                 # FastAPI应用入口
│   ├── migrations/                 # Alembic数据库迁移
│   │   └── versions/               # 迁移版本历史
│   ├── tests/                      # 测试文件
│   ├── alembic.ini                 # Alembic配置
│   ├── pyproject.toml              # Python项目配置
│   └── seed_data.py                # 数据初始化脚本
│
├── contracts/                       # ========== API契约 ==========
│   ├── openapi.yaml                # OpenAPI规范（接口文档）
│   ├── enums.md                    # 枚举定义
│   ├── errors.md                   # 错误码定义
│   └── events.md                   # 事件定义
│
├── docs/                            # ========== 项目文档 ==========
│   ├── architecture/                # 架构文档
│   │   ├── backend-overview.md
│   │   ├── database.md
│   │   ├── cross-module-workflows.md
│   │   └── backend-beginner-guide.md
│   ├── api/                        # API文档
│   │   ├── backend-api-guide.md
│   │   └── resource-note-workflow.md
│   ├── adr/                        # 架构决策记录
│   │   └── 0001-external-provider-abstraction.md
│   └── product/
│       └── feature-map.md          # 功能地图
│
├── infra/                           # ========== 基础设施 ==========
│   ├── docker/
│   │   └── backend.Dockerfile      # 后端Docker镜像
│   └── nginx/
│       └── muduo.conf              # Nginx配置
│
├── scripts/                         # ========== 开发脚本 ==========
│   ├── backend_dev.sh              # 后端开发启动脚本
│   └── backend_check.sh            # 后端检查脚本
│
├── .env.example                     # 环境变量示例
├── .gitignore                       # Git忽略配置
├── README.md                        # 项目主文档
├── BUILD.md                         # 构建规范
├── CONTRIBUTING.md                  # 贡献指南
├── Makefile                         # Make命令集合
├── docker-compose.dev.yml           # Docker开发环境
├── old_plan/                        # 历史计划、旧分工和旧协作资料
└── ai_space/                        # AI过程文档和接手梳理报告
```

### 前端目录 (`frontend/`)

```
frontend/
├── dist/                              # 构建输出目录
│   └── index.html
├── src/
│   ├── api/                           # API封装和客户端
│   │   ├── client.js                  # HTTP客户端配置
│   │   ├── community.js               # 社区模块API
│   │   ├── courses.js                 # 课程模块API
│   │   ├── dashboard.js               # 仪表盘API
│   │   ├── feynman.js                 # 费曼模式API
│   │   ├── index.js                   # API统一导出
│   │   ├── memory.js                  # 记忆模式API
│   │   ├── notes.js                   # 笔记模块API
│   │   ├── thinking.js               # 思考模式API
│   │   └── users.js                   # 用户模块API
│   ├── app/                           # 应用入口
│   │   └── App.jsx                    # 根组件+路由配置
│   ├── features/                      # 业务功能模块
│   │   ├── community/
│   │   │   └── Community.jsx          # 共享社区
│   │   ├── courses/
│   │   │   └── Courses.jsx           # 课程管理
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx          # 学习仪表盘
│   │   ├── feynman/
│   │   │   └── FeynmanMode.jsx       # 费曼练习
│   │   ├── memory/
│   │   │   └── MemoryMode.jsx        # 记忆卡片
│   │   ├── note-management/           # 笔记管理（子模块较多）
│   │   │   ├── AIAsidePanel.jsx      # AI辅助面板
│   │   │   ├── FileExplorer.jsx      # 文件浏览器
│   │   │   ├── KnowledgeTree.jsx     # 知识树
│   │   │   ├── NoteDetail.jsx        # 笔记详情
│   │   │   ├── NoteList.jsx          # 笔记列表
│   │   │   ├── NoteManagement.jsx    # 笔记管理主页
│   │   │   └── NoteWorkspace.jsx     # 笔记编辑工作区
│   │   ├── quick-notes/
│   │   │   └── QuickNotes.jsx        # 速记模式
│   │   ├── resource-notes/
│   │   │   └── ResourceToNotes.jsx   # 资源转笔记
│   │   ├── settings/
│   │   │   └── Settings.jsx           # 系统设置
│   │   └── thinking/
│   │       └── ThinkingMode.jsx      # 思考模式
│   ├── layouts/                       # 布局组件
│   │   ├── Layout.jsx                 # 主布局
│   │   ├── Sidebar.jsx                # 侧边栏
│   │   └── Topbar.jsx                 # 顶部栏
│   ├── mocks/                         # Mock数据
│   │   ├── index.js                   # Mock配置
│   │   └── mockData.jsx               # 模拟数据
│   ├── pages/                         # 页面级组件
│   │   ├── CommunityPage.jsx
│   │   ├── CoursesPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── FeynmanModePage.jsx
│   │   ├── MemoryModePage.jsx
│   │   ├── NoteManagementPage.jsx
│   │   ├── QuickNotesPage.jsx
│   │   ├── ResourceToNotesPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── ThinkingModePage.jsx
│   ├── shared/                        # 共享组件和常量
│   │   ├── components/                # 共享UI组件
│   │   │   ├── BarChart.jsx           # 柱状图
│   │   │   ├── FilePicker.jsx         # 文件选择器
│   │   │   ├── KnowledgeGraphCard.jsx # 知识图谱卡片
│   │   │   ├── Logo.jsx               # Logo组件
│   │   │   ├── ModeCard.jsx           # 模式卡片
│   │   │   ├── NoteCard.jsx           # 笔记卡片
│   │   │   ├── SaveFolderPicker.jsx   # 保存文件夹选择器
│   │   │   ├── StatCard.jsx           # 统计卡片
│   │   │   ├── StatCardLarge.jsx      # 大统计卡片
│   │   │   ├── TaskCard.jsx           # 任务卡片
│   │   │   └── index.js               # 统一导出
│   │   └── constants.js               # 全局常量
│   ├── styles/                        # 全局样式
│   │   └── index.css                  # Tailwind入口样式
│   ├── main.jsx                       # 前端入口
│   └── README.md                      # 本目录说明文档
├── BACKEND_API_FOR_FRONTEND.md        # 后端API文档
├── index.html                         # HTML入口
├── package.json                       # 依赖配置
├── package-lock.json                  # 依赖锁定
├── postcss.config.js                  # PostCSS配置
├── tailwind.config.js                 # Tailwind配置
└── vite.config.js                     # Vite配置
```

### 后端目录 (`backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI应用入口
│   ├── api/                         # API路由层
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py            # 路由聚合
│   │       └── routes.py            # 系统路由
│   ├── core/                        # 核心基础设施
│   │   ├── __init__.py
│   │   ├── auth.py                  # JWT认证
│   │   ├── config.py                # 配置管理
│   │   ├── errors.py                # 错误处理
│   │   ├── logging.py               # 日志配置
│   │   ├── middleware.py            # 中间件
│   │   ├── responses.py             # 统一响应格式
│   │   └── security.py              # 安全工具
│   ├── db/                          # 数据库层
│   │   ├── __init__.py
│   │   ├── base.py                  # SQLAlchemy基类
│   │   ├── ids.py                   # ID生成策略
│   │   ├── mixins.py                # 模型混入
│   │   ├── models.py                # 模型聚合导出
│   │   ├── session.py               # 数据库会话
│   │   └── types.py                 # 自定义类型
│   ├── integrations/                # 外部服务集成
│   │   ├── __init__.py
│   │   ├── asr.py                   # 语音识别
│   │   ├── embedding.py             # 文本嵌入
│   │   ├── llm.py                   # 大语言模型
│   │   ├── ocr.py                   # 文字识别
│   │   ├── registry.py              # 服务注册中心
│   │   └── storage.py               # 对象存储
│   ├── modules/                      # 业务模块
│   │   ├── ai_tasks/                # AI任务管理
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── auth/                    # 认证模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── community/               # 社区模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── README.md
│   │   │   ├── repository.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── courses/                 # 课程模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── dashboard/               # 仪表盘模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── feynman/                 # 费曼练习模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── repository.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── import_export/           # 导入导出模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── README.md
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── knowledge_graph/         # 知识图谱模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── repository.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── memory/                  # 记忆卡片模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── repository.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── notes/                   # 笔记模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── repository.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── resources/               # 资源管理模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   ├── thinking/                # 思考模式模块
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── repository.py
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   └── users/                   # 用户模块
│   │       ├── __init__.py
│   │       ├── models.py
│   │       ├── routes.py
│   │       └── service.py
│   ├── schemas/                      # Pydantic数据模型
│   │   ├── __init__.py
│   │   ├── ai_tasks.py
│   │   ├── auth.py
│   │   ├── common.py
│   │   ├── community.py
│   │   ├── courses.py
│   │   ├── dashboard.py
│   │   ├── enums.py
│   │   ├── feynman.py
│   │   ├── import_export.py
│   │   ├── knowledge_graph.py
│   │   ├── memory.py
│   │   ├── notes.py
│   │   ├── resources.py
│   │   ├── thinking.py
│   │   ├── users.py
│   │   └── workflows.py
│   ├── services/                     # 跨模块服务编排
│   │   ├── __init__.py
│   │   ├── resource_note_workflow.py # 资源转笔记工作流
│   │   └── routes.py
│   └── workers/                      # 异步任务处理器
│       ├── __init__.py
│       ├── handlers.py
│       ├── models.py
│       └── registry.py
├── migrations/                        # Alembic数据库迁移
│   ├── README.md
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 0001_initial_chaiyifan_models.py
│       ├── 0002_zhangyuxuan_learning_modules.py
│       ├── 0003_extend_note_block_types.py
│       ├── 0004_add_note_mastery.py
│       ├── 0005_learning_activities.py
│       └── 0006_study_logs.py
├── tests/                            # 测试文件
│   ├── test_ai_tasks_api.py
│   ├── test_auth_users_api.py
│   ├── test_core.py
│   ├── test_courses_api.py
│   ├── test_database_models.py
│   ├── test_integrations.py
│   ├── test_knowledge_community_workers.py
│   ├── test_notes_memory.py
│   ├── test_resource_workflows_api.py
│   ├── test_resources_import_export_api.py
│   └── test_thinking_feynman.py
├── alembic.ini                       # Alembic配置
├── pyproject.toml                    # Python项目配置
└── seed_data.py                      # 数据初始化脚本
```

---

### 关键文件说明

| 文件                             | 功能                |
| ------------------------------ | ----------------- |
| `frontend/src/main.jsx`        | 前端入口，初始化React应用   |
| `frontend/src/App.jsx`         | 根组件，路由配置          |
| `backend/app/main.py`          | 后端入口，创建FastAPI应用  |
| `backend/app/core/config.py`   | 配置管理（环境变量、数据库连接等） |
| `backend/app/db/base.py`       | SQLAlchemy基础模型    |
| `backend/app/api/v1/router.py` | API版本路由聚合         |

---

## 启动方式

### 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖（首次运行或依赖变更后）
npm install

# 3. 启动开发服务器
npm run dev

```

### 后端启动

配置Python解释器：选择 Python 3.11+ 的版本
```bash
cd backend
pip install -e ".[dev]"  # 安装项目依赖
alembic upgrade head   # 数据库迁移
uvicorn app.main:app --reload --port 8000  # 启动服务，测试：http://localhost:8000/docs
```


## 常用命令

### 前端命令

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

### 后端命令

| 命令 | 说明 |
|------|------|
| `pip install -e ".[dev]"` | 安装依赖（包含开发依赖） |
| `alembic upgrade head` | 执行数据库迁移 |
| `alembic current` | 查看当前迁移版本 |
| `alembic history` | 查看迁移历史 |
| `alembic revision --autogenerate -m "描述"` | 创建新迁移 |
| `uvicorn app.main:app --reload` | 启动开发服务器 |
| `pytest` | 运行测试 |

---

## 数据初始化

### 创建默认用户

```bash
cd backend
python seed_data.py
```

这会创建：
- 开发测试账号 `dev@muduo.local`
- 示例课程和笔记数据

---

## Mock 数据说明

**什么是 Mock 数据？**

Mock 数据是在前后端联调之前，前端使用假的模拟数据来开发和测试界面功能。

**为什么需要 Mock？**

```
前端开发速度快，后端 API 还没完成
    ↓
前端无法进行接口联调
    ↓
使用 Mock 数据先开发 UI
```

**项目中的 Mock 位置**：
- `frontend/src/mocks/mockData.jsx` - 模拟数据定义
- `frontend/src/mocks/index.js` - Mock 开关配置

---

## 开发建议

### 1. 先跑通项目

按照「快速启动」步骤，确保前后端都能正常启动。

### 2. 熟悉代码结构

```
前端代码入口：frontend/src/main.jsx
    ↓
App.jsx（路由配置）
    ↓
pages/（页面入口）
    ↓
features/（具体功能实现）
```

```
后端代码入口：backend/app/main.py
    ↓
router.py（路由聚合）
    ↓
modules/模块名/routes.py（具体接口）
    ↓
modules/模块名/service.py（业务逻辑）
```

### 3. 从简单模块入手

推荐顺序：
1. `users` 模块 - 用户管理，最简单
2. `courses` 模块 - 课程管理
3. `notes` 模块 - 笔记管理
4. `memory/thinking/feynman` - 核心功能

### 4. 阅读文档

| 文档 | 位置 | 说明 |
|------|------|------|
| API 文档 | `frontend/BACKEND_API_FOR_FRONTEND.md` | 接口说明 |
| 架构文档 | `docs/architecture/` | 后端架构说明 |
| 产品功能 | `docs/product/feature-map.md` | 功能地图 |
| 构建规范 | `BUILD.md` | 开发规范 |

---

## 常见问题

### Q1：端口被占用

```bash
# 后端换一个端口
uvicorn app.main:app --reload --port 8001

# 前端端口通常不需要改，Vite 会自动选择可用端口
```

### Q2：数据库迁移失败

```bash
# 删除数据库文件，重新迁移
rm backend/muduo_dev.sqlite3
alembic upgrade head
```

### Q3：找不到模块

确保在 `backend` 目录下执行命令，且虚拟环境已激活。

### Q4：前端无法请求后端

检查 `.env` 或 `.env.local` 文件：

```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## 目录职责总结

| 目录 | 职责 | 关键文件 |
|------|------|----------|
| `frontend/src/api/` | 与后端通信 | `client.js`（统一拦截器） |
| `frontend/src/features/` | 业务功能实现 | 各功能模块的 JSX |
| `frontend/src/pages/` | 页面入口 | 路由对应的页面 |
| `backend/app/core/` | 核心基础设施 | config、auth、errors |
| `backend/app/modules/` | 业务模块 | 各模块的 CRUD |
| `backend/app/schemas/` | 数据验证 | 请求/响应模型 |
| `contracts/` | 接口规范 | `openapi.yaml` |

---

## 下一步

- 阅读 [BUILD.md](./BUILD.md) 了解开发规范
- 阅读 [docs/architecture/backend-overview.md](./docs/architecture/backend-overview.md) 了解后端架构
- 阅读 [frontend/BACKEND_API_FOR_FRONTEND.md](./frontend/BACKEND_API_FOR_FRONTEND.md) 了解 API 接口
