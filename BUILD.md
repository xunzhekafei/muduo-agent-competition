# Muduo 构建指南

本文档定义 Muduo 的目标项目结构、开发规则和协作流程。它的目标是让人类开发者或 AI 编码代理在没有隐藏上下文的情况下，也能继续推进开发。

## 项目目标

Muduo 是一个 AI 辅助学习平台。产品应从当前的前端演示逐步演进为一个真实的全栈应用，并包含：

- 资源转笔记
- 课堂快速笔记
- 带AI引导的思考模式
- 记忆卡片和复习计划
- 费曼解释练习
- 笔记管理、知识树、双链关系和知识图谱
- 共享社区、内容复用和 UGC 学习资产
- 学习仪表盘和学习数据

本项目应作为一个可维护的产品来建设，而不是短期演示项目。

## 团队形态

预期开发团队为：

- MaTianyi：前端开发
- ChaiYifan：后端开发
- ZhangYuxuan：后端开发

使用 monorepo。将前端、后端、API 契约、文档、基础设施和脚本放在同一个仓库中，便于团队保持接口和部署行为一致。

### 人员分工

按文件夹设置主负责人。主负责人负责该目录的设计一致性、代码审查关注点和后续维护；跨负责人目录改动时，应先同步接口、契约和迁移影响。

| 文件夹 | 主负责人 | 说明 |
| --- | --- | --- |
| `frontend/` | MaTianyi | 前端工程、构建配置和前端依赖。 |
| `frontend/src/app/` | MaTianyi | 应用初始化、路由、providers。 |
| `frontend/src/layouts/` | MaTianyi | 页面外壳、侧边栏、顶部栏等布局组件。 |
| `frontend/src/pages/` | MaTianyi | 路由级页面组合。 |
| `frontend/src/features/dashboard/` | MaTianyi | 学习仪表盘前端功能。 |
| `frontend/src/features/resource-notes/` | MaTianyi | 资源转笔记前端功能。 |
| `frontend/src/features/quick-notes/` | MaTianyi | 快速笔记前端功能。 |
| `frontend/src/features/note-management/` | MaTianyi | 我的笔记、知识树、双链关系和笔记管理前端功能。 |
| `frontend/src/features/thinking/` | MaTianyi | 思考模式前端功能。 |
| `frontend/src/features/memory/` | MaTianyi | 记忆卡片和复习计划前端功能。 |
| `frontend/src/features/feynman/` | MaTianyi | 费曼练习前端功能。 |
| `frontend/src/features/community/` | MaTianyi | 共享社区、收藏引用和内容复用前端功能。 |
| `frontend/src/features/settings/` | MaTianyi | 系统设置、用户偏好和通知配置前端功能。 |
| `frontend/src/features/simple-notes/` | MaTianyi | 简易笔记编辑器（Block 编辑器及 6 种 Block 组件）。 |
| `frontend/src/features/time-tree/` | MaTianyi | 时间树笔记视图。 |
| `frontend/src/features/auth/` | MaTianyi | 登录组件。 |
| `frontend/src/api/` | MaTianyi | 前端 API wrapper；接口形状必须以 `contracts/` 为准。 |
| `frontend/src/mocks/` | MaTianyi | 前端 mock 数据和 mock 服务。 |
| `frontend/src/shared/` | MaTianyi | 前端可复用组件、hooks、常量和工具函数。 |
| `frontend/src/styles/` | MaTianyi | 全局样式和 Tailwind 相关样式组织。 |
| `backend/app/core/` | ChaiYifan | 后端配置、日志、认证基础能力、错误和中间件。 |
| `backend/app/api/` | ChaiYifan | HTTP 路由注册、版本化 routers 和 API 入口组织。 |
| `backend/app/db/` | ChaiYifan | 数据库 session、基础模型和 repository helpers。 |
| `backend/app/schemas/` | ChaiYifan | 共享请求/响应 schemas。 |
| `backend/app/services/` | ChaiYifan | 跨模块业务服务、资源转笔记工作流和服务编排。 |
| `backend/app/integrations/` | ChaiYifan | LLM、OCR、ASR、Embedding 和对象存储 provider 抽象与 mock provider。 |
| `backend/app/modules/auth/` | ChaiYifan | 登录、token refresh、密码和 session 处理。 |
| `backend/app/modules/users/` | ChaiYifan | 用户资料和偏好设置。 |
| `backend/app/modules/courses/` | ChaiYifan | 课程、学科和学习空间。 |
| `backend/app/modules/resources/` | ChaiYifan | 上传文件、资源解析结果和来源元数据。 |
| `backend/app/modules/import_export/` | ChaiYifan | 导入导出、格式转换和任务结果管理。 |
| `backend/app/modules/ai_tasks/` | ChaiYifan | 异步 AI 任务生命周期、状态轮询和 OpenAI 兼容请求入口预留。 |
| `backend/migrations/` | ChaiYifan | 数据库迁移脚本和迁移策略。 |
| `backend/app/workers/` | ZhangYuxuan | 异步任务处理器和后台任务执行逻辑。 |
| `backend/app/modules/notes/` | ZhangYuxuan | 笔记、笔记块、标签和引用。 |
| `backend/app/modules/memory/` | ZhangYuxuan | 记忆卡片、复习记录和间隔重复。 |
| `backend/app/modules/thinking/` | ZhangYuxuan | AI 引导的笔记修正和苏格拉底式提示。 |
| `backend/app/modules/feynman/` | ZhangYuxuan | 解释会话、问题和评估。 |
| `backend/app/modules/knowledge_graph/` | ZhangYuxuan | 概念、关系和掌握状态。 |
| `backend/app/modules/community/` | ZhangYuxuan | 共享社区、学习资产流通、互动和贡献记录。 |
| `backend/tests/` | ChaiYifan、ZhangYuxuan | 后端测试；按被测模块归属维护。 |
| `contracts/` | ChaiYifan、ZhangYuxuan | API 契约、错误码、枚举和事件；MaTianyi 需要审阅前端依赖字段。 |
| `docs/product/` | MaTianyi | 产品流程、页面行为和前端交互说明。 |
| `docs/architecture/` | ChaiYifan、ZhangYuxuan | 后端架构、数据流和系统设计说明。 |
| `docs/api/` | ChaiYifan、ZhangYuxuan | API 使用说明和接口示例。 |
| `docs/adr/` | 决策发起人 | 架构决策记录；涉及多人时共同维护。 |
| `infra/nginx/` | ChaiYifan | 本地或部署用 nginx 配置。 |
| `infra/docker/` | ChaiYifan | Docker 相关配置。 |
| `scripts/` | ChaiYifan、ZhangYuxuan | 开发、测试、迁移和运维脚本；前端专用脚本需与 MaTianyi 同步。 |
| `tests/` | MaTianyi、ChaiYifan、ZhangYuxuan | 跨栈测试；按测试覆盖的功能共同维护。 |

