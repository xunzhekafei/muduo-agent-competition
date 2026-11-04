# 资源转笔记工作流 API

该工作流把资源导入、资源解析、笔记草稿生成和任务状态轮询串起来。

## 入口

- `POST /api/v1/workflows/resource-notes/import`
- `GET /api/v1/workflows/resource-notes/context`
- `POST /api/v1/workflows/resource-notes/parse-tasks/{taskId}/complete`

## 关键字段

- `resourceId`：资源主键
- `taskId`：统一 AI 任务主键
- `parsedResource`：资源解析结果
- `noteDraft`：初始笔记草稿桥接对象
- `nextActions`：前端下一步操作提示

## 流程

1. 导入工作流先创建资源记录和 `resource_parse` 任务。
2. 轮询 `GET /api/v1/ai-tasks/{taskId}` 获取任务状态。
3. 解析完成后调用 `complete` 接口写回解析结果和草稿。
4. 前端根据 `context` 里的 `nextActions` 决定是否进入笔记编辑页。
