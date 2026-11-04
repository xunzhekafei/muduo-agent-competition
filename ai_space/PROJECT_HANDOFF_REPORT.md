# Muduo-notes-v1 项目梳理报告

日期：2026-06-22

## 1. 项目定位

Muduo 是一个 AI 辅助学习平台，当前仓库包含前端 React/Vite 应用、后端 FastAPI 服务、API 契约、架构文档、部署配置和开发脚本。核心产品能力围绕速记、思考、记忆卡片、费曼练习、资源转笔记、笔记管理和社区分享展开。

## 2. 当前顶层目录

```text
Muduo-notes-v1/
├── backend/                 # FastAPI 后端、数据库模型、迁移、测试
├── frontend/                # React + Vite 前端应用
├── contracts/               # OpenAPI、枚举、错误码、事件契约
├── docs/                    # 当前仍有价值的架构、API、产品、ADR 文档
├── infra/                   # Docker、Nginx 等基础设施配置
├── scripts/                 # 开发辅助脚本
├── old_plan/                # 已归档的旧计划/旧分工/旧协作材料
├── ai_space/                # AI 工作过程、梳理报告、临时分析沉淀
├── README.md                # 项目主说明
├── BUILD.md                 # 构建规范、团队协作和工程约束
├── Makefile                 # 常用命令入口
├── docker-compose.dev.yml   # 本地 Docker 开发编排
└── .env.example             # 环境变量示例
```

## 3. 后端接手路线

优先阅读：

1. `backend/pyproject.toml`: 后端依赖、Python 版本、pytest 配置。
2. `backend/app/main.py`: FastAPI 应用入口。
3. `backend/app/api/v1/router.py` 与 `backend/app/api/v1/routes.py`: API 路由聚合入口。
4. `backend/app/modules/`: 业务模块实现，主要遵循 `models.py`、`routes.py`、`service.py`、可选 `repository.py` 的结构。
5. `backend/app/schemas/`: Pydantic 请求/响应模型。
6. `backend/app/db/`: SQLAlchemy 基础设施、模型基类、会话和 ID 规则。
7. `backend/migrations/versions/`: Alembic 迁移历史。
8. `backend/tests/`: 当前接口和服务测试。

后端模块大致分为：

- `auth` / `users`: 登录、用户与认证。
- `courses`: 课程与学习空间。
- `resources` / `import_export`: 资源管理、导入导出。
- `notes`: 笔记、笔记块、笔记关系。
- `memory`: 记忆卡片、复习记录、记忆库。
- `thinking` / `feynman`: 思考模式和费曼练习。
- `knowledge_graph`: 概念和概念关系。
- `community`: 公开资产、帖子、互动和收藏。
- `dashboard`: 学习概览数据。
- `ai_tasks`: 异步 AI 任务生命周期。

## 4. 前端接手路线

优先阅读：

1. `frontend/package.json`: 前端脚本和依赖。
2. `frontend/src/main.jsx`: React 入口。
3. `frontend/src/app/App.jsx`: 路由配置。
4. `frontend/src/pages/`: 页面级入口。
5. `frontend/src/features/`: 业务功能组件。
6. `frontend/src/api/`: 后端接口封装。
7. `frontend/src/shared/`: 共享组件和常量。
8. `frontend/src/mocks/`: Mock 数据。

前端结构是“页面入口 + 功能组件 + API 封装”的常见拆法。接手时建议先从 `App.jsx` 看路由，再顺着页面进入对应 `features/`。

## 5. 文档分层

建议按这个顺序读文档：

1. `README.md`: 项目整体说明和启动路径。
2. `BUILD.md`: 工程规则、目录规则、开发流程和协作约束。
3. `docs/architecture/`: 当前架构、数据库、跨模块工作流。
4. `docs/api/` 与 `contracts/`: API 使用说明和契约。
5. `docs/product/`: 仍在主文档区的产品说明和功能覆盖。
6. `old_plan/`: 只在需要追溯历史分工或旧计划时查看。
7. `ai_space/`: AI 过程性报告、接手梳理和后续临时分析。

## 6. 本次归档内容

已移动到 `old_plan/people/`：

- `PLAN_chaiyifan.md`
- `zhangyuxuan-modules.md`
- `zhangyuxuan-development-report.md`

已移动到 `old_plan/product_plans/`：

- `quick-notes-development.md`
- `mtysinglenotes.md`
- `mtysinglememeory.md`
- `memory-mode-business-logic.md`

已移动到 `old_plan/collaboration/`：

- `木铎笔记 GitHub 协作管理手册.html`
- `todo-木铎笔记待完善.docx`
- `商业策划书.docx`

归档标准：文件内容明显偏向人员分工、阶段计划、旧协作方式、待办或早期策划，而不是当前运行、架构、接口和模块说明。

## 7. 接手建议

先跑通项目，再改代码：

1. 前端：进入 `frontend/`，按 `package.json` 的 `dev`、`build`、`lint` 脚本验证。
2. 后端：进入 `backend/`，按 `pyproject.toml` 安装依赖，执行迁移、种子数据和 pytest。
3. 联调：优先对照 `frontend/BACKEND_API_FOR_FRONTEND.md`、`docs/api/` 和 `contracts/openapi.yaml`。
4. 新需求：先确认属于哪个业务模块，再改 `schemas`、`modules/<name>`、前端 `api` 和对应页面/功能组件。
5. 新过程文档：放在 `ai_space/`；稳定后的架构/API/产品文档再进入 `docs/`。

## 8. 后续清理建议

- 检查 `README.md`、`BUILD.md` 中是否仍引用已归档路径，必要时更新为 `old_plan/...`。
- 补齐空的 `CONTRIBUTING.md`，让协作规则从旧手册迁到一个更短、更当前的文件。
- 确认 `docs/product/time_tree_md` 是否需要补 `.md` 后缀，方便编辑器识别。
- 若 `frontend/dist/`、`frontend/node_modules/`、`backend/.venv/` 已在本机存在，它们应继续保持被 `.gitignore` 忽略。
- 后续新增 AI 工作记录建议采用日期前缀，例如 `ai_space/2026-06-22-module-audit.md`。

## 9. 验证说明

本次只做目录整理和文档归档，没有修改源码逻辑。尚未运行前端或后端测试。