## 根目录结构

目标根目录布局：

```text
Muduo/
├── README.md
├── BUILD.md
├── CONTRIBUTING.md
├── .gitignore
├── .env.example
├── docker-compose.dev.yml
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── resource-notes/
│   │   │   ├── quick-notes/
│   │   │   ├── note-management/
│   │   │   ├── thinking/
│   │   │   ├── memory/
│   │   │   ├── feynman/
│   │   │   ├── community/
│   │   │   └── settings/
│   │   ├── api/
│   │   ├── mocks/
│   │   ├── shared/
│   │   └── styles/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── api/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── notes/
│   │   │   ├── resources/
│   │   │   ├── import_export/
│   │   │   ├── ai_tasks/
│   │   │   ├── memory/
│   │   │   ├── thinking/
│   │   │   ├── feynman/
│   │   │   ├── knowledge_graph/
│   │   │   └── community/
│   │   ├── db/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── workers/
│   │   └── integrations/
│   ├── tests/
│   ├── migrations/
│   └── pyproject.toml
│
├── contracts/
│   ├── openapi.yaml
│   ├── errors.md
│   ├── enums.md
│   └── events.md
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── api/
│   └── adr/
│
├── infra/
│   ├── nginx/
│   └── docker/
│
├── scripts/
└── tests/
```

不要为了满足目录树而创建空目录。只有在添加第一个有实际意义的文件时，才创建对应目录。

## 架构方向

后端初期采用模块化单体架构。不要过早拆分为微服务。

理由：

