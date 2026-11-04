#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"
python3 -m compileall -q app tests
ruff check app tests
pytest tests -q
