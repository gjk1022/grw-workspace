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
import json

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


def load_backup_config():
    """读取 GitHub 备份配置"""
    try:
        with open(os.path.join(BASE, ".backup-config.json"), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def git_push_backup():
    """把 backups/ 目录推送到 GitHub 私有仓库（异地备份）"""
    cfg = load_backup_config()
    repo = cfg.get("github_repo")
    token = cfg.get("github_token")
    if not repo or not token:
        return False, "未配置 GitHub 备份"

    backup_dir = os.path.join(BASE, "backups")
    remote = f"https://gjk1022:{token}@github.com/{repo}.git"

    def run(args):
        return subprocess.run(
            ["git"] + args, cwd=backup_dir,
            capture_output=True, text=True, timeout=90,
        )

    try:
        # 首次使用时初始化仓库
        if not os.path.exists(os.path.join(backup_dir, ".git")):
            run(["init"])
            run(["checkout", "-b", "main"])
            run(["remote", "add", "origin", remote])
        else:
            run(["remote", "set-url", "origin", remote])

        run(["add", "-A"])
        c = run(["commit", "-m", f"backup {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        if "nothing to commit" in (c.stdout or "") + (c.stderr or ""):
            return True, "无变化"
        p = run(["push", "-u", "origin", "main", "--force"])
        if p.returncode != 0:
            return False, (p.stderr or "").strip()[:200]
        return True, "已推送到 GitHub"
    except Exception as e:
        return False, str(e)[:200]


def cleanup_old_backups(keep):
    """只保留最近 N 个快照，避免仓库无限膨胀"""
    try:
        backup_dir = os.path.join(BASE, "backups")
        files = sorted(f for f in os.listdir(backup_dir) if f.endswith(".json"))
        for old in files[:-keep]:
            os.remove(os.path.join(backup_dir, old))
    except Exception:
        pass


def do_backup():
    """备份：导出本地数据 → 存本地快照 → 推送到 GitHub 私有仓库 → 尝试上传云端"""
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

        # 3. 清理旧快照
        cfg = load_backup_config()
        cleanup_old_backups(int(cfg.get("keep_snapshots", 30)))

        # 4. 推送到 GitHub 私有仓库（异地备份，最可靠）
        gh_ok, gh_msg = git_push_backup()

        # 5. 尝试上传云端（Railway，可选）
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
        except Exception:
            pass

        log(
            f"[backup] 快照={fname} | GitHub={'✅ ' + gh_msg if gh_ok else '❌ ' + gh_msg} "
            f"| 云端={'✅' if cloud_ok else '⚠️ 不可达'}"
        )
    except Exception as e:
        log(f"[backup] 备份失败: {e}")


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