- 团队规模较小。
- 产品行为和数据模型会快速变化。
- AI 工作流、文件处理和复习调度需要共享数据。
- 部署和调试应保持简单。

对耗时任务使用异步 worker：

- 资源解析
- OCR
- 音频转写
- 导入导出格式转换
- LLM 总结
- 记忆卡片生成
- 费曼练习评估
- 知识图谱更新
- 共享社区内容索引

## 前端标准

当前前端是一个 React + Vite + Tailwind 的单页应用。除非有明确的产品理由，否则保持该技术栈。

推荐前端技术栈：

- React
- Vite
- React Router
- Tailwind CSS
- TanStack Query 用于服务端状态
- Zustand 仅用于少量全局 UI/应用状态
- 启动迁移后，新代码使用 TypeScript
- MSW 或本地 mock 服务用于 API mock

### 前端目录规则

使用以下职责划分：

- `src/app/`：应用初始化、路由设置、providers
- `src/layouts/`：页面外壳组件，例如 `Layout`、`Sidebar`、`Topbar`
- `src/pages/`：路由级页面文件；页面应组合 feature 组件，并避免放入复杂逻辑
- `src/features/`：产品模块；存放特定功能的组件、hooks、本地服务和辅助函数
- `src/api/`：前端 API client 和 endpoint wrapper
- `src/mocks/`：mock 数据和 mock 服务实现
- `src/shared/`：可复用 UI 组件、hooks、常量和工具函数
- `src/styles/`：全局样式

### 前端规则

- 不要在页面组件中直接调用 `fetch`。
- 不要在页面组件中硬编码大量 mock 数据。
- 所有后端调用都必须经过 `src/api/`。
- Mock 数据必须匹配真实 API 契约。
- 保持路由页面轻量。将复杂 UI 移入 `features/*`。
- 优先使用明确的数据模型和具名状态枚举，不要使用临时字符串。
- 引入 TypeScript 时，新文件使用 TS/TSX 编写，旧 JSX 逐步迁移。

## 后端标准

后端应从模块化单体开始。具体后端框架可由团队选择；如果尚未做出其他决定，优先选择 Python + FastAPI，原因是：

- API 开发速度快
- 支持 OpenAPI 生成
- 支持 async endpoint
- 对请求/响应 schema 有较强支持
- 易于集成 AI/OCR/转写相关库

### 后端目录规则

使用以下职责划分：

- `app/main.py`：应用入口
- `app/core/`：配置、日志、认证基础能力、错误、中间件
- `app/api/`：HTTP 路由注册和版本化 routers
- `app/modules/`：业务模块
- `app/db/`：数据库 session、基础模型、repository helpers
- `app/schemas/`：共享请求/响应 schemas
- `app/services/`：跨模块业务服务
- `app/workers/`：异步任务处理器
- `app/integrations/`：外部服务，例如 LLM、对象存储、OCR、ASR
- `tests/`：后端测试
- `migrations/`：数据库迁移

### 后端模块边界

预期后端模块：

- `auth`：登录、token refresh、密码/session 处理
- `users`：用户资料和偏好设置
- `courses`：课程、学科、学习空间
- `notes`：笔记、笔记块、标签、引用
- `resources`：上传文件、解析后的资源、来源元数据
- `import_export`：资料导入、笔记导出、格式转换、任务结果文件管理
- `ai_tasks`：异步 AI 任务生命周期和状态轮询
- `services`：跨模块工作流编排和业务联动入口
- `memory`：记忆卡片、复习记录、间隔重复
- `thinking`：AI 引导的笔记修正和苏格拉底式提示
- `feynman`：解释会话、问题、评估
- `knowledge_graph`：概念、关系、掌握状态
- `community`：共享笔记、知识框架、思考链路、费曼对话流、收藏引用和贡献记录

避免绕过 service 或 repository 边界进行跨模块导入。如果两个模块需要协作，添加 service 函数或领域事件。

#### Repository 模式现状

当前 12 个后端模块中，6 个有 `repository.py`（notes、memory、thinking、feynman、knowledge_graph、community），6 个没有（auth、users、courses、resources、import_export、ai_tasks、dashboard）。这是两位后端开发者（ChaiYifan、ZhangYuxuan）对"是否需要 repository 层"有不同理解导致的历史分歧。

