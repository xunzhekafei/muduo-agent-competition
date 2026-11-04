#!/usr/bin/env bash
# 木铎演示环境一键部署（Ubuntu 22.04/24.04，root 运行，幂等可重复执行）
#
# 用法（部署包解压在 /opt/muduo-agent 后）：
#   bash /opt/muduo-agent/deploy/deploy.sh
#
# 做的事：装系统依赖 → 建 venv 装 Python 依赖 → 检查 .env →
#         初始化演示数据 → systemd 服务 → Nginx 配置 → 本机验收
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$APP_DIR/backend"
DIST="$APP_DIR/frontend/dist"
ENV_FILE="$BACKEND/.env"
SERVICE_NAME="muduo"

echo "== [1/7] 环境检查 =="
[ "$(id -u)" -eq 0 ] || { echo "请用 root 运行（sudo bash $0）"; exit 1; }
command -v python3 >/dev/null || { echo "缺少 python3"; exit 1; }
python3 -c 'import sys; assert sys.version_info >= (3, 11), "需要 Python 3.11+"' \
  || { echo "Python 版本过低"; exit 1; }
[ -d "$BACKEND" ] || { echo "找不到 $BACKEND"; exit 1; }
[ -d "$DIST" ] || { echo "找不到前端 dist：$DIST"; exit 1; }

echo "== [2/7] 安装系统依赖（nginx / python3-venv） =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-venv nginx curl >/dev/null

echo "== [3/7] Python 虚拟环境与依赖 =="
if [ ! -x "$BACKEND/venv/bin/python" ]; then
  python3 -m venv "$BACKEND/venv"
fi
"$BACKEND/venv/bin/pip" install -q --upgrade pip
"$BACKEND/venv/bin/pip" install -q -r "$BACKEND/requirements.txt"

echo "== [4/7] 检查 .env =="
[ -f "$ENV_FILE" ] || { echo "缺少 $ENV_FILE"; exit 1; }
if grep -q '^MUDUO_AUTH_SECRET_KEY=muduo-dev-secret-change-me' "$ENV_FILE"; then
  SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  sed -i "s|^MUDUO_AUTH_SECRET_KEY=.*|MUDUO_AUTH_SECRET_KEY=$SECRET|" "$ENV_FILE"
  echo "  已生成随机鉴权密钥"
elif ! grep -q '^MUDUO_AUTH_SECRET_KEY=' "$ENV_FILE"; then
  SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  printf 'MUDUO_AUTH_SECRET_KEY=%s\n' "$SECRET" >> "$ENV_FILE"
  echo "  已追加随机鉴权密钥"
else
  echo "  鉴权密钥已配置"
fi
if grep -q '^MUDUO_LLM_PROVIDER=mock' "$ENV_FILE"; then
  echo "  ⚠️  MUDUO_LLM_PROVIDER=mock —— 编辑 $ENV_FILE 改成 zhipu/deepseek 并填好 API Key"
fi
if grep -q '^MUDUO_EMBEDDING_PROVIDER=mock' "$ENV_FILE"; then
  echo "  ⚠️  MUDUO_EMBEDDING_PROVIDER=mock —— 知识库将降级为关键词检索"
fi

echo "== [5/7] 初始化演示数据（幂等） =="
(cd "$BACKEND" && ./venv/bin/python scripts/seed_demo.py)

echo "== [6/7] systemd 服务 =="
cat >"/etc/systemd/system/$SERVICE_NAME.service" <<UNIT
[Unit]
Description=Muduo API (competition demo)
After=network.target

[Service]
WorkingDirectory=$BACKEND
ExecStart=$BACKEND/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1
systemctl restart "$SERVICE_NAME"

echo "== [7/7] Nginx 配置 =="
cat >"/etc/nginx/sites-available/$SERVICE_NAME" <<NGINX
server {
    listen 80 default_server;
    server_name _;

    root $DIST;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_buffering off;      # SSE 流式对话必须
        proxy_read_timeout 300s;  # Agent 多步工具调用较慢
    }

    location / {
        try_files \$uri /index.html;
    }
}
NGINX
ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/$SERVICE_NAME"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "== 本机验收 =="
sleep 2
HEALTH="$(curl -fsS http://127.0.0.1:8000/health || true)"
echo "  后端 /health: ${HEALTH:-失败！查看 journalctl -u $SERVICE_NAME -n 50}"
CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/ || true)"
echo "  前端 HTTP 状态: $CODE"

echo
echo "✅ 部署完成。浏览器访问：http://<本机公网IP>/"
echo "   演示账号 student@example.com，密码见 seed_demo 输出"
echo "   排查：systemctl status $SERVICE_NAME / journalctl -u $SERVICE_NAME -n 100"
