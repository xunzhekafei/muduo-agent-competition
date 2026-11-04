# 后端架构总览

本文档概述 Muduo 当前后端的模块化单体设计、服务边界和部署准备。

## 分层

### 入口层

- `app.main:create_app()` 负责应用初始化。
- `app.api.v1.router` 负责版本化路由聚合。
- `app.core` 提供配置、认证、错误处理、响应封装和中间件。

### 领域层

- `app.modules.auth`：登录、refresh、logout、session。
- `app.modules.users`：用户资料和偏好。
- `app.modules.courses`：课程和学习空间。
- `app.modules.resources`：资源元数据和解析结果。
- `app.modules.import_export`：导入导出任务。
- `app.modules.ai_tasks`：统一 AI 任务生命周期。
- `app.services.resource_note_workflow`：资源转笔记跨模块编排。

### 集成层

- `app.integrations`：LLM、OCR、ASR、Embedding、对象存储 provider 抽象与 mock provider。
- `app.workers`：本地 worker registry 和 handler。

## 数据流

1. 用户登录后拿到 access token。
2. 前端创建课程、资源和导入/解析任务。
3. `ai_tasks` 负责统一任务状态。
4. `services/resource_note_workflow.py` 把解析结果、草稿和任务状态串联起来。
5. `worker` handler 后续可消费 `ai_tasks` 输出，生成 memory、feynman、knowledge graph 或 community 结果。

## 部署准备

- 开发环境：`scripts/backend_dev.sh` 或 `make backend-dev`
- 检查环境：`scripts/backend_check.sh` 或 `make backend-check`
- Docker：`docker-compose.dev.yml`
- 后端镜像：`infra/docker/backend.Dockerfile`
- 反向代理：`infra/nginx/muduo.conf`

## 约束

- route 不直接写 SQL。
- 跨模块协作通过 service 或事件，不直接读写别的模块 repository 内部状态。
- 所有对外接口以 `contracts/openapi.yaml` 为准。
