# 异步事件契约

本文档记录后端异步任务、worker 和未来实时通知可以使用的事件名称与 payload 约定。MVP 阶段可以先使用轮询接口，事件契约用于保证后续切换 WebSocket、SSE 或消息队列时不改变业务语义。

## 事件命名规则

事件名使用小写域名式结构：

```text
domain.action.version
```

示例：

```text
resource.parsed.v1
ai_task.succeeded.v1
```

## task.status_changed.v1

通用异步任务状态变化。用于 worker 与业务模块之间同步任务生命周期。

```json
{
  "eventId": "evt_120",
  "eventName": "task.status_changed.v1",
  "occurredAt": "2026-05-07T12:00:00Z",
  "payload": {
    "taskId": "task_123",
    "taskType": "memory_card_generation",
    "status": "running",
    "updatedAt": "2026-05-07T12:00:00Z"
  }
}
```

## task.failed.v1

通用异步任务失败。

```json
{
  "eventId": "evt_121",
  "eventName": "task.failed.v1",
  "occurredAt": "2026-05-07T12:00:30Z",
  "payload": {
    "taskId": "task_123",
    "taskType": "memory_card_generation",
    "status": "failed",
    "error": {
      "code": "TASK_FAILED",
      "message": "worker execution failed"
    }
  }
}
```

## resource.parse_started.v1

资源解析开始。

```json
{
  "eventId": "evt_123",
  "eventName": "resource.parse_started.v1",
  "occurredAt": "2026-05-07T12:00:00Z",
  "payload": {
    "resourceId": "res_123",
    "taskId": "task_123",
    "courseId": "course_123"
  }
}
```

## resource.parsed.v1

资源解析成功。

```json
{
  "eventId": "evt_124",
  "eventName": "resource.parsed.v1",
  "occurredAt": "2026-05-07T12:01:00Z",
  "payload": {
    "resourceId": "res_123",
    "taskId": "task_123",
    "courseId": "course_123",
    "noteDraftId": "note_123"
  }
}
```

## resource.parse_failed.v1

资源解析失败。

```json
{
  "eventId": "evt_125",
  "eventName": "resource.parse_failed.v1",
  "occurredAt": "2026-05-07T12:02:00Z",
  "payload": {
    "resourceId": "res_123",
    "taskId": "task_123",
    "errorCode": "RESOURCE_PARSE_FAILED",
    "errorMessage": "资源解析失败"
  }
}
```

## import_export.succeeded.v1

导入或导出任务成功。

```json
{
  "eventId": "evt_126",
  "eventName": "import_export.succeeded.v1",
  "occurredAt": "2026-05-07T12:03:00Z",
  "payload": {
    "jobId": "job_123",
    "jobType": "import",
    "resourceId": "res_123",
    "resultUrl": null
  }
}
```

## import_export.failed.v1

导入或导出任务失败。

```json
{
  "eventId": "evt_127",
  "eventName": "import_export.failed.v1",
  "occurredAt": "2026-05-07T12:04:00Z",
  "payload": {
    "jobId": "job_123",
    "jobType": "export",
    "errorCode": "IMPORT_EXPORT_FAILED",
    "errorMessage": "导出任务失败"
  }
}
```

## ai_task.succeeded.v1

AI 任务成功。

```json
{
  "eventId": "evt_128",
  "eventName": "ai_task.succeeded.v1",
  "occurredAt": "2026-05-07T12:05:00Z",
  "payload": {
    "taskId": "task_123",
    "taskType": "llm_summary",
    "resourceId": "res_123"
  }
}
```

## ai_task.failed.v1

AI 任务失败。

```json
{
  "eventId": "evt_129",
  "eventName": "ai_task.failed.v1",
  "occurredAt": "2026-05-07T12:06:00Z",
  "payload": {
    "taskId": "task_123",
    "taskType": "llm_summary",
    "errorCode": "AI_TASK_FAILED",
    "errorMessage": "AI 任务失败"
  }
}
```

## notes.note_created.v1

笔记创建成功。

```json
{
  "eventId": "evt_130",
  "eventName": "notes.note_created.v1",
  "occurredAt": "2026-05-07T12:07:00Z",
  "payload": {
    "noteId": "note_123",
    "ownerId": "user_123",
    "courseId": "course_123"
  }
}
```

## memory.cards_generation_requested.v1

请求从笔记生成记忆卡片。

```json
{
  "eventId": "evt_131",
  "eventName": "memory.cards_generation_requested.v1",
  "occurredAt": "2026-05-07T12:08:00Z",
  "payload": {
    "taskId": "task_123",
    "ownerId": "user_123",
    "noteId": "note_123"
  }
}
```

## feynman.evaluation_requested.v1

请求评估费曼讲解会话。

```json
{
  "eventId": "evt_132",
  "eventName": "feynman.evaluation_requested.v1",
  "occurredAt": "2026-05-07T12:09:00Z",
  "payload": {
    "taskId": "task_123",
    "ownerId": "user_123",
    "sessionId": "feynman_123"
  }
}
```

## knowledge_graph.update_requested.v1

请求根据笔记更新知识图谱。

```json
{
  "eventId": "evt_133",
  "eventName": "knowledge_graph.update_requested.v1",
  "occurredAt": "2026-05-07T12:10:00Z",
  "payload": {
    "taskId": "task_123",
    "ownerId": "user_123",
    "sourceNoteIds": ["note_123"]
  }
}
```

## community.asset_index_requested.v1

请求索引社区共享资产。

```json
{
  "eventId": "evt_134",
  "eventName": "community.asset_index_requested.v1",
  "occurredAt": "2026-05-07T12:11:00Z",
  "payload": {
    "taskId": "task_123",
    "assetId": "asset_123",
    "ownerId": "user_123"
  }
}
```
