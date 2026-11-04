# ChaiYifan 后端任务清单

本文档列出 ChaiYifan 负责的后端功能范围和建议推进顺序。开发时以 `BUILD.md`、`README.md` 和 `contracts/` 为准，涉及前端展示字段时先和 MaTianyi 对齐，涉及 ZhangYuxuan 负责模块时通过 service 或契约协作。

## 负责范围

主要负责目录：

- `backend/app/core/`
- `backend/app/api/`
- `backend/app/db/`
- `backend/app/schemas/`
- `backend/app/services/`
- `backend/app/integrations/`
- `backend/app/modules/auth/`
- `backend/app/modules/users/`
- `backend/app/modules/courses/`
- `backend/app/modules/resources/`
- `backend/app/modules/import_export/`
- `backend/app/modules/ai_tasks/`
- `backend/migrations/`
- `infra/`

协作目录：

- `contracts/`
- `backend/tests/`
- `docs/architecture/`
- `docs/api/`
- `scripts/`

## 第一阶段：后端基础骨架

- [x] 选定后端框架和依赖管理方式，默认使用 Python + FastAPI。
- [x] 完善 `backend/pyproject.toml`，加入 FastAPI、Uvicorn、Pydantic、测试工具等基础依赖。
- [x] 实现 `backend/app/main.py`，提供应用入口和基础健康检查。
- [x] 建立 `backend/app/core/`：
  - [x] 配置加载
  - [x] 日志配置
  - [x] 错误类型和统一异常处理
  - [x] CORS 和基础中间件
- [x] 建立 `backend/app/api/`：
  - [x] API v1 路由注册
  - [x] 模块 route 挂载规范
  - [x] 统一响应结构
- [x] 更新 `.env.example`，记录后端启动必需环境变量。

验收标准：

- [x] Uvicorn 应用启动流程已验证；当前环境 `8000` 端口绑定冲突，实际 HTTP 验证使用 `18010`。
- [x] `/health` 或同等健康检查接口可访问。
- [x] 基础错误响应符合 `contracts/errors.md`。

## 第二阶段：契约和共享 schema

- [x] 和 MaTianyi、ZhangYuxuan 先对齐 MVP 需要的接口清单。
  - 当前先基于前端已有页面和商业策划书功能理解拟定 MVP 契约；后续联调和落地时统一复查修正。
- [x] 完善 `contracts/openapi.yaml`：
  - [x] 用户和登录相关接口
  - [x] 课程和学习空间接口
  - [x] 资源上传和解析任务接口
  - [x] 导入导出任务接口
  - [x] AI 任务状态查询接口
- [x] 完善 `contracts/errors.md`：
  - [x] 认证错误
  - [x] 权限错误
  - [x] 资源不存在
  - [x] 文件格式不支持
  - [x] 异步任务失败
- [x] 完善 `contracts/enums.md`：
  - [x] AI 任务状态
  - [x] 资源解析状态
  - [x] 导入导出状态
  - [x] 用户角色
- [x] 完善 `contracts/events.md`：
  - [x] 资源解析完成事件
  - [x] 导入导出完成事件
  - [x] AI 任务完成事件
- [x] 在 `backend/app/schemas/` 中建立共享请求/响应 schema。

验收标准：

- [x] 前端可以基于 `contracts/` 写 mock，不需要猜字段。
- [x] 后端 schema 与 `contracts/openapi.yaml` 字段一致。

## 第三阶段：数据库和迁移

- [x] 在 `backend/app/db/` 中建立数据库连接和 session 管理。
- [x] 建立基础模型规范：
  - [x] 主键策略
  - [x] 创建时间和更新时间
  - [x] 软删除策略，如需要
  - [x] 用户隔离字段
- [x] 设计并实现 ChaiYifan 负责模块的数据模型：
  - [x] 用户
  - [x] 课程
  - [x] 学习空间
  - [x] 上传资源
  - [x] 解析资源
  - [x] AI 任务
  - [x] 导入导出任务
- [x] 建立 `backend/migrations/` 迁移流程。
- [x] 补充数据库初始化和迁移说明。

验收标准：

- [x] 本地数据库可以初始化。
- [x] 迁移可重复执行。
- [x] 模型关系能支撑资源、课程、用户和任务查询。

## 第四阶段：认证和用户模块

- [x] 实现 `backend/app/modules/auth/`：
  - [x] 登录
  - [x] token refresh
  - [x] 登出或 session 失效
  - [x] 当前用户获取
- [x] 实现 `backend/app/modules/users/`：
  - [x] 用户资料
  - [x] 用户偏好设置
  - [x] 系统设置相关后端字段
  - [x] 通知和复习提醒偏好预留
- [x] 在 `backend/app/core/` 中提供认证依赖和权限校验基础能力。

验收标准：

- [x] 前端能获取当前用户信息。
- [x] 受保护接口可以识别用户身份。
- [x] 用户偏好能支撑 `frontend/src/features/settings/` 后续实现。

## 第五阶段：课程和学习空间

- [x] 实现 `backend/app/modules/courses/`：
  - [x] 创建课程
  - [x] 查询课程列表
  - [x] 查询课程详情
  - [x] 更新课程信息
  - [x] 删除或归档课程
