# ZhangYuxuan Backend Development Report

## 基本信息

- 开发人：ZhangYuxuan
- 开发范围：`backend/app/workers/`、`backend/app/modules/notes/`、`memory/`、`thinking/`、`feynman/`、`knowledge_graph/`、`community/`，以及对应契约、测试和架构文档。
- 对齐基础：ChaiYifan 已合并的 FastAPI、SQLAlchemy、Pydantic、认证、数据库 session、统一响应和 AI task 生命周期。
- 日期：2026-05-08

## 本次查漏补缺结论

ChaiYifan 合并后，后端已经具备真实 API 和数据库基础层；ZhangYuxuan 原先负责模块仍停留在标准库 dataclass 与内存 repository 阶段，无法被 FastAPI 路由、数据库迁移和认证 owner scope 直接使用。

本次补齐重点：

- 将 ZhangYuxuan 负责模块迁移到 SQLAlchemy ORM 持久化模型。
- 为每个业务模块补齐 Pydantic request/response schema。
- 为每个业务模块补齐 FastAPI route。
- 将模块路由接入 `api/v1` 聚合 router。
- 将模块模型接入 `app/db/models.py` 聚合入口，保证 `Base.metadata.create_all()` 和 Alembic 可以识别。
- 增加 Alembic 迁移 `0002_zhangyuxuan_learning_modules.py`。
- 更新 worker task 类型，使其与 ChaiYifan 的 `AiTaskType` 枚举保持一致。
- 将测试从内存 service 测试升级为 API + 数据库集成测试。
- 修复资源转笔记工作流中对旧版内存 `NoteService` 的调用，使解析完成后可以创建真实数据库笔记草稿。

## 已完成模块

### Notes

实现内容：

- `notes`
- `note_blocks`
- `note_relations`

核心能力：

- 创建、列表、详情、更新、归档笔记。
- 添加笔记块。
- 添加笔记关系，防止自引用。
- 支持 owner scope、课程和学习空间范围校验。

### Memory

实现内容：

- `memory_cards`
- `review_records`

核心能力：

- 创建记忆卡片。
- 查询当前到期卡片。
- 记录复习结果。
- 根据 `again`、`hard`、`good`、`easy` 计算下一次复习间隔。

### Thinking

实现内容：

- `thinking_sessions`
- `thinking_prompts`
- `revision_suggestions`

核心能力：

- 基于笔记创建思考会话。
- 添加苏格拉底式提示或修订提示。
- 添加笔记修订建议。
- 完成会话后禁止继续写入提示和建议。

### Feynman

实现内容：

- `feynman_sessions`
- `feynman_questions`
- `feynman_evaluations`

核心能力：

- 创建费曼解释会话。
- 添加追问。
- 写入评估结果。
- 评估后关闭会话，避免重复追问。

### Knowledge Graph

实现内容：

- `concepts`
- `concept_relations`
- `mastery_states`

核心能力：

- upsert 概念。
- 建立概念关系。
- 更新概念掌握状态。
- 返回当前用户知识图谱。

### Community

实现内容：

- `shared_assets`
- `community_posts`
- `community_interactions`
- `collections`
- `contribution_records`

核心能力：

- 发布共享学习资产。
- 浏览公开资产。
- 发帖、互动、收藏和复用。
- 记录发布和收藏贡献。

### Workers

已对齐的 task 类型：

- `resource_parse`
- `memory_card_generation`
- `feynman_evaluation`
- `knowledge_graph_update`
- `community_indexing`

worker 当前保留轻量同步 registry，便于后续替换成真实队列 consumer。

## 契约与文档

已更新：

- `contracts/openapi.yaml`
- `contracts/events.md`
- `zhangyuxuan-modules.md`

已有枚举与 ChaiYifan 的 `AiTaskType` 对齐，避免 worker、AI task 和前端轮询使用不同任务名。

## 测试覆盖

已更新 ZhangYuxuan 对应测试：

- `backend/tests/test_notes_memory.py`
- `backend/tests/test_thinking_feynman.py`
- `backend/tests/test_knowledge_community_workers.py`

覆盖内容：

- 笔记创建、块追加、关系创建、owner scope。
- 记忆卡片创建、到期查询、复习记录。
- 思考会话、提示、修订建议和关闭状态。
- 费曼会话、追问、评估和详情读取。
- 知识图谱概念、关系、掌握状态。
- 社区资产发布、公开列表、收藏和贡献记录。
- worker registry 成功和失败路径。

## 验证结果

已通过：

```bash
cd backend
python3 -m compileall app tests migrations
```

已通过 worker 标准库 smoke test：

```bash
cd backend
python3 - <<'PY'
from app.workers import TaskStatus, WorkerTask, WorkerTaskType, build_default_registry
registry = build_default_registry()
result = registry.run(WorkerTask(task_type=WorkerTaskType.MEMORY_CARD_GENERATION, payload={'note_id':'note_1','blocks':['A']}))
assert result.status == TaskStatus.SUCCEEDED
assert result.data['count'] == 1
print('worker-smoke-ok')
PY
```

完整 API 测试暂未能在当前本机环境执行，因为当前 Python 环境缺少 `fastapi`、`sqlalchemy` 等依赖；已尝试请求安装 `backend[dev]`，但权限审批超时。依赖安装后建议运行：

```bash
cd backend
python3 -m pip install -e ".[dev]"
python3 -m unittest discover tests
alembic upgrade head
```

## 跨边界改动说明

为了让 ZhangYuxuan 模块真正接入 ChaiYifan 后端骨架，本次做了少量胶水层改动：

- `backend/app/api/v1/router.py`：注册 ZhangYuxuan 模块 routes。
- `backend/app/db/models.py`：注册 ZhangYuxuan 模块 SQLAlchemy models。
- `backend/app/schemas/enums.py`：补齐 ZhangYuxuan 领域枚举。
- `backend/migrations/versions/0002_zhangyuxuan_learning_modules.py`：新增数据库迁移。
- `backend/app/services/resource_note_workflow.py`：将旧版内存笔记草稿适配改为调用数据库版 `NoteService`。

这些改动尽量保持为模块注册、共享契约对齐和跨模块适配，不改变 ChaiYifan 已有业务语义。

## 后续建议

1. 安装后端依赖并运行完整测试。
2. 执行 Alembic 迁移，确认本地 SQLite 和目标数据库均可建表。
3. 将 worker registry 接入 `ai_tasks` 生命周期，形成 queued、running、succeeded、failed 的真实状态回写。
4. 与 MaTianyi 对齐前端 API wrapper 和 mock，确保字段以 `contracts/` 为准。
