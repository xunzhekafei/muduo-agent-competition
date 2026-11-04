# Muduo 前端联调用后端接口文档

本文档面向前端开发，基于当前仓库里的实际后端实现整理。目标是让前端在开发 `src/api/` 和各功能页面时，可以直接按这里的接口调用。

完整契约仍以 `contracts/openapi.yaml` 为最终准则；如果本文档和契约文件冲突，以契约文件为准。

## 1. 后端如何启动

首次启动：

```bash
cd backend
python3 -m pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

也可以在项目根目录启动：

```bash
make backend-dev
```

健康检查：

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/api/v1/health`

开发环境默认联调账号：

```text
email: dev@muduo.local
password: muduo123456
```

## 2. 前端环境变量

前端请求后端时建议在 `frontend/.env` 或 `frontend/.env.local` 中配置：

```bash
VITE_API_BASE_URL=http://localhost:8000
```

当前前端的 API client 默认会把这个地址和接口路径拼接起来。

## 3. 统一约定

API 前缀：

- `/api/v1`

鉴权方式：

```http
Authorization: Bearer <accessToken>
```

成功响应：

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

通用分页参数：

- `page`
- `pageSize`

## 4. 常用枚举

资源类型 `type` / `sourceType`：

- `pdf`
- `ppt`
- `markdown`
- `image`
- `audio`
- `video`
- `webpage`
- `text`
- `other`

资源状态 `status`：

- `uploaded`
- `parsing`
- `parsed`
- `failed`
- `archived`

AI 任务类型 `type`：

- `resource_parse`
- `ocr`
- `asr`
- `llm_summary`
- `memory_card_generation`
- `feynman_evaluation`
- `knowledge_graph_update`
- `community_indexing`

AI 任务状态 `status`：

- `queued`
- `running`
- `succeeded`
- `failed`
- `canceled`

笔记状态：

- `draft`
- `active`
- `archived`

笔记块类型：

- `paragraph`
- `heading`
- `quote`
- `todo`
- `code`

复习评分 `grade`：

- `again`
- `hard`
- `good`
- `easy`

## 5. 认证与用户

### 5.1 登录

`POST /api/v1/auth/login`

请求体：

```json
{
  "email": "dev@muduo.local",
  "password": "muduo123456"
}
```

返回重点字段：

- `accessToken`
- `refreshToken`
- `tokenType`
- `expiresIn`
- `user`

### 5.2 刷新 token

`POST /api/v1/auth/refresh`

请求体：

```json
{
  "refreshToken": "..."
}
```

### 5.3 登出

`POST /api/v1/auth/logout`

需要登录态。

### 5.4 当前用户

`GET /api/v1/users/me`

返回字段示例：

```json
{
  "data": {
    "id": "user_xxx",
    "name": "Muduo Dev",
    "email": "dev@muduo.local",
    "avatarUrl": null,
    "role": "student",
    "createdAt": "2026-05-10T00:00:00Z"
  }
}
```

### 5.5 更新用户资料

`PATCH /api/v1/users/me`

请求体可传：

- `name`
- `avatarUrl`

### 5.6 用户偏好

- `GET /api/v1/users/me/preferences`
- `PATCH /api/v1/users/me/preferences`

偏好字段：

- `theme`: `system | light | dark`
- `language`
- `dailyReviewReminder`
- `reminderTime`
- `aiGuidanceLevel`: `strict | balanced | gentle`

## 6. 课程与学习空间

### 6.1 课程

- `GET /api/v1/courses`
- `POST /api/v1/courses`
- `GET /api/v1/courses/{courseId}`
- `PATCH /api/v1/courses/{courseId}`
- `DELETE /api/v1/courses/{courseId}`

创建课程请求体：

```json
{
  "name": "高等数学",
  "subject": "math",
  "description": "同济版高数复习"
}
```

课程返回重点字段：

- `id`
- `name`
- `subject`
- `description`
- `ownerId`
- `createdAt`
- `updatedAt`

### 6.2 学习空间

