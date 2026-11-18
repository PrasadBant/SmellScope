#!/usr/bin/env bash
# SmellScope 2.0 - Local Development Launcher (Bash)
set -e

echo "=========================================================="
echo "   SMELLSCOPE 2.0 - SCIENTIFIC DATASET AUDITOR"
echo "   Starting Local Development Environment..."
echo "=========================================================="

export LOKY_MAX_CPU_COUNT=4
export PYTHONPATH="."

echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..."
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

sleep 2

echo "[2/2] Starting React Frontend on http://localhost:5173..."
cd frontend
npm run dev
