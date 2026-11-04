# ADR-0001：外部服务 Provider 抽象

日期：2026-05-07

## 状态

已接受

## 背景

Muduo 需要接入 LLM、OCR、ASR、Embedding 和对象存储能力。不同能力后续可能来自 OpenAI 兼容接口、云厂商 API、本地模型或对象存储服务。业务模块如果直接依赖具体 SDK，会导致接口联调、测试和供应商替换成本过高。

## 决策

- 在 `backend/app/integrations/` 中定义 provider 协议和统一输入输出结构。
- MVP 阶段默认使用本地 `mock` provider，保证离线开发和测试稳定。
- 业务模块和 worker 只依赖 provider 协议，不直接依赖第三方 SDK。
- 真实供应商接入时新增 adapter，并通过环境变量选择 provider。
- LLM 对外 API 可以保留 OpenAI Chat Completions 兼容形状，但业务层仍通过 `LLMProvider` 抽象调用。

## 后果

- 前后端 API 契约不会因为更换模型或对象存储供应商而变化。
- 后续接入真实 provider 时，需要补充 adapter、密钥配置和集成测试。
- mock provider 只用于开发和单元测试，不能代表真实模型质量或性能。