- `GET /api/v1/courses/{courseId}/learning-spaces`
- `POST /api/v1/courses/{courseId}/learning-spaces`
- `GET /api/v1/courses/{courseId}/learning-spaces/{spaceId}`
- `PATCH /api/v1/courses/{courseId}/learning-spaces/{spaceId}`
- `DELETE /api/v1/courses/{courseId}/learning-spaces/{spaceId}`

创建学习空间请求体：

```json
{
  "parentId": null,
  "name": "第一章 极限",
  "description": "章节目录",
  "position": 0
}
```

## 7. 资源、导入导出与 AI 任务

### 7.1 资源

- `GET /api/v1/resources`
- `POST /api/v1/resources`
- `GET /api/v1/resources/{resourceId}`
- `DELETE /api/v1/resources/{resourceId}`
- `POST /api/v1/resources/{resourceId}/parse`
- `GET /api/v1/resources/{resourceId}/parsed-result`

列表查询参数：

- `page`
- `pageSize`
- `courseId`
- `learningSpaceId`

创建资源请求体：

```json
{
  "courseId": "course_xxx",
  "learningSpaceId": "space_xxx",
  "name": "第一章课件.pdf",
  "type": "pdf",
  "sizeBytes": 123456,
  "sourceUrl": "https://example.com/ch1.pdf",
  "storageKey": "resources/ch1.pdf"
}
```

注意：

- 当前后端更偏“登记资源元数据”，不是完整 multipart 文件上传接口。
- 前端如果只是先联调流程，可以先传 `sourceUrl` 或 `storageKey`。

### 7.2 创建资源解析任务

`POST /api/v1/resources/{resourceId}/parse`

请求体可选：

```json
{
  "targetNoteId": "note_xxx",
  "options": {}
}
```

返回：

```json
{
  "data": {
    "taskId": "task_xxx",
    "status": "queued"
  }
}
```

### 7.3 获取解析结果

`GET /api/v1/resources/{resourceId}/parsed-result`

返回重点字段：

- `resourceId`
- `title`
- `chapters`
- `coreConcepts`
- `noteDraftId`

### 7.4 导入任务

- `POST /api/v1/import-jobs`
- `GET /api/v1/import-jobs/{jobId}`

创建导入任务请求体：

```json
{
  "courseId": "course_xxx",
  "sourceType": "pdf",
  "sourceUrl": "https://example.com/ch1.pdf",
  "resourceId": null,
  "options": {}
}
```

### 7.5 导出任务

- `POST /api/v1/export-jobs`
- `GET /api/v1/export-jobs/{jobId}`

创建导出任务请求体：

```json
{
  "noteIds": ["note_1", "note_2"],
  "format": "markdown",
  "options": {}
}
```

### 7.6 AI 任务通用接口

- `POST /api/v1/ai-tasks`
- `GET /api/v1/ai-tasks/{taskId}`
- `PATCH /api/v1/ai-tasks/{taskId}`
- `POST /api/v1/ai-tasks/{taskId}/cancel`

创建 AI 任务请求体：

```json
{
  "type": "llm_summary",
  "courseId": "course_xxx",
  "resourceId": "resource_xxx",
  "input": {}
}
```

前端最常用的是：

- 保存 `taskId`
- 轮询 `GET /api/v1/ai-tasks/{taskId}`

任务返回重点字段：

- `id`
- `type`
- `status`
- `progress`
- `courseId`
- `resourceId`
- `input`
- `output`
- `errorCode`
- `errorMessage`

### 7.7 OpenAI 兼容任务入口

`POST /api/v1/ai/openai/chat/completions`

说明：

- 当前不是直接返回 OpenAI 原始响应
- 当前是把请求登记为异步 AI 任务
- 返回仍然是 `taskId + status`

