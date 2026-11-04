"""Agent 运行参数。全部可通过环境变量覆盖，不写死。"""

from __future__ import annotations

import os

# agent.config 可能在 get_settings() 之前被导入，这里先确保 .env 已加载，
# 否则模块级的 os.getenv 读不到环境变量、会退回默认模型。
from app.core.config import _load_dotenv

_load_dotenv()

# 模型：默认使用智谱 glm-4.5（自带深度推理）
AGENT_MODEL = os.getenv("MUDUO_AGENT_MODEL", "glm-4.5")

# 推理等级：high / medium / low，留空则不传该参数
AGENT_REASONING_EFFORT = os.getenv("MUDUO_AGENT_REASONING_EFFORT", "high").strip() or None

# 单次对话最多执行多少步工具调用，防止死循环
AGENT_MAX_STEPS = int(os.getenv("MUDUO_AGENT_MAX_STEPS", "8"))

# 单次对话总超时（秒）
AGENT_TIMEOUT_SECONDS = int(os.getenv("MUDUO_AGENT_TIMEOUT", "180"))

# 携带多少条历史消息（避免上下文爆炸）
AGENT_MAX_HISTORY = int(os.getenv("MUDUO_AGENT_MAX_HISTORY", "20"))

# 模型温度：Agent 场景偏低，保证工具选择稳定
AGENT_TEMPERATURE = float(os.getenv("MUDUO_AGENT_TEMPERATURE", "0.3"))
