# 功能覆盖对照

本文档用于对照 `old_plan/collaboration/商业策划书.docx` 中的产品规划和当前项目功能计划。

## 商业策划书功能主线

四大核心模式：

- 速记模式：课堂、讲座和自学场景下的低负担记录、录音跟进、时间流沉淀和 AI 结构化梳理。
- 思考模式：通过苏格拉底式追问、逻辑校验和认知切片沉淀，保护用户的独立推导过程。
- 记忆模式：将笔记转化为记忆卡片，并根据掌握情况和遗忘规律安排复习。
- 费曼模式：让用户用文字或语音讲解知识，由 AI 追问、评估和暴露理解漏洞。

三大支撑体系：

- 资源转笔记：导入文档、音视频、图片或网页链接，生成可编辑的半结构化笔记。
- 笔记管理：通过课程、章节、知识点、双链关系和知识图谱管理长期知识资产。
- 共享社区：围绕课程共享优质笔记结构、知识图谱、思考链路、费曼对话流和复习模板。

基础系统能力：

- 用户、课程和学习空间
- 我的笔记
- 导入导出
- 系统设置和用户偏好
- 学习仪表盘和学习数据

## 当前项目规划状态

| 商业策划书功能 | 项目规划位置 | 状态 |
| --- | --- | --- |
| 速记模式 | `frontend/src/features/quick-notes/`、`backend/app/modules/notes/` | 已规划，已有前端演示。 |
| 思考模式 | `frontend/src/features/thinking/`、`backend/app/modules/thinking/` | 已规划，已有前端演示。 |
| 记忆模式 | `frontend/src/features/memory/`、`backend/app/modules/memory/` | 已规划，已有前端演示。 |
| 费曼模式 | `frontend/src/features/feynman/`、`backend/app/modules/feynman/` | 已规划，已有前端演示。 |
| 资源转笔记 | `frontend/src/features/resource-notes/`、`backend/app/modules/resources/`、`backend/app/modules/import_export/`、`backend/app/services/` | 后端已补齐资源、导入导出、AI 任务和工作流编排。 |
| 笔记管理 | `frontend/src/features/note-management/`、`backend/app/modules/notes/`、`backend/app/modules/knowledge_graph/` | 已补齐规划。 |
| 共享社区 | `frontend/src/features/community/`、`backend/app/modules/community/` | 已补齐规划。 |
| 系统设置 | `frontend/src/features/settings/`、`backend/app/modules/users/` | 已补齐规划。 |
| 学习仪表盘 | `frontend/src/features/dashboard/`、`backend/app/modules/knowledge_graph/`、`backend/app/modules/memory/` | 已规划，已有前端演示。 |