请求体示例：

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "请帮我总结这份笔记"
    }
  ],
  "temperature": 0.7,
  "stream": false,
  "metadata": {
    "taskType": "llm_summary",
    "courseId": "course_xxx",
    "resourceId": "resource_xxx"
  }
}
```

## 8. 资源转笔记工作流

### 8.1 工作流接口

- `POST /api/v1/workflows/resource-notes/import`
- `GET /api/v1/workflows/resource-notes/context`
- `POST /api/v1/workflows/resource-notes/parse-tasks/{taskId}/complete`

### 8.2 推荐调用顺序

1. 前端创建导入任务或资源
2. 前端拿到 `taskId`
3. 前端轮询 `GET /api/v1/ai-tasks/{taskId}`
4. 解析完成后调用 `complete`
5. 前端调用 `context` 获取草稿和下一步动作

### 8.3 获取上下文

`GET /api/v1/workflows/resource-notes/context`

查询参数：

- `courseId`
- `resourceId`

返回重点字段：

- `user`
- `course`
- `resource`
- `parseTask`
- `parsedResource`
- `canCreateParseTask`
- `nextActions`

`nextActions` 可能值：

- `select_course`
- `select_resource`
- `create_parse_task`
- `poll_ai_task`
- `review_note_draft`
- `save_to_notes`
- `retry_parse`

### 8.4 完成解析并生成草稿

`POST /api/v1/workflows/resource-notes/parse-tasks/{taskId}/complete`

请求体示例：

```json
{
  "title": "第一章 极限",
  "chapters": [
    {
      "title": "极限定义",
      "content": "极限是......",
      "position": 0
    }
  ],
  "coreConcepts": ["极限", "无穷小"],
  "rawText": "原始文本",
  "parserVersion": "mock-parser-1",
  "createNoteDraft": true,
  "noteDraftTitle": "极限笔记草稿"
}
```

返回重点字段：

- `task`
- `resource`
- `parsedResource`
- `noteDraft`

## 9. 笔记模块

### 9.1 接口列表

- `GET /api/v1/notes`
- `POST /api/v1/notes`
- `GET /api/v1/notes/{noteId}`
- `PATCH /api/v1/notes/{noteId}`
- `DELETE /api/v1/notes/{noteId}`
- `POST /api/v1/notes/{noteId}/blocks`
- `POST /api/v1/notes/{noteId}/relations`

### 9.2 笔记列表

查询参数：

- `page`
- `pageSize`
- `tag`

### 9.3 创建笔记

请求体：

```json
{
  "title": "牛顿第二定律",
  "courseId": "course_xxx",
  "learningSpaceId": "space_xxx",
  "sourceResourceId": "resource_xxx",
  "tags": ["physics", "force"]
}
```

### 9.4 笔记详情

`GET /api/v1/notes/{noteId}`

返回结构：

- `note`
- `blocks`
- `relations`

### 9.5 追加笔记块

`POST /api/v1/notes/{noteId}/blocks`

请求体：

```json
{
  "content": "受力分析是关键",
  "blockType": "paragraph",
  "position": 0,
  "metadata": {}
}
```

### 9.6 添加笔记关系

`POST /api/v1/notes/{noteId}/relations`

请求体：

```json
{
  "targetNoteId": "note_target",
  "relationType": "related",
  "context": "同属动力学基础"
}
```

## 10. 记忆卡片模块

### 10.1 接口列表

- `GET /api/v1/memory/cards`
- `POST /api/v1/memory/cards`
- `POST /api/v1/memory/cards/{cardId}/reviews`

### 10.2 创建卡片

请求体：

```json
{
  "front": "什么是极限？",
  "back": "函数值无限逼近某个值",
  "sourceNoteId": "note_xxx",
  "tags": ["math"]
}
```

### 10.3 记录复习

请求体：

```json
{
  "grade": "good"
}
```

## 11. 思考模式模块

### 11.1 接口列表

- `POST /api/v1/thinking/sessions`
- `GET /api/v1/thinking/sessions/{sessionId}`
- `POST /api/v1/thinking/sessions/{sessionId}/prompts`
- `POST /api/v1/thinking/sessions/{sessionId}/suggestions`
- `POST /api/v1/thinking/sessions/{sessionId}/complete`

### 11.2 开始思考会话

请求体：

```json
{
  "noteId": "note_xxx",
  "goal": "检查我对反向传播的理解漏洞"
}
```

### 11.3 添加提示

请求体：

```json
{
  "content": "如果梯度为 0 会发生什么？",
  "promptType": "socratic"
}
```

### 11.4 添加修订建议

请求体：

```json
{
  "summary": "建议补充链式法则推导",
  "suggestedBlocks": ["补一段链式法则示例"]
}
```

## 12. 费曼模式模块

### 12.1 接口列表

- `POST /api/v1/feynman/sessions`
- `GET /api/v1/feynman/sessions/{sessionId}`
- `POST /api/v1/feynman/sessions/{sessionId}/questions`
- `POST /api/v1/feynman/sessions/{sessionId}/evaluation`

### 12.2 创建费曼会话

请求体：

```json
{
  "conceptId": null,
  "noteId": "note_xxx",
  "conceptName": "反向传播",
  "explanation": "反向传播就是把误差从后往前传递并计算梯度"
}
```

### 12.3 添加追问

请求体：

```json
{
  "question": "为什么链式法则在这里成立？"
}
```

### 12.4 写入评估

请求体：

```json
{
  "score": 80,
  "feedback": "整体解释清楚，但缺少例子",
  "followUpQuestions": [
    "请举一个简单的神经网络例子"
  ]
}
```

## 13. 知识图谱模块

### 13.1 接口列表

- `GET /api/v1/knowledge-graph`
- `POST /api/v1/knowledge-graph/concepts`
- `POST /api/v1/knowledge-graph/relations`
- `PUT /api/v1/knowledge-graph/mastery`

### 13.2 upsert 概念

请求体：

```json
{
  "name": "极限",
  "courseId": "course_xxx",
  "sourceNoteIds": ["note_1", "note_2"]
}
```

### 13.3 建立概念关系

请求体：

```json
{
  "sourceConceptId": "concept_1",
  "targetConceptId": "concept_2",
  "relationType": "prerequisite",
  "weight": 1
}
```

### 13.4 更新掌握状态

请求体：

```json
{
  "conceptId": "concept_1",
  "level": "learning",
  "confidence": 0.7,
  "evidence": ["完成了对应练习", "做过一次费曼解释"]
}
```

## 14. 社区模块

### 14.1 接口列表

- `GET /api/v1/community/assets`
- `POST /api/v1/community/assets`
- `POST /api/v1/community/assets/{assetId}/posts`
- `POST /api/v1/community/interactions`
- `POST /api/v1/community/assets/{assetId}/collections`
- `GET /api/v1/community/contributions`

### 14.2 公开资产列表

查询参数：

- `page`
- `pageSize`
- `tag`

说明：

- `GET /community/assets` 当前不强制登录
- 其余社区写操作需要登录

### 14.3 发布共享资产

请求体：

```json
{
  "title": "高数极限笔记",
  "assetType": "note",
  "sourceId": "note_xxx",
  "visibility": "public",
  "description": "适合期末复习",
  "tags": ["math", "calculus"]
}
```

### 14.4 发帖

请求体：

```json
{
  "body": "这份笔记的第二部分讲得很清楚"
}
```

### 14.5 互动

请求体：

```json
{
  "targetId": "asset_xxx",
  "interactionType": "like",
  "body": null
}
```

评论时：

```json
{
  "targetId": "asset_xxx",
  "interactionType": "comment",
  "body": "这个总结很好"
}
```

### 14.6 收藏到我的体系

`POST /api/v1/community/assets/{assetId}/collections`

请求体可选：

```json
{
  "noteId": "note_xxx"
}
```

## 15. 前端联调建议

推荐的前端 API 封装顺序：

1. `auth`
2. `users`
3. `courses`
4. `resources`
5. `aiTasks`
6. `resourceNotesWorkflow`
7. `notes`
8. `memory`
9. `thinking`
10. `feynman`
11. `knowledgeGraph`
12. `community`

推荐优先打通的真实联调链路：

1. 登录
2. 获取当前用户
3. 课程列表 / 创建课程
4. 资源创建
5. 创建解析任务
6. 轮询 `ai-tasks`
7. 获取 `resource-notes/context`
8. 查看或编辑 `noteDraft`

## 16. 当前需要前端注意的限制

- 当前资源上传不是 multipart 文件上传接口，先按“资源元数据登记”处理。
- OpenAI 兼容接口当前返回的是异步任务，不是同步 completion 文本。
- worker 和外部 AI provider 目前仍以 mock 能力为主，前端联调时不要假设一定会拿到真实模型生成内容。
- 如果新增字段或改动接口 shape，先更新 `contracts/openapi.yaml`，再改前后端代码。
