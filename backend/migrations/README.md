# 数据库迁移说明

本目录使用 Alembic 管理后端数据库迁移。迁移文件必须和 `backend/app/db/`、`backend/app/modules/*/models.py` 中的 SQLAlchemy 模型保持一致。

## 本地初始化

```bash
cd backend
alembic upgrade head
```

默认数据库地址来自 `.env.example`：

```text
MUDUO_DATABASE_URL=sqlite+pysqlite:///./muduo_dev.sqlite3
```

开发者可以在仓库根目录或 `backend/` 目录下创建 `.env` 覆盖该值。

## 新增迁移

修改模型后生成迁移：

```bash
cd backend
alembic revision --autogenerate -m "描述本次结构变化"
```

提交前必须检查生成文件，确认没有无关表或字段变化。

## 回滚

```bash
cd backend
alembic downgrade -1
```

MVP 阶段以本地 SQLite 为默认开发数据库，后续切换 PostgreSQL 时需要新增迁移验证。
