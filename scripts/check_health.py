"""SmellScope project health check.

Runs the same checks as GET /api/v1/health without needing the server to be running,
and (optionally) probes a running backend/frontend.

Usage:
    python scripts/check_health.py                # in-process checks only
    python scripts/check_health.py --live         # also probe http://127.0.0.1:8000 and :5173
Exit code is 0 only when every required check passes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))
os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")


def _probe(url: str, timeout: float = 3.0):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:  # nosec - fixed local URLs
            return resp.status, resp.read()
    except Exception as exc:
        return None, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="also probe running backend/frontend")
    parser.add_argument("--backend", default=f"http://127.0.0.1:{os.environ.get('SMELLSCOPE_PORT', '8000')}")
    parser.add_argument("--frontend", default=f"http://127.0.0.1:{os.environ.get('SMELLSCOPE_FRONTEND_PORT', '5173')}")
    args = parser.parse_args()

    failures = 0

    def report(name: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))
        if not ok:
            failures += 1

    report("python >= 3.11", sys.version_info >= (3, 11), sys.version.split()[0])

    from smellscope.server.routers.health import run_health_checks

    for name, result in run_health_checks().items():
        detail = result.get("path") or result.get("error") or ""
        if name == "ml_dependencies":
            detail = ", ".join(f"{k} {v}" for k, v in result["versions"].items())
        report(name, bool(result.get("ok")), detail)

    dist = ROOT / "frontend" / "dist" / "index.html"
    print(f"[INFO] frontend production build present: {dist.exists()}")
    print(f"[INFO] frontend node_modules present: {(ROOT / 'frontend' / 'node_modules').exists()}")

    if args.live:
        status, body = _probe(f"{args.backend}/api/v1/health")
        if status == 200:
            data = json.loads(body)
            report("backend /api/v1/health", data.get("status") == "ok", f"status={data.get('status')}")
        else:
            report("backend /api/v1/health", False, f"unreachable: {body}")
        status, _ = _probe(args.frontend)
        report("frontend dev server", status == 200, args.frontend if status == 200 else "not running (ok if serving prod build from the backend)")

    print("\nHEALTHY" if failures == 0 else f"\n{failures} check(s) FAILED")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