- [x] 支持课程下的章节、知识点或学习空间基础结构。
- [x] 为资源、笔记、知识图谱等模块提供课程上下文。

验收标准：

- [x] 前端能按课程组织资源和笔记。
- [x] 后续笔记管理、共享社区和知识图谱可以复用课程结构。

## 第六阶段：资源和导入导出

- [x] 实现 `backend/app/modules/resources/`：
  - [x] 上传文件元数据
  - [x] 资源列表
  - [x] 资源详情
  - [x] 资源解析状态
  - [x] 资源删除或归档
- [x] 实现 `backend/app/modules/import_export/`：
  - [x] PDF、Markdown、图片、音频、视频和网页链接导入任务登记
  - [x] 导入任务状态查询
  - [x] 导入结果绑定到资源或笔记
  - [x] 笔记导出任务登记
  - [x] 导出结果文件管理
- [x] 与 `ai_tasks` 和 `workers` 协作，耗时解析任务走异步任务。
- [ ] 和 ZhangYuxuan 对齐导入结果如何交给 `notes` 模块。

验收标准：

- [x] 前端资源转笔记页面可以创建资源解析任务。
- [x] 前端可以轮询任务状态。
- [x] 解析结果可以进入后续笔记流程。

## 第七阶段：AI 任务生命周期

- [x] 实现 `backend/app/modules/ai_tasks/`：
  - [x] 创建 AI 任务
  - [x] 查询任务状态
  - [x] 取消任务
  - [x] 记录任务输入、输出摘要和错误信息
- [x] 统一任务状态：
  - [x] `queued`
  - [x] `running`
  - [x] `succeeded`
  - [x] `failed`
  - [x] `canceled`
- [x] 提供给以下模块复用：
  - [x] 资源解析
  - [x] LLM 总结
  - [x] 记忆卡片生成
  - [x] 费曼评估
  - [x] 知识图谱更新
  - [x] 共享社区内容索引
- [x] 预留 OpenAI Chat Completions 兼容请求入口，后续可接真实 LLM provider。

验收标准：

- [x] 所有长任务都能返回 `taskId`。
- [x] 前端只需要通过统一任务接口轮询状态。
- [x] 错误码和状态与 `contracts/` 一致。

## 第八阶段：外部服务集成

- [x] 在 `backend/app/integrations/` 中建立外部服务抽象：
  - [x] LLM provider
  - [x] OCR provider
  - [x] ASR provider
  - [x] Embedding provider
  - [x] 对象存储 provider
- [x] 暂时使用成熟第三方 API 或本地 mock provider，不在 MVP 阶段自研模型。
- [x] 为不同 provider 定义统一输入输出结构。
- [x] 记录 provider 选择为 ADR。

验收标准：

- [x] 业务模块不直接依赖具体第三方 SDK。
- [x] 后续替换模型供应商时不影响 API 契约。

## 第九阶段：跨模块服务和联调

- [x] 在 `backend/app/services/` 中实现跨模块编排：
  - [x] 资源导入后创建解析任务
  - [x] 解析完成后生成初始笔记草稿
  - [x] 用户课程上下文和资源上下文组合
  - [x] AI 任务状态与业务结果关联
- [x] 和 ZhangYuxuan 对齐：
  - [x] `notes` 接收资源解析结果的方式
  - [x] `memory` 使用 AI 任务生成卡片的方式
  - [x] `knowledge_graph` 使用资源和笔记数据的方式
  - [x] `community` 复用课程、用户和共享资产的方式
- [x] 和 MaTianyi 对齐：
  - [x] API wrapper 字段
  - [x] mock 数据
  - [x] 错误展示
  - [x] 任务轮询体验
- 对接约定见 `docs/architecture/cross-module-workflows.md` 和 `contracts/openapi.yaml`。

验收标准：

- [x] 前端资源转笔记、设置页、课程基础数据能接入真实 API。
- [x] 后端模块之间通过 service 或事件协作，不互相硬耦合内部实现。

## 第十阶段：测试、文档和部署准备

- [x] 在 `backend/tests/` 中补充测试：
  - [x] core 配置和错误处理测试
  - [x] auth API 测试
  - [x] users API 测试
  - [x] courses API 测试
  - [x] resources API 测试
  - [x] import_export API 测试
  - [x] ai_tasks API 测试
- [x] 在 `docs/api/` 中补充接口使用说明。
- [x] 在 `docs/architecture/` 中补充后端架构说明。
- [x] 维护 `infra/docker/` 和 `infra/nginx/`。
- [x] 补充本地启动脚本或 Makefile，如团队需要。

验收标准：

- [x] 后端测试命令可以稳定运行。
- [x] 新成员能按文档启动后端。
- [x] API 契约、README、BUILD 和实际实现保持一致。

## 建议优先级

MVP 第一优先级：

1. 后端基础骨架
2. API 契约
3. 用户和课程
4. 资源上传和导入任务
5. AI 任务状态轮询

MVP 第二优先级：

1. 导入导出完整流程
2. 外部服务 provider 抽象
3. 数据库迁移和测试
4. 与前端资源转笔记页面联调

后续增强：

1. 对象存储
2. 复杂权限
3. 多模型路由
4. nginx 和 Docker 部署配置

ChaiYifan部分任务基本完成