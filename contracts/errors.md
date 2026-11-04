# 错误响应契约

所有 API 错误响应使用统一结构：

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "资源未找到",
    "details": {}
  }
}
```

字段说明：

- `code`：稳定的机器可读错误码，前端应优先依赖该字段做分支处理。
- `message`：面向用户或开发者的中文错误说明。
- `details`：结构化错误详情；没有详情时返回空对象。

## 基础错误码

| code | HTTP 状态 | 说明 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | 请求参数校验失败。 |
| `RESOURCE_NOT_FOUND` | 404 | 资源或路由不存在。 |
| `UNAUTHORIZED` | 401 | 用户未认证或 token 无效。 |
| `FORBIDDEN` | 403 | 用户无权限访问资源。 |
| `CONFLICT` | 409 | 请求与现有资源状态冲突。 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误。 |
| `INVALID_CREDENTIALS` | 401 | 登录邮箱或密码错误。 |
| `TOKEN_EXPIRED` | 401 | token 已过期，需要刷新或重新登录。 |
| `UNSUPPORTED_FILE_TYPE` | 415 | 上传或导入的文件类型不受支持。 |
| `RESOURCE_PARSE_FAILED` | 500 | 资源解析任务失败。 |
| `AI_TASK_FAILED` | 500 | AI 异步任务执行失败。 |
| `IMPORT_EXPORT_FAILED` | 500 | 导入或导出任务失败。 |

## 模块级错误码（预留）

以下错误码已规划但后端尚未实现，后续按需补充：

| code | HTTP 状态 | 适用模块 | 说明 |
| --- | --- | --- | --- |
| `NOTE_NOT_FOUND` | 404 | notes | 笔记不存在或不属于当前用户。 |
| `NOTE_RELATION_CONFLICT` | 409 | notes | 笔记关系重复或指向自身。 |
| `MEMORY_CARD_NOT_FOUND` | 404 | memory | 记忆卡片不存在或不属于当前用户。 |
| `REVIEW_SESSION_CLOSED` | 409 | memory | 复习会话已结束，不能继续写入记录。 |
| `THINKING_SESSION_NOT_FOUND` | 404 | thinking | 思考会话不存在或不属于当前用户。 |
| `THINKING_SESSION_CLOSED` | 409 | thinking | 思考会话已完成或取消。 |
| `FEYNMAN_SESSION_NOT_FOUND` | 404 | feynman | 费曼会话不存在或不属于当前用户。 |
| `FEYNMAN_SESSION_CLOSED` | 409 | feynman | 费曼会话已评估或取消。 |
| `CONCEPT_NOT_FOUND` | 404 | knowledge_graph | 概念不存在或不属于当前用户。 |
| `CONCEPT_RELATION_CONFLICT` | 409 | knowledge_graph | 概念关系重复、非法或指向自身。 |
| `SHARED_ASSET_NOT_FOUND` | 404 | community | 共享资产不存在或不可见。 |
| `COMMUNITY_INTERACTION_CONFLICT` | 409 | community | 重复收藏、重复互动或互动目标非法。 |

后续新增业务错误码时，应先更新本文档，再实现后端和前端处理逻辑。
