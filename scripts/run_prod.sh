#!/usr/bin/env bash
# SmellScope 2.0 - Production Single-Process Launcher (Bash)
set -e

echo "=========================================================="
echo "   SMELLSCOPE 2.0 - PRODUCTION LOCAL WORKSTATION"
echo "=========================================================="

export LOKY_MAX_CPU_COUNT=4
export PYTHONPATH="."

if [ ! -f "frontend/dist/index.html" ]; then
    echo "Building React production assets..."
    cd frontend
    npm run build
    cd ..
fi

echo "Launching unified workstation on http://127.0.0.1:8000..."
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
