# 数据库与迁移设计

本文档记录第三阶段后端数据库基础设计。当前实现覆盖 ChaiYifan 负责的用户、认证会话、课程、学习空间、资源、解析结果、AI 任务和导入导出任务，也覆盖 ZhangYuxuan 负责的笔记、记忆、思考、费曼、知识图谱和社区模块。

## 技术选型

- ORM：SQLAlchemy 2.0，同步 session。
- 迁移：Alembic。
- 本地默认数据库：SQLite，配置为 `sqlite+pysqlite:///./muduo_dev.sqlite3`。
- 配置入口：`MUDUO_DATABASE_URL` 和 `MUDUO_DATABASE_ECHO`。

## 基础规范

- 主键使用字符串 ID，格式为 `{prefix}_{12位uuid片段}`，例如 `user_xxx`、`course_xxx`、`task_xxx`。
- 所有持久化模型继承统一 `Base`，metadata 使用稳定命名规则，方便 Alembic 生成可读迁移。
- 业务表默认包含 `created_at` 和 `updated_at`。
- 可归档或删除的核心业务表使用 `deleted_at` 软删除字段。
- 归属用户的数据表使用 `owner_id` 做用户隔离。

## 已覆盖表

| 表 | 说明 |
| --- | --- |
| `users` | 用户基础资料、邮箱、角色和密码哈希预留字段。 |
| `user_preferences` | 用户主题、语言、复习提醒和 AI 引导偏好。 |
| `auth_sessions` | refresh token 会话、过期时间和失效时间。 |
| `courses` | 课程和学科。 |
| `learning_spaces` | 课程内章节、学习空间或目录节点。 |
| `resources` | 上传或登记的学习资源元数据。 |
| `parsed_resources` | 资源解析后的结构化结果摘要。 |
| `parsed_resource_chapters` | 解析结果章节内容。 |
| `ai_tasks` | 统一 AI 异步任务生命周期。 |
| `import_export_jobs` | 资料导入和笔记导出任务。 |
| `notes` | 笔记主体、课程/学习空间归属、标签和来源资源。 |
| `note_blocks` | 笔记块内容、块类型和排序。 |
| `note_relations` | 笔记引用、前置依赖和双链关系。 |
| `memory_cards` | 记忆卡片、间隔重复调度参数和到期时间。 |
| `review_records` | 复习记录、评分和下一次复习时间。 |
| `thinking_sessions` | 思考模式会话。 |
| `thinking_prompts` | 苏格拉底式提示和修订提示。 |
| `revision_suggestions` | 针对笔记的修订建议。 |
| `concepts` | 知识图谱概念节点。 |
| `concept_relations` | 概念关系边。 |
| `mastery_states` | 用户对概念的掌握状态。 |
| `feynman_sessions` | 费曼解释练习会话。 |
| `feynman_questions` | 费曼练习追问。 |
| `feynman_evaluations` | 费曼练习评估结果。 |
| `shared_assets` | 社区共享学习资产。 |
| `community_posts` | 围绕共享资产的社区内容。 |
| `community_interactions` | 点赞、评论等互动记录。 |
| `collections` | 收藏、引用和复用记录。 |
| `contribution_records` | 用户贡献积分记录。 |

## 本地迁移

```bash
cd backend
alembic upgrade head
```

如果当前环境没有安装后端依赖，先执行：

```bash
cd backend
python3 -m pip install -e ".[dev]"
```

## 后续注意

- ZhangYuxuan 负责模块已迁移到 SQLAlchemy 模型，并由 `0002_zhangyuxuan_learning_modules.py` 建表。
- 后续在实现业务 API 时，应通过 service 访问 session，不要在 route 中散落 SQL 查询。
- 切换 PostgreSQL 前需要重新跑迁移并检查 enum、JSON、外键和时间戳行为。