**决策（2026-07-01）**：MVP 阶段不强制统一。每个模块**必须**包含三个核心文件：`models.py`（数据表定义）、`routes.py`（接口路由）、`service.py`（业务逻辑）。`repository.py` 为**可选**——如果模块有自己的 repository，service 应通过 repository 操作数据库而非直接写查询。后续如果统一引入 repository 模式，需同步更新本文档。

### 数据库和迁移规则

- 后端数据库层使用 SQLAlchemy 2.0。
- 数据库迁移使用 Alembic，迁移目录为 `backend/migrations/`。
- 本地默认数据库使用 SQLite，连接字符串由 `MUDUO_DATABASE_URL` 提供。
- 所有持久化模型继承 `app.db.base.Base`，并通过 `app.db.models` 聚合导入，保证 Alembic 能发现 metadata。
- 主键统一使用字符串 ID，格式为 `{prefix}_{12位uuid片段}`。
- 需要用户隔离的业务表必须包含 `owner_id`。
- 可归档或删除的核心业务表使用 `deleted_at` 软删除，不在普通删除流程中直接物理删除。
- schema 变化必须先修改 SQLAlchemy 模型，再补 Alembic 迁移和相关测试。
- 迁移提交前至少验证 `alembic upgrade head`，涉及回滚风险时同时验证 `alembic downgrade -1`。

## API 契约

`contracts/` 是前后端协作的事实来源。

必需的契约文件：

- `contracts/openapi.yaml`：HTTP API 契约
- `contracts/errors.md`：错误响应格式和错误码
- `contracts/enums.md`：共享状态枚举
- `contracts/events.md`：异步事件名称和 payload

前端和后端工作不应依赖私有假设。如果某个响应字段、枚举、错误码或异步状态很重要，就把它写入 `contracts/`。

### API 响应规则

使用一致的响应结构。

成功的单对象响应：

```json
{
  "data": {}
}
```

列表响应：

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

