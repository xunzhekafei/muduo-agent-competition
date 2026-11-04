# 木铎 CLI 学习导师（基于 myagent-prototype 壳子）

把本仓库后端的 14 个学习工具接到一个 Claude Code 风格的 Agent 壳子上，得到一个命令行版学习导师。

- 壳子：<https://github.com/xunzhekafei/myagent-prototype>（MIT，独立仓库）
- 本目录是**壳子的项目内扩展**：`muduo_tools.py` 负责把后端工具包装成 `@beta_tool`，
  并复用 `backend/app/agent/prompts.py` 的系统提示词（单一来源）

## 使用

```bash
# 1. 克隆壳子
git clone https://github.com/xunzhekafei/myagent-prototype.git
cd myagent-prototype

# 2. 把本目录的 muduo_tools.py、smoke*.py、skills/ 拷到壳子根目录
#    并让壳子能定位到本仓库后端（默认相对路径 ../muduo-agent/backend，可用环境变量覆盖）
export MUDEO_BACKEND=/path/to/muduo-agent/backend
export ANTHROPIC_API_KEY=<DeepSeek 密钥>

# 3. 冒烟 + 启动
python smoke_muduo_tools.py
python agent.py
```

详细架构与后续路线见 `MUDEO.md`。
