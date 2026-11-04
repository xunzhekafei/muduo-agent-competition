# 木铎笔记命令手册

这份手册只讲一件事：现在能跑哪些实验，以及命令怎么敲。

默认项目目录：

```powershell
cd D:\workplace\Muduo-notes-v1
```

## 0. 先确认环境

```powershell
python --version
node --version
npm --version
git --version
```

建议版本：

- Python：3.11 或更高
- Node.js：18 或更高
- npm：跟随 Node 安装即可
- Git Bash / WSL：如果要用 `make backend-dev` 或 `scripts/*.sh`，Windows 上通常需要它

如果 `python` 不存在，可以试：

```powershell
py --version
```

后面的 `python` 命令也可以替换成 `py`。

## 1. 只跑前端界面实验

适合：先看页面、点功能、改 React 组件。

```powershell
cd D:\workplace\Muduo-notes-v1\frontend
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

成功标志：

- 终端显示 Vite dev server 地址
- 浏览器能打开木铎笔记页面

常用前端命令：

```powershell
cd D:\workplace\Muduo-notes-v1\frontend
npm run dev
npm run build
npm run lint
npm run preview
```

分别表示：

- `npm run dev`：启动前端开发服务器
- `npm run build`：检查能不能打生产包
- `npm run lint`：检查前端代码规范
- `npm run preview`：预览刚 build 出来的生产包

## 2. 只跑后端 API 实验

适合：测 FastAPI、数据库、接口、后端业务逻辑。

第一次跑：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
python -m pip install -e ".[dev]"
alembic upgrade head
python seed_data.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

打开：

```text
http://localhost:8000/docs
```

成功标志：

- 终端出现 `Uvicorn running`
- `http://localhost:8000/health` 返回 `status: ok`
- `http://localhost:8000/api/v1/health` 返回 `status: ok`

以后已经安装过依赖时，可以简化成：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## 3. 同时跑前后端联调实验

适合：真正像用户一样使用整套应用。

先开第一个终端，跑后端：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
python -m pip install -e ".[dev]"
alembic upgrade head
python seed_data.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

再开第二个终端，跑前端：

```powershell
cd D:\workplace\Muduo-notes-v1\frontend
npm install
npm run dev
```

前端如果请求不到后端，在 `frontend\.env.local` 里放：

```text
VITE_API_BASE_URL=http://localhost:8000
```

然后重启前端：

```powershell
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

默认演示账号，也就是前端“体验账号”按钮会填的账号：

```text
email: student@example.com
password: muduo123456
```

开发兜底账号，也可以直接登录；如果不存在，后端会在 development 环境下自动创建：

```text
email: dev@muduo.local
password: muduo123456
```

## 4. 后端一键开发脚本

项目根目录有 Makefile：

```powershell
cd D:\workplace\Muduo-notes-v1
make backend-dev
```

它会做三件事：

- 进入 `backend`
- 安装后端依赖
- 执行数据库迁移并启动后端

注意：这个命令会调用 `bash scripts/backend_dev.sh`。Windows PowerShell 里如果没有 `make` 或 `bash`，请用第 2 节的手动命令。

## 5. 跑后端测试实验

跑全部后端测试：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
pytest tests -q
```

输出更详细：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
pytest tests -v
```

只跑某个测试文件：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
pytest tests\test_memory.py -v
pytest tests\test_notes_memory.py -v
pytest tests\test_courses_api.py -v
pytest tests\test_thinking_feynman.py -v
```

常见实验对应测试：

- 课程/学习空间：`pytest tests\test_courses_api.py -v`
- 笔记/记忆联动：`pytest tests\test_notes_memory.py -v`
- 记忆模式：`pytest tests\test_memory.py -v`
- 思考/费曼模式：`pytest tests\test_thinking_feynman.py -v`
- 资源导入导出：`pytest tests\test_resources_import_export_api.py -v`
- AI 任务：`pytest tests\test_ai_tasks_api.py -v`
- 数据库模型：`pytest tests\test_database_models.py -v`

## 6. 后端质量检查实验

如果有 `make` 和 `bash`：

```powershell
cd D:\workplace\Muduo-notes-v1
make backend-check
```

它会做三件事：

- Python 编译检查
- Ruff 代码规范检查
- Pytest 测试

没有 `make` 时手动跑：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
python -m compileall -q app tests
ruff check app tests
pytest tests -q
```

## 7. API 手动冒烟实验

先确保后端已经启动在 `8000` 端口。

检查健康状态：

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/v1/health
```

用演示账号登录并保存 token：

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/v1/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"student@example.com","password":"muduo123456"}'

$token = $login.data.accessToken
```

如果没有灌演示数据，也可以用开发兜底账号：

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/v1/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"dev@muduo.local","password":"muduo123456"}'

$token = $login.data.accessToken
```

带 token 请求课程列表：

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8000/api/v1/courses `
  -Headers @{ Authorization = "Bearer $token" }
```

带 token 请求笔记列表：

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8000/api/v1/notes `
  -Headers @{ Authorization = "Bearer $token" }
```

## 8. 数据库实验

执行迁移，创建或更新本地 SQLite 表：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
alembic upgrade head
```

查看当前迁移版本：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
alembic current
```

查看迁移历史：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
alembic history
```

重新灌入演示数据：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
python seed_data.py
```

本地默认数据库文件在：

```text
backend\muduo_dev.sqlite3
```

## 9. Docker 后端实验

适合：不想在本机装后端 Python 依赖，只想用容器跑后端和 nginx。

```powershell
cd D:\workplace\Muduo-notes-v1
docker compose -f docker-compose.dev.yml up --build
```

打开：

```text
http://localhost:8000/docs
http://localhost:8080
```

停止：

```powershell
cd D:\workplace\Muduo-notes-v1
docker compose -f docker-compose.dev.yml down
```

## 10. 推荐实验顺序

第一次上手，建议按这个顺序：

1. 跑前端：`cd frontend`，`npm install`，`npm run dev`
2. 跑后端：`cd backend`，安装依赖，迁移，灌数据，启动 uvicorn
3. 打开 Swagger：`http://localhost:8000/docs`
4. 跑后端测试：`pytest tests -q`
5. 跑前端构建：`npm run build`
6. 前后端同时开，浏览器访问 `http://localhost:5173`

最小验证组合：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
pytest tests -q
```

```powershell
cd D:\workplace\Muduo-notes-v1\frontend
npm run build
```

如果这两个都过，说明大部分基础功能没有明显坏掉。

## 11. 常见问题

### 端口 8000 被占用

换一个端口：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
uvicorn app.main:app --reload --port 8001
```

前端也要同步改：

```text
VITE_API_BASE_URL=http://localhost:8001
```

### PowerShell 不能运行 `make`

直接用手动命令：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
python -m pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### PowerShell 不能运行 `pytest` 或 `ruff`

先安装后端开发依赖：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
python -m pip install -e ".[dev]"
```

### 前端请求不到后端

检查 `frontend\.env.local`：

```text
VITE_API_BASE_URL=http://localhost:8000
```

改完以后重启：

```powershell
cd D:\workplace\Muduo-notes-v1\frontend
npm run dev
```

### 登录失败

先重新迁移并灌演示数据：

```powershell
cd D:\workplace\Muduo-notes-v1\backend
alembic upgrade head
python seed_data.py
```

再用：

```text
student@example.com
muduo123456
```

或者：

```text
dev@muduo.local
muduo123456
```
