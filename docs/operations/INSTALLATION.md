# SmellScope 2.1 — Installation & Setup Guide

This guide covers setup instructions for developers and researchers deploying SmellScope 2.1.

---

## 1. Prerequisites

- **Python**: 3.10 to 3.13
- **Node.js**: 18+ and `npm`
- **Git**

---

## 2. Python Environment Setup

Create and activate a virtual environment:

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

Install core dependencies:

```bash
pip install -e .
```

Verify Python installation:

```bash
python -c "import smellscope; print('SmellScope installed successfully')"
```

---

## 3. Frontend Setup

Navigate to the `frontend/` directory and install npm packages:

```bash
cd frontend
npm install
```

Build the production frontend bundle:

```bash
npm run build
```

This compiles TypeScript and packages Vite assets into `frontend/dist`, allowing the FastAPI server to host the entire workstation as a unified local application without requiring a separate frontend server.

---

## 4. Running the Complete System

### Option A: Unified Launcher
```powershell
.\launch.bat
```

### Option B: Manual Execution
Start the FastAPI server:
```bash
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in any modern web browser.
