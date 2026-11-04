# 后端 API 使用说明

本文档说明当前 FastAPI 后端的主要接口入口。完整字段以 `contracts/openapi.yaml` 为准。

## 基础约定

- 本地默认地址：`http://localhost:8000`
- API 前缀：`/api/v1`
- 鉴权方式：`Authorization: Bearer <accessToken>`
- 成功响应：`{"data": ...}`
- 列表响应：`{"data": [...], "pagination": {...}}`
- 错误响应：`{"error": {"code": "...", "message": "...", "details": {...}}}`

## 健康检查

- `GET /health`
- `GET /api/v1/health`

## 认证和用户

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/users/me/preferences`
- `PATCH /api/v1/users/me/preferences`

开发环境默认账号：

```text
email: dev@muduo.local
password: muduo123456
```

## 课程和学习空间

- `GET /api/v1/courses`
- `POST /api/v1/courses`
- `GET /api/v1/courses/{courseId}`
- `PATCH /api/v1/courses/{courseId}`
- `DELETE /api/v1/courses/{courseId}`
- `GET /api/v1/courses/{courseId}/learning-spaces`
- `POST /api/v1/courses/{courseId}/learning-spaces`
- `GET /api/v1/courses/{courseId}/learning-spaces/{spaceId}`
- `PATCH /api/v1/courses/{courseId}/learning-spaces/{spaceId}`
- `DELETE /api/v1/courses/{courseId}/learning-spaces/{spaceId}`

## 资源、导入导出和 AI 任务

- `GET /api/v1/resources`
- `POST /api/v1/resources`
- `GET /api/v1/resources/{resourceId}`
- `DELETE /api/v1/resources/{resourceId}`
- `POST /api/v1/resources/{resourceId}/parse`
- `GET /api/v1/resources/{resourceId}/parsed-result`
- `POST /api/v1/import-jobs`
- `GET /api/v1/import-jobs/{jobId}`
- `POST /api/v1/export-jobs`
- `GET /api/v1/export-jobs/{jobId}`
- `POST /api/v1/ai-tasks`
- `GET /api/v1/ai-tasks/{taskId}`
- `PATCH /api/v1/ai-tasks/{taskId}`
- `POST /api/v1/ai-tasks/{taskId}/cancel`
- `POST /api/v1/ai/openai/chat/completions`

## 资源转笔记工作流

详见 `docs/api/resource-note-workflow.md`。

核心入口：

- `POST /api/v1/workflows/resource-notes/import`
- `GET /api/v1/workflows/resource-notes/context`
- `POST /api/v1/workflows/resource-notes/parse-tasks/{taskId}/complete`

前端轮询任务时只需要保存 `taskId`，然后调用 `GET /api/v1/ai-tasks/{taskId}`。
