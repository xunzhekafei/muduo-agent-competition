# ZhangYuxuan Backend Modules

本文档说明 `notes`、`memory`、`thinking`、`feynman`、`knowledge_graph`、`community` 和 `workers` 的当前后端设计。它遵循根目录 `BUILD.md` 中的模块化单体、契约优先和异步 worker 规则。

## 模块边界

| 模块 | 领域职责 | 不直接负责 |
| --- | --- | --- |
| `notes` | 笔记、笔记块、标签、笔记关系和双链上下文。 | 用户认证、课程权限、资源解析。 |
| `memory` | 记忆卡片、复习记录和间隔重复调度。 | LLM 生成卡片的具体 provider。 |
| `thinking` | 思考会话、苏格拉底式提示和笔记修订建议。 | 直接改写笔记正文。 |
| `feynman` | 解释会话、追问和评估结果。 | 概念抽取和图谱持久化。 |
| `knowledge_graph` | 概念、概念关系和掌握状态。 | 前端图渲染布局。 |
| `community` | 共享资产、帖子、互动、收藏复用和贡献记录。 | 内容审核策略和搜索引擎实现。 |
| `workers` | 后台任务类型、状态和 handler 注册执行边界。 | 队列 broker、任务持久化和 API 轮询入口。 |

跨模块协作应通过 service 调用或领域事件完成，不应让一个模块直接读写另一个模块的 repository 内部状态。

## 当前实现策略

ChaiYifan 的后端基础骨架合并后，ZhangYuxuan 模块已对齐为 FastAPI + SQLAlchemy + Pydantic 的实现方式：

- `models.py` 使用 SQLAlchemy ORM 定义持久化模型。
- `schemas/*.py` 使用 Pydantic 定义请求、响应和 camelCase API 字段。
- `service.py` 接收 SQLAlchemy `Session`，承载业务校验、owner scope 和状态变化。
- `routes.py` 按模块暴露 FastAPI router，并统一使用 `data` / `pagination` envelope。
- `repository.py` 暂作为兼容入口，返回对应 service；后续若拆分 repository adapter，可在此处承接。
- `workers/registry.py` 管理任务 handler 注册、运行状态和失败结果。
- `workers/handlers.py` 提供可替换的默认 handler，用于记忆卡片生成、费曼评估、知识图谱更新和社区索引。

数据库表由 `backend/migrations/versions/0002_zhangyuxuan_learning_modules.py` 创建；运行 `alembic upgrade head` 后即可得到 ZhangYuxuan 负责模块的持久化表。

## API 契约

相关 HTTP API 已写入 `contracts/openapi.yaml`，枚举、错误码和异步事件分别写入：

- `contracts/enums.md`
- `contracts/errors.md`
- `contracts/events.md`

HTTP 响应必须遵循根规范：

- 单对象：`{"data": {...}}`
- 列表：`{"data": [...], "pagination": {...}}`
- 错误：`{"error": {"code": "...", "message": "...", "details": {...}}}`

## 异步任务

长耗时行为不应阻塞 HTTP 请求。当前约定的 worker task 类型：

- `resource_parse`
- `memory_card_generation`
- `feynman_evaluation`
- `knowledge_graph_update`
- `community_indexing`

任务状态使用共享 `TaskStatus`：

```text
queued -> running -> succeeded
queued -> running -> failed
queued -> canceled
```

后续接入真实队列时，建议保留 `WorkerTask`、`WorkerResult` 和 `WorkerRegistry` 的概念，将 `registry.run()` 替换为队列 consumer 内部调用。

## 后续接入点

1. AI provider、OCR、ASR 等外部能力应通过 `backend/app/integrations/` 接入，再由 worker handler 调用。
2. worker 目前是同步 registry 执行模型；接入真实队列时保持 `WorkerTask` / `WorkerResult` payload 形状稳定。
3. 前端 API wrapper 和 mock 数据必须以 `contracts/` 为准。
4. 若后续引入复杂查询或跨模块编排，优先在 service 层增加方法，不让模块直接读写其他模块内部表。
