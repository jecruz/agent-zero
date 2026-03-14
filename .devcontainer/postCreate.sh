#!/usr/bin/env bash
set -euo pipefail

cd /a0

/opt/venv-a0/bin/pip install --no-cache-dir -r requirements.txt -r requirements.dev.txt

echo
echo "Dev container ready."
echo "Python: $(/opt/venv-a0/bin/python --version)"
echo "Pytest: $(/opt/venv-a0/bin/pytest --version)"
echo
echo "Suggested commands:"
echo "  /opt/venv-a0/bin/pytest tests"
echo "  /opt/venv-a0/bin/python run_ui.py --development=true"
