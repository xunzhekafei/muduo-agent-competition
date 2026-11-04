# 共享枚举契约

本文档记录前后端都需要稳定使用的枚举值。新增、删除或重命名枚举值前，必须先同步修改本文档和 `contracts/openapi.yaml`。

枚举值统一使用小写 snake_case 或单词小写形式，HTTP API、worker payload、异步事件和 mock 数据必须保持一致。

## 用户角色

| value | 说明 |
| --- | --- |
| `student` | 学生用户。 |
| `teacher` | 教师用户，预留给 To B 或教学端。 |
| `admin` | 管理员。 |

## 资源类型

| value | 说明 |
| --- | --- |
| `pdf` | PDF 文档。 |
| `ppt` | PPT 或演示文稿。 |
| `markdown` | Markdown 文档。 |
| `image` | 图片。 |
| `audio` | 音频。 |
| `video` | 视频。 |
| `webpage` | 网页链接。 |
| `text` | 纯文本。 |
| `other` | 其他类型。 |

## 资源解析状态

| value | 说明 |
| --- | --- |
| `uploaded` | 已登记或上传，尚未解析。 |
| `parsing` | 正在解析。 |
| `parsed` | 解析成功。 |
| `failed` | 解析失败。 |
| `archived` | 已归档或删除。 |

## AI 任务类型

| value | 说明 |
| --- | --- |
| `resource_parse` | 资源解析。 |
| `ocr` | 图片或文档 OCR。 |
| `asr` | 音频或视频转写。 |
| `llm_summary` | LLM 总结或结构化整理。 |
| `memory_card_generation` | 记忆卡片生成。 |
| `feynman_evaluation` | 费曼讲解评估。 |
| `knowledge_graph_update` | 知识图谱更新。 |
| `community_indexing` | 共享社区内容索引。 |

## AI 任务状态

| value | 说明 |
| --- | --- |
| `queued` | 已入队。 |
| `running` | 执行中。 |
| `succeeded` | 执行成功。 |
| `failed` | 执行失败。 |
| `canceled` | 已取消。 |

## 导入导出任务类型

| value | 说明 |
| --- | --- |
| `import` | 导入任务。 |
| `export` | 导出任务。 |

## 导入导出任务状态

| value | 说明 |
| --- | --- |
| `queued` | 已入队。 |
| `running` | 执行中。 |
| `succeeded` | 执行成功。 |
| `failed` | 执行失败。 |
| `canceled` | 已取消。 |

## 导出格式

| value | 说明 |
| --- | --- |
| `markdown` | Markdown 文件。 |
| `pdf` | PDF 文件。 |
| `json` | JSON 数据文件。 |

## 笔记状态

| value | 说明 |
| --- | --- |
| `draft` | 草稿。 |
| `active` | 正常可用。 |
| `archived` | 已归档。 |

## 笔记块类型

| value | 说明 |
| --- | --- |
| `paragraph` | 段落。 |
| `heading` | 标题。 |
| `quote` | 引用。 |
| `todo` | 待办。 |
| `code` | 代码块。 |
| `table` | 表格。 |
| `ai_summary` | AI 生成摘要。 |
| `thinking` | 思考内容。 |
| `memory_cards` | 记忆卡片。 |
| `formula` | 公式。 |
| `annotation` | 标注。 |
| `relations` | 双链关系。 |

## 笔记关系类型

| value | 说明 |
| --- | --- |
| `backlink` | 反向链接。 |
| `reference` | 引用关系。 |
| `prerequisite` | 前置知识。 |
| `related` | 相关内容。 |

## 记忆复习等级

| value | 说明 |
| --- | --- |
| `again` | 重新学习。 |
| `hard` | 困难。 |
| `good` | 良好。 |
| `easy` | 简单。 |

## 记忆卡片状态

| value | 说明 |
| --- | --- |
| `active` | 正常复习。 |
| `suspended` | 暂停复习。 |
| `archived` | 已归档。 |

## 深度思考会话状态

| value | 说明 |
| --- | --- |
| `active` | 进行中。 |
| `completed` | 已完成。 |
| `canceled` | 已取消。 |

## 深度思考提示类型

| value | 说明 |
| --- | --- |
| `socratic` | 苏格拉底式追问。 |
| `gap_check` | 知识缺口检查。 |
| `counter_example` | 反例挑战。 |
| `revision` | 修改建议。 |

## 费曼会话状态

| value | 说明 |
| --- | --- |
| `active` | 讲解中。 |
| `evaluated` | 已评估。 |
| `canceled` | 已取消。 |

## 概念关系类型

| value | 说明 |
| --- | --- |
| `prerequisite` | 前置概念。 |
| `part_of` | 组成关系。 |
| `contrasts_with` | 对比关系。 |
| `related_to` | 相关概念。 |

## 掌握程度

| value | 说明 |
| --- | --- |
| `unknown` | 未评估。 |
| `learning` | 学习中。 |
| `familiar` | 较熟悉。 |
| `mastered` | 已掌握。 |

## 共享资产类型

| value | 说明 |
| --- | --- |
| `note` | 笔记。 |
| `knowledge_graph` | 知识图谱。 |
| `thinking_chain` | 思考链。 |
| `feynman_session` | 费曼讲解会话。 |
| `review_template` | 复习模板。 |

## 可见性

| value | 说明 |
| --- | --- |
| `private` | 仅自己可见。 |
| `course` | 课程内可见。 |
| `public` | 公开可见。 |

## 社区互动类型

| value | 说明 |
| --- | --- |
| `like` | 点赞。 |
| `comment` | 评论。 |
