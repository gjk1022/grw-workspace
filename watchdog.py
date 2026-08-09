"""
GRW 服务看门狗 — 前后端双进程（Vite dev + FastAPI）
"""
import subprocess
import os
import time
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE, "backend")
FRONTEND_DIR = os.path.join(BASE, "frontend")

PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
NPM = r"C:\Users\gengjikang\.workbuddy\binaries\node\versions\22.22.2\npm.cmd"


def start_backend():
    return subprocess.Popen(
        [PYTHON, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR,
    )


def start_frontend():
    env = os.environ.copy()
    env["NODE_OPTIONS"] = "--max-old-space-size=512"
    return subprocess.Popen(
        [NPM, "run", "dev", "--", "--host", "0.0.0.0"],
        cwd=FRONTEND_DIR,
        env=env,
    )


def main():
    print("[watchdog] Starting GRW services...", flush=True)
    be = start_backend()
    time.sleep(2)
    fe = start_frontend()
    time.sleep(4)
    print(f"[watchdog] BE PID={be.pid} · http://localhost:8000", flush=True)
    print(f"[watchdog] FE PID={fe.pid} · http://localhost:5173", flush=True)

    crashes = {"backend": 0, "frontend": 0}
    try:
        while True:
            if be.poll() is not None:
                crashes["backend"] += 1
                print(f"[watchdog] Backend died (x{crashes['backend']}), restarting...", flush=True)
                be = start_backend()
                time.sleep(1)
            if fe.poll() is not None:
                crashes["frontend"] += 1
                print(f"[watchdog] Frontend died (x{crashes['frontend']}), restarting...", flush=True)
                fe = start_frontend()
                time.sleep(3)
            time.sleep(3)
    except KeyboardInterrupt:
        print("[watchdog] Shutting down...", flush=True)
        be.terminate()
        fe.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()