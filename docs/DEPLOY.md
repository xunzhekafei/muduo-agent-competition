# 木铎笔记 · 演示环境部署手册（参赛用）

> 目标：在云服务器上部署公网可访问的演示环境 + 匿名测试账号。
> 方案沿用 `RECENT.md` §7-4（Nginx + uvicorn + systemd），按当前代码更新。

## 〇、一键部署（推荐）

> ⚠️ 前端构建注意：生产包必须用同源 API 路径（由 Nginx 反代 `/api/`）。
> 仓库已配 `frontend/.env.production`（`VITE_API_BASE_URL=` 空值 = 同源），
> **改动前端后先 `npm run build` 再打包**；否则页面会去连 `localhost:8000` 而报「无法连接到服务器」。

在本地构建部署包（工作区根目录）：

```bash
tar -czf muduo-deploy.tar.gz \
  --exclude='__pycache__' --exclude='*.pyc' --exclude='venv' --exclude='.pytest_cache' \
  --exclude='muduo-agent/backend/tests' --exclude='muduo-agent/frontend/node_modules' \
  muduo-agent/backend muduo-agent/frontend/dist muduo-agent/deploy \
  muduo-agent/docs/DEPLOY.md muduo-agent/docs/评审体验指引.md
```

上传并执行（Windows PowerShell 可直接用 scp/ssh）：

```powershell
scp .\muduo-deploy.tar.gz root@<服务器IP>:/root/
ssh root@<服务器IP>
```

```bash
mkdir -p /opt && tar xzf /root/muduo-deploy.tar.gz -C /opt
bash /opt/muduo-agent/deploy/deploy.sh
```

脚本幂等，会完成第二～六节的全部步骤（装依赖 / venv / .env 校验 / 演示数据 / systemd / Nginx / 本机验收）。
以下为手动分步说明，便于排查。

## 一、环境要求

| 项 | 要求 |
|----|------|
| 服务器 | 云服务器 2核4G 起（学生机即可） |
| 系统 | Ubuntu 22.04 / CentOS 均可 |
| Python | 3.10+ |
| Node | 18+（**只在需要重新构建前端时才装**，dist 已构建好可直接上传） |
| Nginx | 前端静态托管 + `/api/*` 反向代理 |

## 二、部署步骤

### 1. 上传代码

需要上传的目录（不需要 `frontend/node_modules`）：

```
backend/          # 后端全部（含 muduo_dev.sqlite3 演示数据库、.env）
frontend/dist/    # 已构建的前端
```

### 2. 安装依赖

```bash
cd /opt/muduo/backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

### 3. 配置 `.env`（backend/.env）

必须配置的键：

```ini
MUDUO_LLM_PROVIDER=zhipu          # 演示用真实模型
MUDUO_EMBEDDING_PROVIDER=zhipu    # 知识库语义检索
MUDUO_AGENT_MODEL=glm-4.5
ZHIPU_API_KEY=sk-xxxx             # 你的密钥
MUDUO_AUTH_SECRET_KEY=<改成随机长字符串>   # ⚠️ 默认值是开发密钥，公网必须改
```

> `.env` 会从**启动目录**加载（`cwd/.env`），所以 systemd 的 `WorkingDirectory` 必须是 backend 目录。

### 4. 初始化演示环境（幂等，可重复跑）

```bash
cd /opt/muduo/backend
venv/bin/python scripts/seed_demo.py
```

输出末尾会打印：演示账号、密码、数据规模、脱敏检查清单。
脚本会确保：匿名账号存在且密码正确、演示数据齐全、知识库索引已建（RAG 开箱可用）。

### 5. 后端服务（systemd 守护）

`/etc/systemd/system/muduo.service`：

```ini
[Unit]
Description=Muduo API
After=network.target

[Service]
WorkingDirectory=/opt/muduo/backend
ExecStart=/opt/muduo/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now muduo
curl http://127.0.0.1:8000/health     # 应返回 {"status": "ok", ...}
```

### 6. Nginx 配置

```nginx
server {
    listen 80;
    server_name <你的域名或服务器IP>;

    root /opt/muduo/frontend/dist;
    index index.html;

    # 后端 API + SSE 流式对话
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;        # ⚠️ SSE 流式必须关
        proxy_read_timeout 300s;    # Agent 多步工具调用较慢
    }

    # 前端 SPA 路由
    location / {
        try_files $uri /index.html;
    }
}
```

前端 `dist` 是按同源 `/api` 构建的，**不需要**改前端配置或重新 build。

### 7. 防火墙 / 安全组

放行 80（HTTP）/ 443（HTTPS，如配证书）。8000 端口只监听本机（上面的配置已经是 127.0.0.1）。

## 三、部署后验收清单

| # | 检查 | 期望 |
|---|------|------|
| 1 | `curl http://<host>/health` | `{"status":"ok"}` |
| 2 | 浏览器打开 `http://<host>` | 登录页正常渲染 |
| 3 | 用演示账号登录 | 成功进入 Agent 对话页 |
| 4 | 发「帮我安排今天的复习」 | 回复含工具调用轨迹，计划具体到卡片 |
| 5 | 发「用我自己的资料讲讲死锁的四个必要条件」 | 轨迹含「知识库检索」，讲解基于笔记原文 |
| 6 | 发「我学完了进程与线程，检验一下我」 | 走费曼流程（追问 + 评分） |
| 7 | 工具轨迹条目点击 | 能深链到对应功能页 |

## 四、脱敏红线（提交前逐项过）

- [ ] 演示账号昵称/邮箱不含学校、学院、学生/教师姓名（seed_demo 已保证，改密码不影响）
- [ ] 演示数据（笔记标题/正文）无学校名、姓名、Logo
- [ ] PPT、视频、截图同样逐页检查——**出现身份信息即取消资格**
- [ ] 操作指引文档（`docs/评审体验指引.md`）里只放链接/账号/密码占位，不留身份信息

## 五、常见问题

| 现象 | 原因与处理 |
|------|-----------|
| 页面提示「无法连接到服务器」 | 前端构建时 API 地址被设成了 `localhost:8000`。用 `npm run build`（`.env.production` 已保证同源）重新构建并上传 `frontend/dist`，浏览器强制刷新 |
| 服务起不来，日志报 `Form data requires "python-multipart"` | 依赖缺失：`venv/bin/pip install python-multipart`（requirements.txt 已补，新部署不会再遇到） |
| 启动报 `ZHIPU_API_KEY 环境变量未设置` | `.env` 不在启动目录，确认 systemd `WorkingDirectory` |
| Agent 回复是 `[mock-agent] ...` | `MUDUO_LLM_PROVIDER` 没配成 zhipu/deepseek（mock 是离线降级） |
| 知识库检索没结果 | 跑一次 `venv/bin/python scripts/seed_demo.py`（重建索引） |
| 流式对话没逐条出结果 | Nginx `proxy_buffering off` 没配 |
| 首页刷新 404 | Nginx 缺 `try_files $uri /index.html` |
