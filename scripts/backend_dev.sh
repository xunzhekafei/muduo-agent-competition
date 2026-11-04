#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"
python3 -m pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host "${MUDUO_BACKEND_HOST:-0.0.0.0}" --port "${MUDUO_BACKEND_PORT:-8000}"
