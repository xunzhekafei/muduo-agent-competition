# 跨模块服务编排

本文档记录第九阶段的跨模块协作边界。目标是让资源、AI 任务、笔记草稿和后续知识模块通过 service 或事件协作，避免业务模块直接读写彼此内部实现。

## 资源转笔记工作流

入口位于 `backend/app/services/resource_note_workflow.py`，HTTP 路由位于 `backend/app/services/routes.py`。

主要步骤：

1. 前端通过 `POST /api/v1/workflows/resource-notes/import` 登记资源导入。
2. 服务复用 `ImportExportService` 创建导入任务、资源记录和 `resource_parse` AI 任务。
3. 前端通过 `GET /api/v1/workflows/resource-notes/context` 获取用户、课程、资源、任务和解析结果的组合上下文。
4. worker 或后续后台编排在资源解析完成后调用 `POST /api/v1/workflows/resource-notes/parse-tasks/{taskId}/complete`。
5. 服务写入 `parsed_resources`、生成初始 `noteDraft` 桥接对象，并把 `noteDraftId` 写回解析结果和 AI 任务输出。
6. `AiTaskService` 统一把任务状态更新为 `succeeded`，并同步资源状态为 `parsed`。

## Notes 对接方式

`notes` 模块已切换为 SQLAlchemy 持久化模型，并暴露 `NoteService` 与 `/api/v1/notes` 系列接口。资源转笔记工作流仍可通过 service 层创建笔记草稿，并把 `noteDraftId` 存入 `parsed_resources.note_draft_id`；后续只需要把工作流中的桥接对象替换为真实 `NoteModel` 创建逻辑，不需要修改前端 API 契约。

## 前端对接字段

前端资源转笔记页面应优先使用：

- `job.resourceId`
- `job.taskId`
- `context.resource`
- `context.parseTask`
- `context.parsedResource`
- `context.nextActions`
- `completion.noteDraft`

任务轮询仍使用统一接口 `GET /api/v1/ai-tasks/{taskId}`。
