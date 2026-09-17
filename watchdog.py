"""
GRW 看门狗 — 双 Python 进程（无 Node/Vite，稳定不崩）
- 8000: FastAPI（API + 前端静态）
- 5173: 纯 Python 静态前端 + /api 代理
- 每天 20:00 自动备份数据（本地快照 + 尝试上传云端）
"""
import subprocess
import os
import time
import sys
import threading
import datetime
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE, "backend")
PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")

CLOUD_API = "https://grw-workspace-production.up.railway.app/api"
LOG_FILE = os.path.join(BASE, "logs", "watchdog.log")


def log(msg):
    """打印并写日志（用于诊断开机自启是否生效）"""
    line = f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def start_backend():
    return subprocess.Popen(
        [PYTHON, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR,
    )


def start_frontend():
    return subprocess.Popen(
        [PYTHON, os.path.join(BASE, "serve-5173.py")],
        cwd=BASE,
    )


def do_backup():
    """备份：导出本地数据 → 存本地快照 → 尝试上传云端"""
    try:
        # 1. 导出本地全部数据
        req = urllib.request.Request("http://localhost:8000/api/export?format=json")
        raw = urllib.request.urlopen(req, timeout=15).read()

        # 2. 保存本地快照
        backup_dir = os.path.join(BASE, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        fname = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S.json")
        with open(os.path.join(backup_dir, fname), "wb") as f:
            f.write(raw)

        # 3. 尝试上传云端
        cloud_ok = False
        try:
            creq = urllib.request.Request(
                CLOUD_API + "/import",
                data=raw,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(creq, timeout=20)
            cloud_ok = True
        except Exception as e:
            print(f"[backup] 云端上传失败（本地快照已保留）: {e}", flush=True)

        print(f"[backup] {'✅ 云端已同步' if cloud_ok else '⚠️ 仅本地快照'} -> backups/{fname}", flush=True)
    except Exception as e:
        print(f"[backup] 备份失败: {e}", flush=True)


def backup_scheduler():
    """每天 20:00 自动触发一次备份"""
    last_run = None
    while True:
        try:
            now = datetime.datetime.now()
            if now.hour == 20 and last_run != now.date():
                do_backup()
                last_run = now.date()
        except Exception:
            pass
        time.sleep(60)  # 每分钟检查一次


def main():
    log("[watchdog] ===== 启动 (2x Python, no Node) =====")
    be = start_backend()
    time.sleep(2)
    fe = start_frontend()
    time.sleep(1)
    log(f"[watchdog] BE={be.pid} :8000   FE={fe.pid} :5173")

    # 启动每日备份调度线程
    threading.Thread(target=backup_scheduler, daemon=True).start()
    log("[watchdog] 每日 20:00 自动备份已启用")

    crashes = {"be": 0, "fe": 0}
    try:
        while True:
            if be.poll() is not None:
                crashes["be"] += 1
                log(f"[watchdog] BE died (x{crashes['be']}), restarting...")
                be = start_backend()
                time.sleep(1)
            if fe.poll() is not None:
                crashes["fe"] += 1
                log(f"[watchdog] FE died (x{crashes['fe']}), restarting...")
                fe = start_frontend()
                time.sleep(1)
            time.sleep(3)
    except KeyboardInterrupt:
        log("[watchdog] Shutting down...")
        be.terminate()
        fe.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()