错误响应：

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "资源未找到",
    "details": {}
  }
}
```

### 异步任务规则

长时间运行的 AI 或文件操作应立即返回一个 task。

示例：

```json
{
  "data": {
    "taskId": "task_123",
    "status": "queued"
  }
}
```

前端应轮询或订阅任务状态：

```text
queued -> running -> succeeded
queued -> running -> failed
queued -> canceled
```

将所有任务状态放入 `contracts/enums.md`。

## 初始产品领域

围绕以下产品领域设计数据模型：

- `user`：用户
- `course`：课程
- `note`：笔记
- `note_block`：笔记块
- `note_relation`：笔记引用、双链关系和上下文关联
- `uploaded_resource`：上传资源
- `parsed_resource`：解析后的资源
- `import_export_job`：导入导出任务
- `ai_task`：AI 任务
- `memory_card`：记忆卡片
- `review_session`：复习会话
- `thinking_session`：思考会话
- `feynman_session`：费曼会话
- `concept`：概念
- `concept_relation`：概念关系
- `mastery_state`：掌握状态
- `shared_asset`：共享笔记、知识框架、知识图谱或学习模板
- `community_post`：社区内容发布
- `collection`：收藏、引用和复用记录
- `contribution_record`：用户贡献记录

不要只围绕当前页面设计。页面可以变化；产品领域应保持稳定。

## 开发流程

任何新功能建议遵循以下流程：

1. 在 `contracts/openapi.yaml` 中更新或创建契约。
2. 在 `contracts/` 中添加共享枚举或错误。
3. 添加后端 schema、route、service 和 tests。
4. 在 `frontend/src/api/` 中添加前端 API wrapper。
5. 在 `frontend/src/mocks/` 中添加 mock 实现。
6. 在 `frontend/src/features/` 中构建或更新功能 UI。
7. 保持 `frontend/src/pages/` 只负责路由组合。
8. 运行相关测试和构建检查。
9. 当行为或架构发生变化时更新文档。

对 AI 代理：编辑前先检查相关文件。除非本指南明确要求新模式，否则遵循已有模式。

## 最小首个里程碑

第一个正式项目里程碑应建立结构和契约，而不是完成所有产品功能。

推荐第一个里程碑：

- 添加根目录 `README.md`
- 添加根目录 `.gitignore`
- 添加根目录 `.env.example`
- 添加 `contracts/openapi.yaml`
- 添加 `contracts/errors.md`
- 添加 `contracts/enums.md`
- 添加 `contracts/events.md`
- 添加 `docs/product/feature-map.md`
- 添加 `docs/architecture/overview.md`
- 将前端重构到以下方向：
  - `src/app/`
  - `src/layouts/`
  - `src/api/`
  - `src/mocks/`
  - `src/shared/`
  - `src/features/`
- 补齐商业策划书中的核心功能目录：
  - `frontend/src/features/note-management/`
  - `frontend/src/features/community/`
  - `frontend/src/features/settings/`
- `backend/app/modules/import_export/`
- `backend/app/services/`
- `backend/app/modules/community/`
- 创建后端骨架
- 创建本地开发启动说明

## Git 和生成文件

不要提交生成文件或本地依赖文件：

- `node_modules/`
- `dist/`
- `.env`
- Python 虚拟环境
- 缓存目录
- 本地数据库文件
- 开发环境上传文件

每当必需环境变量发生变化时，保持 `.env.example` 同步更新。

## 本地开发

初始化后预期本地命令：

前端：

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

后端命令取决于所选框架。如果使用 FastAPI：

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

仓库根目录提供常用脚本：

```bash
make backend-dev
make backend-check
```

添加 `docker-compose.dev.yml` 后，它应启动共享依赖，例如：

- 数据库
- Redis 或任务代理
- 如有需要，启动对象存储模拟器

当前开发编排采用本地 SQLite、FastAPI 后端和 nginx 反代示例，不强制依赖额外共享组件。

不要为了运行前端而强制要求 Docker。

## 测试预期

前端：

- 可复用组件的组件测试
- 在有价值时，为 API wrapper 编写 API mock 测试
- 路由稳定后，为核心工作流编写 E2E 测试
- 合并前执行构建检查

后端：

- services 的单元测试
- routes 的 API 测试
- 异步任务的 worker 测试
- schema 变更存在风险时编写迁移测试

跨栈：

- 契约校验
- 登录、上传、AI 任务轮询和笔记创建的 smoke test

## 文档规则

使用 `docs/adr/` 记录之后不应被重复讨论的架构决策。

在决定以下事项时创建 ADR：

- 后端框架
- 数据库
- 任务队列
- 对象存储
- LLM provider 抽象
- 认证策略
- TypeScript 迁移
- API 契约生成

ADR 格式：

```text
# ADR-NNN：标题

## 状态

已接受

## 背景

存在什么问题或决策压力？

## 决策

团队做出了什么决定？

## 影响

这个决定会带来哪些取舍？
```

## AI 开发指令

任何在本仓库工作的 AI 代理都必须遵循以下规则：

- 先阅读此 `BUILD.md`。
- 改动结构前先检查已有文件。
- 不要用推测性重写替换可工作的代码。
- 优先做小而可审查的改动。
- 保持前端页面轻量，并将可复用逻辑移入 features、API、mocks 或 shared modules。
- 按产品领域分离后端模块。
- 在实现前后端行为前先更新契约。
- 不要在前端页面中发明 API 结构。
- 不要在页面组件中硬编码长期存在的 mock 数据。
- 不要提交生成文件或依赖。
- 改动后运行最小相关验证命令。
- 如果改动影响其他开发者负责的区域，清晰记录契约或迁移方式。

## 当前状态说明

创建本指南时，仓库只包含 `frontend/`。目前已经根据 `old_plan/collaboration/商业策划书.docx` 完成项目功能规划对齐：

- 四大核心模式：速记、思考、记忆、费曼。
- 三大支撑体系：资源转笔记、笔记管理、共享社区。
- 基础系统能力：用户、课程、我的笔记、导入导出、系统设置、学习仪表盘。
- 已补齐 `frontend/src/features/note-management/`、`frontend/src/features/community/`、`frontend/src/features/settings/`。
- 已补齐 `backend/app/modules/import_export/`、`backend/app/modules/community/`。
- 已新增 `docs/product/feature-map.md` 作为商业策划书与工程功能规划的对照表。

当前前端仍是 React/Vite/Tailwind 演示，部分功能只有页面或目录规划；后端仍是骨架。下一步应优先补契约、后端模块和 mock，再把前端演示迁移到真实 API。
