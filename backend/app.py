"""
硕博成长工作台 - 后端 API
FastAPI + SQLite
"""
import os
import calendar as _cal
import sqlite3
from datetime import datetime, date, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import uuid
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Railway / 云端：用 DATA_DIR 环境变量指向持久化 Volume
DB_PATH = os.getenv("GRW_DB_PATH") or os.path.join(BASE_DIR, "grw.db")
UPLOAD_DIR = os.getenv("GRW_UPLOAD_DIR") or os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


# ---------- 数据库 ----------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        name TEXT,
        stage TEXT DEFAULT '研一',
        avatar TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT,
        plan_date TEXT,
        deadline TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        tag TEXT,
        description TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        level TEXT,
        period TEXT,
        content TEXT,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in_progress',
        start_date TEXT,
        end_date TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT,
        title TEXT,
        completed TEXT,
        problems TEXT,
        improvements TEXT,
        next_steps TEXT,
        review_date TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        target_journal TEXT,
        stage TEXT,
        progress INTEGER DEFAULT 0,
        modify_log TEXT,
        submission_date TEXT,
        description TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS literatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        authors TEXT,
        source TEXT,
        year TEXT,
        status TEXT DEFAULT 'unread',
        tags TEXT,
        notes TEXT,
        cite TEXT,
        doi TEXT,
        file_path TEXT,
        read_at TEXT,
        folder TEXT DEFAULT '',
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        literature_id INTEGER,
        title TEXT,
        abstract TEXT,
        keywords TEXT,
        main_content TEXT,
        innovation TEXT,
        content TEXT,
        tags TEXT,
        background TEXT,
        method TEXT,
        weakness TEXT,
        understanding TEXT,
        future TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_time TEXT,
        topic TEXT,
        content TEXT,
        advisor_opinion TEXT,
        todos TEXT,
        next_plan TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        tasks TEXT,
        files TEXT,
        outcomes TEXT,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        exp_date TEXT,
        software TEXT,
        model_version TEXT,
        parameters TEXT,
        conditions TEXT,
        data_file TEXT,
        result_image TEXT,
        conclusion TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS health_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_date TEXT,
        sleep_hours REAL,
        exercise_minutes INTEGER,
        mood INTEGER,
        weight REAL,
        note TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS english_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_date TEXT,
        words INTEGER DEFAULT 0,
        reading_minutes INTEGER DEFAULT 0,
        listening_minutes INTEGER DEFAULT 0,
        note TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS diaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        tags TEXT,
        mood INTEGER,
        image TEXT,
        diary_date TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS finances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        finance_date TEXT,
        category TEXT,
        amount REAL,
        type TEXT,
        note TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS inspirations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT,
        title TEXT,
        content TEXT,
        image TEXT,
        link TEXT,
        tags TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module TEXT,
        question TEXT,
        answer TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS growth_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_date TEXT,
        research INTEGER DEFAULT 0,
        paper INTEGER DEFAULT 0,
        reading INTEGER DEFAULT 0,
        writing INTEGER DEFAULT 0,
        learning INTEGER DEFAULT 0,
        management INTEGER DEFAULT 0,
        health INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS file_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS file_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER DEFAULT 0,
        filename TEXT,
        file_path TEXT,
        file_size INTEGER DEFAULT 0,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS work_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_date TEXT,
        start_time TEXT,
        end_time TEXT,
        duration_seconds INTEGER DEFAULT 0,
        status TEXT DEFAULT 'working',  -- working | done
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        translation TEXT,
        scene TEXT,
        source TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS exercise_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT UNIQUE,
        plan_data TEXT,
        created_at TEXT
    );
    """)
    # 迁移旧数据库：添加新字段
    for col in [("doi", "TEXT"), ("file_path", "TEXT"), ("read_at", "TEXT")]:
        try:
            cur.execute(f"ALTER TABLE literatures ADD COLUMN {col[0]} {col[1]}")
        except:
            pass
    try: cur.execute("ALTER TABLE users ADD COLUMN stage TEXT DEFAULT '研一'")
    except: pass
    try: cur.execute("ALTER TABLE literatures ADD COLUMN folder TEXT DEFAULT ''")
    except: pass
    try: cur.execute("ALTER TABLE literatures ADD COLUMN depth TEXT DEFAULT 'wide'")
    except: pass
    # 迁移旧状态：important/cited → tags，status 恢复为 completed
    cur.execute("UPDATE literatures SET tags=COALESCE(tags||',','')||'重点论文' WHERE status='important' AND tags NOT LIKE '%重点论文%'")
    cur.execute("UPDATE literatures SET status='completed' WHERE status='important'")
    cur.execute("UPDATE literatures SET tags=COALESCE(tags||',','')||'已引用' WHERE status='cited' AND tags NOT LIKE '%已引用%'")
    cur.execute("UPDATE literatures SET status='reading' WHERE status='cited' AND status NOT IN ('unread','reading','completed')")
    for col in ["abstract", "keywords", "main_content", "core_conclusion", "personal_insight"]:
        try: cur.execute(f"ALTER TABLE notes ADD COLUMN {col} TEXT")
        except: pass
    # 健康模块新字段
    for col, typ in [("water_cups", "INTEGER DEFAULT 0"), ("breakfast", "INTEGER DEFAULT 0"),
                     ("mood_reasons", "TEXT"), ("exercise_actual", "TEXT")]:
        try: cur.execute(f"ALTER TABLE health_logs ADD COLUMN {col} {typ}")
        except: pass
    for col, typ in [("repo_url", "TEXT"), ("git_version", "TEXT"), ("raw_data_path", "TEXT"), ("attachments", "TEXT")]:
        try: cur.execute(f"ALTER TABLE experiments ADD COLUMN {col} {typ}")
        except: pass
    try: cur.execute("ALTER TABLE english_logs ADD COLUMN checked_in INTEGER DEFAULT 0")
    except: pass
    for col, typ in [("diary_type", "TEXT DEFAULT 'essay'"), ("gratitude", "TEXT"), ("achievement", "TEXT"), ("error_solution", "TEXT")]:
        try: cur.execute(f"ALTER TABLE diaries ADD COLUMN {col} {typ}")
        except: pass
    try: cur.execute("ALTER TABLE finances ADD COLUMN main_category TEXT DEFAULT 'living'")
    except: pass
    try: cur.execute("ALTER TABLE users ADD COLUMN exercise_warn_days INTEGER DEFAULT 3")
    except: pass
    try: cur.execute("ALTER TABLE users ADD COLUMN mood_warn_days INTEGER DEFAULT 3")
    except: pass
    for col, typ in [("school", "TEXT"), ("department", "TEXT"), ("major", "TEXT"), ("enrollment_date", "TEXT DEFAULT '2026-09-01'")]:
        try: cur.execute(f"ALTER TABLE users ADD COLUMN {col} {typ}")
        except: pass
    try: cur.execute("ALTER TABLE users ADD COLUMN semester_start TEXT DEFAULT '2026-09-01'")
    except: pass

    # AI 配置表
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ai_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT DEFAULT 'local',
        api_key TEXT,
        base_url TEXT,
        model TEXT,
        created_at TEXT
    )
    """)
    cur.execute("SELECT COUNT(*) FROM ai_config")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO ai_config(provider, model, base_url, created_at) VALUES ('local','本地示例','',datetime('now'))")
    # 初始化默认用户
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO users(username, name, avatar, created_at) VALUES (?,?,?,?)",
            ("admin", "研究生", "", datetime.now().isoformat())
        )
    # 初始化示例数据
    cur.execute("SELECT COUNT(*) FROM tasks")
    if cur.fetchone()[0] == 0:
        seed_examples(cur)
    conn.commit()
    conn.close()


def seed_examples(cur):
    now = datetime.now().isoformat()
    today = date.today().isoformat()
    # 示例任务
    tasks = [
        ("完成开题报告 PPT", "academic", today, today, "high", "pending", 60, "开题", "整理研究背景和方案"),
        ("阅读 3 篇顶会论文", "reading", today, today, "medium", "in_progress", 33, "文献", "关注最新方法"),
        ("回复导师邮件", "communication", today, today, "high", "pending", 0, "导师", "汇报本周进展"),
        ("跑通实验 baseline", "experiment", today, today, "high", "in_progress", 50, "实验", "调试环境"),
    ]
    for t in tasks:
        cur.execute("INSERT INTO tasks(title,type,plan_date,deadline,priority,status,progress,tag,description,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (*t, now))
    # 示例论文
    cur.execute("INSERT INTO papers(title,target_journal,stage,progress,description,created_at) VALUES (?,?,?,?,?,?)",
                ("基于深度学习的科研管理系统设计", "软件学报", "数据分析", 40, "提出新框架", now))
    # 示例文献
    cur.execute("INSERT INTO literatures(title,authors,source,year,status,tags,created_at) VALUES (?,?,?,?,?,?,?)",
                ("Attention Is All You Need", "Vaswani et al.", "NeurIPS", "2017", "completed", "Transformer,AI", now))
    # 示例健康打卡
    cur.execute("INSERT INTO health_logs(log_date,sleep_hours,exercise_minutes,mood,note,created_at) VALUES (?,?,?,?,?,?)",
                (today, 7.5, 30, 4, "状态不错", now))
    # 示例成长记录
    cur.execute("INSERT INTO growth_logs(log_date,research,paper,reading,writing,learning,management,health,points,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (today, 70, 50, 80, 60, 75, 65, 80, 12, now))


# ---------- FastAPI ----------
app = FastAPI(title="硕博成长工作台 API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def startup():
    init_db()


def row_to_dict(r):
    return {k: r[k] for k in r.keys()} if r else None


def now_str():
    return datetime.now().isoformat()


# ---------- 通用 CRUD 工厂 ----------
class CRUD:
    def __init__(self, table: str, allowed: List[str]):
        self.table = table
        self.allowed = allowed

    def list(self):
        conn = get_db()
        rows = conn.execute(f"SELECT * FROM {self.table} ORDER BY id DESC").fetchall()
        conn.close()
        return [row_to_dict(r) for r in rows]

    def get(self, item_id: int):
        conn = get_db()
        row = conn.execute(f"SELECT * FROM {self.table} WHERE id=?", (item_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(404, "Not Found")
        return row_to_dict(row)

    def create(self, payload: dict):
        data = {k: payload.get(k) for k in self.allowed}
        data["created_at"] = now_str()
        cols = ",".join(data.keys())
        qs = ",".join(["?"] * len(data))
        conn = get_db()
        cur = conn.execute(f"INSERT INTO {self.table}({cols}) VALUES ({qs})", list(data.values()))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return self.get(new_id)

    def update(self, item_id: int, payload: dict):
        data = {k: payload.get(k) for k in self.allowed if k in payload}
        if not data:
            return self.get(item_id)
        set_clause = ",".join([f"{k}=?" for k in data.keys()])
        conn = get_db()
        conn.execute(f"UPDATE {self.table} SET {set_clause} WHERE id=?", (*data.values(), item_id))
        conn.commit()
        conn.close()
        return self.get(item_id)

    def delete(self, item_id: int):
        conn = get_db()
        conn.execute(f"DELETE FROM {self.table} WHERE id=?", (item_id,))
        conn.commit()
        conn.close()
        return {"ok": True}


# ---------- 注册各模块 ----------
task_crud = CRUD("tasks", ["title", "type", "plan_date", "deadline", "priority", "status", "progress", "tag", "description"])
goal_crud = CRUD("goals", ["title", "level", "period", "content", "progress", "status", "start_date", "end_date"])
review_crud = CRUD("reviews", ["period", "title", "completed", "problems", "improvements", "next_steps", "review_date", "review_type", "content"])
paper_crud = CRUD("papers", ["title", "target_journal", "stage", "progress", "modify_log", "submission_date", "description"])
literature_crud = CRUD("literatures", ["title", "authors", "source", "year", "status", "tags", "notes", "cite", "doi", "file_path", "read_at", "folder", "depth"])
note_crud = CRUD("notes", ["literature_id", "title", "abstract", "keywords", "main_content", "innovation", "content", "tags", "background", "method", "weakness", "understanding", "future", "core_conclusion", "personal_insight"])
meeting_crud = CRUD("meetings", ["meeting_time", "topic", "content", "advisor_opinion", "todos", "next_plan"])
project_crud = CRUD("projects", ["name", "description", "start_date", "end_date", "tasks", "files", "outcomes", "progress", "status"])
experiment_crud = CRUD("experiments", ["name", "exp_date", "software", "model_version", "parameters", "conditions", "data_file", "result_image", "conclusion", "repo_url", "git_version", "raw_data_path", "attachments"])
health_crud = CRUD("health_logs", ["log_date", "sleep_hours", "exercise_minutes", "mood", "weight", "note", "water_cups", "breakfast", "mood_reasons", "exercise_actual"])
english_crud = CRUD("english_logs", ["log_date", "words", "reading_minutes", "listening_minutes", "note", "checked_in"])
sentences_crud = CRUD("sentences", ["text", "translation", "scene", "source"])
diary_crud = CRUD("diaries", ["title", "content", "tags", "mood", "image", "diary_date", "diary_type", "gratitude", "achievement", "error_solution"])
finance_crud = CRUD("finances", ["finance_date", "category", "amount", "type", "note", "main_category"])
inspiration_crud = CRUD("inspirations", ["kind", "title", "content", "image", "link", "tags"])


def register_crud(app, prefix: str, crud: CRUD):
    app.add_api_route(f"/api/{prefix}", crud.list, methods=["GET"])
    app.add_api_route(f"/api/{prefix}/{{item_id}}", crud.get, methods=["GET"])
    app.add_api_route(f"/api/{prefix}", crud.create, methods=["POST"])
    app.add_api_route(f"/api/{prefix}/{{item_id}}", crud.update, methods=["PUT"])
    app.add_api_route(f"/api/{prefix}/{{item_id}}", crud.delete, methods=["DELETE"])


# ---- 文献专用 API（必须在 CRUD 注册之前，避免路由冲突） ----
@app.get("/api/notes/export")
def notes_export(folder: str = "all"):
    """导出某主题下的精读笔记（仅含笔记的文献），用于 MD / PDF 导出"""
    conn = get_db()
    if folder == "all":
        lits = conn.execute(
            "SELECT id, title, authors, source, year, doi, folder, status, read_at, tags FROM literatures ORDER BY folder, id DESC"
        ).fetchall()
    else:
        lits = conn.execute(
            "SELECT id, title, authors, source, year, doi, folder, status, read_at, tags FROM literatures WHERE folder=? ORDER BY id DESC",
            (folder,)
        ).fetchall()

    items = []
    for l in lits:
        notes = conn.execute(
            "SELECT abstract, keywords, innovation, main_content, content, background, method, weakness, understanding, future, created_at FROM notes WHERE literature_id=? ORDER BY id ASC",
            (l["id"],)
        ).fetchall()
        if not notes:
            continue
        items.append({
            "title": l["title"],
            "authors": l["authors"] or "",
            "source": l["source"] or "",
            "year": l["year"] or "",
            "doi": l["doi"] or "",
            "folder": l["folder"] or "",
            "status": l["status"],
            "read_at": l["read_at"],
            "tags": l["tags"] or "",
            "notes": [row_to_dict(n) for n in notes],
        })
    conn.close()
    return {"folder": folder, "count": len(items), "items": items}


@app.post("/api/literatures/{lit_id}/upload")
async def literature_upload(lit_id: int, file: UploadFile = File(...)):
    """为指定文献上传 PDF"""
    ext = os.path.splitext(file.filename)[1].lower()
    name = f"lit_{lit_id}_{uuid.uuid4().hex[:8]}{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(await file.read())
    conn = get_db()
    conn.execute("UPDATE literatures SET file_path=? WHERE id=?", (f"/uploads/{name}", lit_id))
    conn.commit()
    conn.close()
    return {"url": f"/uploads/{name}", "filename": file.filename}

@app.put("/api/literatures/{lit_id}/read")
async def literature_mark_read(request: Request, lit_id: int):
    """切换阅读进度：unread → reading → completed → unread"""
    body = await request.json()
    new_status = body.get("status", "reading")
    conn = get_db()
    if new_status == "completed":
        conn.execute("UPDATE literatures SET status='completed', read_at=? WHERE id=?", (datetime.now().isoformat(), lit_id))
    elif new_status == "reading":
        conn.execute("UPDATE literatures SET status='reading', read_at=NULL WHERE id=?", (lit_id,))
    else:
        conn.execute("UPDATE literatures SET status='unread', read_at=NULL WHERE id=?", (lit_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/api/literatures/{lit_id}/notes")
def literature_notes(lit_id: int):
    """获取某文献的笔记列表"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM notes WHERE literature_id=? ORDER BY id DESC", (lit_id,)).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]

@app.delete("/api/literatures/{lit_id}/pdf")
def literature_delete_pdf(lit_id: int):
    """删除文献 PDF（清空路径）"""
    conn = get_db()
    conn.execute("UPDATE literatures SET file_path=NULL WHERE id=?", (lit_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "message": "PDF 已移除"}


# ---- 实验附件上传专用 API ----
@app.post("/api/experiments/{exp_id}/attachments")
async def experiments_upload_attachments(exp_id: int, files: list[UploadFile] = File(...)):
    """为实验上传附件（截图、日志、数据表格等）"""
    import json as _json
    urls = []
    conn = get_db()
    for file in files:
        ext = os.path.splitext(file.filename)[1]
        name = f"exp_{exp_id}_{uuid.uuid4().hex[:8]}{ext}"
        path = os.path.join(UPLOAD_DIR, name)
        with open(path, "wb") as f:
            f.write(await file.read())
        urls.append(f"/uploads/{name}")

    row = conn.execute("SELECT attachments FROM experiments WHERE id=?", (exp_id,)).fetchone()
    existing = _json.loads(row["attachments"]) if row and row["attachments"] else []
    existing.extend(urls)
    conn.execute("UPDATE experiments SET attachments=? WHERE id=?", (_json.dumps(existing, ensure_ascii=False), exp_id))
    conn.commit()
    conn.close()
    return {"ok": True, "attachments": existing, "added": urls}


# ---- 任务日历专用 API（必须在 tasks CRUD 注册之前，避免路由冲突） ----
@app.get("/api/tasks/calendar")
def tasks_calendar(year: int, month: int):
    """返回某年某月内（含跨月）的所有任务，用于日历节点展示"""
    last_day = _cal.monthrange(year, month)[1]
    first = f"{year}-{month:02d}-01"
    last = f"{year}-{month:02d}-{last_day:02d}"
    conn = get_db()
    rows = conn.execute(
        """SELECT * FROM tasks WHERE
           (plan_date >= ? AND plan_date <= ?)
        OR (deadline >= ? AND deadline <= ?)
        OR (plan_date < ? AND (deadline > ? OR deadline IS NULL))
        ORDER BY plan_date, id DESC""",
        (first, last, first, last, first, last)
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ---- 健康模块专用 API（必须在 health CRUD 注册之前，避免路由冲突） ----
HEALTH_SCORE_WEIGHTS = {"sleep": 25, "exercise": 25, "mood": 25, "breakfast": 15, "water": 10}


@app.get("/api/health/score")
def health_score(date: str = None):
    """返回某日健康评分（综合睡眠/运动/情绪/早餐/饮水）"""
    d = date or date.today().isoformat()
    conn = get_db()
    row = conn.execute("SELECT * FROM health_logs WHERE log_date=? ORDER BY id DESC LIMIT 1", (d,)).fetchone()
    conn.close()
    if not row:
        return {"date": d, "score": 0, "rating": "无记录", "breakdown": {}}
    r = row_to_dict(row)
    sleep_s = min((r.get("sleep_hours") or 0) / 8, 1) * 25
    ex_s = min((r.get("exercise_minutes") or 0) / 30, 1) * 25
    mood_s = ((r.get("mood") or 3) / 5) * 25
    bf_s = 15 if r.get("breakfast") else 0
    w_s = min((r.get("water_cups") or 0) / 8, 1) * 10
    score = round(sleep_s + ex_s + mood_s + bf_s + w_s)
    rating = "优秀" if score >= 85 else "良好" if score >= 70 else "一般" if score >= 55 else "需改善"
    return {"date": d, "score": score, "rating": rating, "breakdown": {
        "sleep": round(sleep_s), "exercise": round(ex_s), "mood": round(mood_s),
        "breakfast": bf_s, "water": round(w_s)
    }}


@app.get("/api/health/streak")
def health_streak():
    """连续健康打卡天数"""
    conn = get_db()
    today = date.today()
    streak = 0
    for i in range(365):
        ds = (today - timedelta(days=i)).isoformat()
        cnt = conn.execute("SELECT COUNT(*) FROM health_logs WHERE log_date=?", (ds,)).fetchone()[0]
        if cnt > 0: streak += 1
        else: break
    conn.close()
    return {"streak_days": streak}


@app.get("/api/health/trends")
def health_trends(type: str = "weight", days: int = 30):
    """健康数据趋势"""
    start = (date.today() - timedelta(days=days)).isoformat()
    conn = get_db()
    rows = conn.execute(
        "SELECT log_date, sleep_hours, exercise_minutes, mood, weight, water_cups FROM health_logs WHERE log_date>=? ORDER BY log_date ASC",
        (start,)
    ).fetchall()
    conn.close()
    data = []
    for r in rows:
        item = {"date": r["log_date"]}
        if type == "weight":
            if r["weight"]: item["value"] = r["weight"]
        elif type == "mood":
            item["value"] = r["mood"] or 0
        elif type == "water":
            item["value"] = r["water_cups"] or 0
        elif type == "sleep":
            item["value"] = r["sleep_hours"] or 0
        if "value" in item: data.append(item)
    return data


@app.get("/api/health/rules")
def health_rules():
    """健康联动规则检查（阈值从用户设置读取）"""
    conn = get_db()
    today = date.today()
    user = conn.execute("SELECT exercise_warn_days, mood_warn_days FROM users LIMIT 1").fetchone()
    ex_days = (user["exercise_warn_days"] or 3) if user else 3
    mood_days = (user["mood_warn_days"] or 3) if user else 3
    warnings = []
    bad_mood = True
    for i in range(mood_days):
        ds = (today - timedelta(days=i)).isoformat()
        r = conn.execute("SELECT mood FROM health_logs WHERE log_date=?", (ds,)).fetchone()
        if not r or (r["mood"] or 3) >= 3:
            bad_mood = False; break
    if bad_mood:
        warnings.append({"type": "mood", "message": f"连续{mood_days}天情绪低于3分，今日科研任务建议减量30%，去灵感素材库放松一下吧"})
    no_ex = True
    for i in range(ex_days):
        ds = (today - timedelta(days=i)).isoformat()
        r = conn.execute("SELECT exercise_minutes FROM health_logs WHERE log_date=?", (ds,)).fetchone()
        if r and (r["exercise_minutes"] or 0) > 0:
            no_ex = False; break
    if no_ex:
        warnings.append({"type": "exercise", "message": f"连续{ex_days}天未运动，今天动一动吧！哪怕散步20分钟也好 💪"})
    conn.close()
    return {"warnings": warnings}


@app.get("/api/export")
def export_all(format: str = "json"):
    """导出全部数据为 JSON 或 Markdown"""
    import json as _json
    conn = get_db()
    tables = ["tasks","goals","reviews","papers","literatures","notes","meetings","projects",
              "experiments","health_logs","english_logs","diaries","finances","inspirations",
              "growth_logs","file_records","file_folders","sentences","exercise_plans","work_sessions"]
    data = {}
    for t in tables:
        try:
            rows = conn.execute(f"SELECT * FROM {t}").fetchall()
            data[t] = [row_to_dict(r) for r in rows]
        except: pass
    conn.close()
    if format == "md":
        lines = ["# GRW 数据导出\n", f"导出时间：{datetime.now().isoformat()}\n"]
        for t in tables:
            rows = data.get(t, [])
            lines.append(f"## {t} ({len(rows)} 条)\n")
            if rows:
                headers = list(rows[0].keys())
                lines.append("| " + " | ".join(headers) + " |")
                lines.append("|" + "|".join(["---"]*len(headers)) + "|")
                for row in rows[:200]:
                    lines.append("| " + " | ".join([str(row.get(h,""))[:60] for h in headers]) + " |")
            lines.append("")
        return {"format": "md", "content": "\n".join(lines)}
    return {"format": "json", "data": data}


@app.post("/api/import")
async def import_data(request: Request):
    """导入 JSON 或 Markdown 格式数据，覆盖已有表"""
    import re
    body = await request.json() if "application/json" in (request.headers.get("content-type","")) else {"raw": (await request.body()).decode("utf-8")}
    conn = get_db()
    imported = 0

    if "data" in body:
        # JSON 格式：{data: {table: [rows...]}}
        data = body["data"]
        for table, rows in data.items():
            if not isinstance(rows, list):
                continue
            try:
                conn.execute(f"DELETE FROM {table}")
                for row in rows:
                    if not row: continue
                    cols = [k for k in row if k != "id"]
                    vals = [row[k] for k in cols]
                    conn.execute(f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join(['?']*len(cols))})", vals)
                    imported += 1
            except: pass
    elif "content" in body:
        # Markdown 格式：## table_name (N 条) 后跟表格
        text = body["content"]
        sections = re.split(r'\n## ', text)[1:]
        for sec in sections:
            m = re.match(r'(\w+)', sec)
            if not m: continue
            table = m.group(1)
            lines = sec.split('\n')
            headers = None
            try: conn.execute(f"DELETE FROM {table}")
            except: continue
            for line in lines:
                if '|' not in line: continue
                parts = [p.strip() for p in line.split('|') if p.strip()]
                if not parts: continue
                if parts[0].startswith('---'):
                    headers = parts if headers else None
                    continue
                if not headers:
                    headers = parts
                    continue
                if len(parts) != len(headers): continue
                row = dict(zip(headers, parts))
                cols = [k for k in row if k != "id"]
                vals = [row[k] for k in cols]
                try:
                    conn.execute(f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join(['?']*len(cols))})", vals)
                    imported += 1
                except: pass

    conn.commit()
    conn.close()
    return {"ok": True, "imported": imported}


@app.put("/api/me/settings")
async def update_settings(request: Request):
    """更新用户个性化设置（运动/情绪告警阈值等）"""
    body = await request.json()
    conn = get_db()
    user = conn.execute("SELECT id FROM users LIMIT 1").fetchone()
    if user:
        sets = []
        vals = []
        for k in ["exercise_warn_days", "mood_warn_days"]:
            if k in body:
                sets.append(f"{k}=?"); vals.append(body[k])
        if sets:
            conn.execute(f"UPDATE users SET {','.join(sets)} WHERE id=?", (*vals, user[0]))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/api/exercise-plan")
def get_exercise_plan():
    """获取本周运动计划"""
    today = date.today()
    dow = today.weekday()
    week_start = (today - timedelta(days=dow)).isoformat()
    conn = get_db()
    row = conn.execute("SELECT * FROM exercise_plans WHERE week_start=?", (week_start,)).fetchone()
    conn.close()
    return {"week_start": week_start, "plan": row_to_dict(row) if row else None}


@app.post("/api/exercise-plan")
async def save_exercise_plan(request: Request):
    """保存本周运动计划"""
    import json as _json
    body = await request.json()
    today = date.today()
    dow = today.weekday()
    week_start = (today - timedelta(days=dow)).isoformat()
    plan_str = _json.dumps(body.get("plan", []), ensure_ascii=False)
    conn = get_db()
    existing = conn.execute("SELECT id FROM exercise_plans WHERE week_start=?", (week_start,)).fetchone()
    if existing:
        conn.execute("UPDATE exercise_plans SET plan_data=? WHERE week_start=?", (plan_str, week_start))
    else:
        conn.execute("INSERT INTO exercise_plans(week_start, plan_data, created_at) VALUES (?,?,?)",
                     (week_start, plan_str, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"ok": True}


# ---- 英语学习专属 API ----
@app.get("/api/english/total")
def english_total():
    """已学总时长（小时）"""
    conn = get_db()
    row = conn.execute("SELECT COALESCE(SUM(reading_minutes+listening_minutes),0) as total FROM english_logs").fetchone()
    conn.close()
    return {"total_hours": round((row["total"] or 0) / 60, 1)}


for prefix, crud in [
    ("tasks", task_crud), ("goals", goal_crud), ("reviews", review_crud),
    ("papers", paper_crud), ("literatures", literature_crud), ("notes", note_crud),
    ("meetings", meeting_crud), ("projects", project_crud), ("experiments", experiment_crud),
    ("health", health_crud), ("english", english_crud), ("diaries", diary_crud),
    ("finances", finance_crud), ("inspirations", inspiration_crud),
    ("sentences", sentences_crud),
]:
    register_crud(app, prefix, crud)


# ---------- 用户 ----------
@app.get("/api/me")
def get_me():
    conn = get_db()
    row = conn.execute("SELECT * FROM users LIMIT 1").fetchone()
    conn.close()
    return row_to_dict(row) or {"username": "admin", "name": "研究生"}

@app.put("/api/me")
async def update_me(request: Request):
    body = await request.json()
    conn = get_db()
    cur = conn.execute("SELECT id FROM users LIMIT 1")
    user = cur.fetchone()
    if user:
        conn.execute("UPDATE users SET name=?, stage=?, school=?, department=?, major=?, enrollment_date=?, semester_start=? WHERE id=?", (
            body.get("name", "研究生"), body.get("stage", "研一"),
            body.get("school", ""), body.get("department", ""), body.get("major", ""),
            body.get("enrollment_date", "2026-09-01"), body.get("semester_start", "2026-09-01"), user[0]
        ))
    else:
        conn.execute("INSERT INTO users(name, stage, school, department, major, enrollment_date, semester_start, created_at) VALUES (?,?,?,?,?,?,?,?)", (
            body.get("name", "研究生"), body.get("stage", "研一"),
            body.get("school", ""), body.get("department", ""), body.get("major", ""),
            body.get("enrollment_date", "2026-09-01"), body.get("semester_start", "2026-09-01"), datetime.now().isoformat()
        ))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/api/me/level")
def get_level():
    """等级系统：根据累积积分计算等级、头衔、进度、连续打卡天数"""
    conn = get_db()
    row = conn.execute("SELECT COALESCE(SUM(points), 0) as total FROM growth_logs").fetchone()
    total = row["total"] or 0
    level = total // 100 + 1
    level_progress = total % 100
    next_level_exp = 100 - level_progress

    if level <= 3: title = "萌新"
    elif level <= 7: title = "起步"
    elif level <= 12: title = "探索者"
    elif level <= 18: title = "耕耘者"
    elif level <= 25: title = "精进者"
    elif level <= 33: title = "突破者"
    else: title = "大师"

    today_d = date.today()
    streak = 0
    for i in range(365):
        day_str = (today_d - timedelta(days=i)).isoformat()
        cnt = conn.execute("SELECT COUNT(*) FROM growth_logs WHERE log_date=?", (day_str,)).fetchone()[0]
        if cnt > 0: streak += 1
        else: break
    conn.close()
    return {
        "level": level, "title": title, "total_exp": total,
        "progress": level_progress, "next_level_exp": next_level_exp,
        "streak_days": streak,
    }


def award_points(date_str: str, pts: int):
    """辅助函数：为某日累加积分（自动创建或更新 growth_logs）"""
    conn = get_db()
    row = conn.execute("SELECT id, points FROM growth_logs WHERE log_date=?", (date_str,)).fetchone()
    if row:
        conn.execute("UPDATE growth_logs SET points=points+? WHERE log_date=?", (pts, date_str))
    else:
        conn.execute("INSERT INTO growth_logs(log_date, points, created_at) VALUES (?,?,?)",
                     (date_str, pts, datetime.now().isoformat()))
    conn.commit()
    conn.close()


@app.post("/api/growth/award")
async def growth_award(request: Request):
    """奖励积分：前端各模块操作后调用"""
    body = await request.json()
    pts = body.get("points", 0)
    if pts <= 0:
        return {"ok": False, "message": "points must be positive"}
    award_points(date.today().isoformat(), pts)
    return {"ok": True, "points": pts}


# ---------- 六边形雷达图 ----------
@app.get("/api/dashboard/radar")
def dashboard_radar():
    conn = get_db()
    today = date.today()
    w7 = (today - timedelta(days=7)).isoformat()
    m30 = (today - timedelta(days=30)).isoformat()

    r1 = r2 = r3 = r4 = r5 = r6 = 50  # defaults

    try:
        pd = conn.execute("SELECT COUNT(*) FROM papers WHERE stage='已发表'").fetchone()[0]
        pt = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0] or 1
        lc = conn.execute("SELECT COUNT(*) FROM literatures WHERE status='completed'").fetchone()[0]
        mc = conn.execute("SELECT COUNT(*) FROM meetings WHERE meeting_date>=?", (m30,)).fetchone()[0]
        r1 = min(100, round(pd/max(pt,1)*35 + min(lc/10,1)*30 + min(mc/4,1)*35))
    except: pass

    try:
        ed = conn.execute("SELECT COUNT(*) FROM health_logs WHERE log_date>=? AND exercise_minutes>0", (w7,)).fetchone()[0]
        wa = conn.execute("SELECT AVG(water_cups) FROM health_logs WHERE log_date>=?", (w7,)).fetchone()[0] or 0
        sa = conn.execute("SELECT AVG(sleep_hours) FROM health_logs WHERE log_date>=?", (w7,)).fetchone()[0] or 0
        r2 = min(100, round(ed/7*40 + min(wa/8,1)*30 + min(sa/8,1)*30))
    except: pass

    try:
        pr = conn.execute("SELECT COUNT(*) FROM literatures WHERE status='completed'").fetchone()[0]  # 论文阅读
        pw = conn.execute("SELECT COUNT(*) FROM papers WHERE stage IN ('写作中','修改中','投稿中')").fetchone()[0]  # 论文写作
        pj = conn.execute("SELECT COUNT(*) FROM projects WHERE status!='done'").fetchone()[0]  # 项目管理
        ex = conn.execute("SELECT COUNT(*) FROM experiments").fetchone()[0]  # 实验/模拟
        r3 = min(100, round(min(pr/5,1)*25 + min(pw/3,1)*25 + min(pj/2,1)*25 + min(ex/3,1)*25))
    except: pass

    try:
        ic = conn.execute("SELECT COUNT(*) FROM inspirations WHERE created_at>=?", (w7,)).fetchone()[0]
        dc = conn.execute("SELECT COUNT(*) FROM diaries WHERE diary_date>=?", (w7,)).fetchone()[0]
        r4 = min(100, round(min(ic/3,1)*40 + min(dc/3,1)*40 + 20))
    except: pass

    try:
        ed = conn.execute("SELECT COUNT(*) FROM english_logs WHERE log_date>=? AND checked_in=1", (w7,)).fetchone()[0]
        em = conn.execute("SELECT SUM(reading_minutes+listening_minutes) FROM english_logs WHERE log_date>=?", (w7,)).fetchone()[0] or 0
        r5 = min(100, round(ed/7*50 + min(em/120,1)*50))
    except: pass

    try:
        fd = conn.execute("SELECT COUNT(DISTINCT finance_date) FROM finances WHERE finance_date>=?", (w7,)).fetchone()[0]
        rt = conn.execute("SELECT COUNT(*) FROM finances WHERE main_category='reimburse'").fetchone()[0] or 1
        rd = conn.execute("SELECT COUNT(*) FROM finances WHERE main_category='reimburse' AND type='income'").fetchone()[0]
        r6 = min(100, round(fd/5*50 + (rd/max(rt,1))*50))
    except: pass

    conn.close()
    return {"labels": ["科研进度","身体健康","科研能力","兴趣日常","英语学习","财务状况"], "values": [r1,r2,r3,r4,r5,r6]}


# ---------- Dashboard 聚合数据 ----------
@app.get("/api/dashboard")
def dashboard():
    conn = get_db()
    today_date = date.today()
    today = today_date.isoformat()
    # 本周范围
    weekday = today_date.weekday()  # 0=周一
    week_start = (today_date - timedelta(days=weekday)).isoformat()
    out = {}

    # ---------- 数据卡片 ----------
    # 今日任务
    out["tasks_today"] = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE plan_date=? OR deadline=?", (today, today)
    ).fetchone()[0]
    out["tasks_done_today"] = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE status='done' AND (plan_date=? OR deadline=?)", (today, today)
    ).fetchone()[0]

    # 本周目标（tasks 表本周每天汇总）
    out["goals_week"] = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE plan_date>=? AND plan_date<=?", (week_start, today)
    ).fetchone()[0]
    out["goals_week_done"] = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE status='done' AND plan_date>=? AND plan_date<=?", (week_start, today)
    ).fetchone()[0]

    # 论文状态（每篇论文的详情列表）
    papers = conn.execute("SELECT id, title, stage, progress, target_journal FROM papers ORDER BY id DESC").fetchall()
    out["papers_detail"] = [{
        "id": p["id"],
        "title": p["title"],
        "stage": p["stage"],
        "progress": p["progress"],
        "target_journal": p["target_journal"]
    } for p in papers]
    out["papers_total"] = len(out["papers_detail"])

    # 阅读数量
    out["literatures_count"] = conn.execute("SELECT COUNT(*) FROM literatures").fetchone()[0]
    out["literatures_reading"] = conn.execute("SELECT COUNT(*) FROM literatures WHERE status='reading'").fetchone()[0]

    # 学习时间 = 签到签出工时（work_sessions 汇总）
    # 今天
    today_sessions = conn.execute(
        "SELECT start_time, end_time, duration_seconds FROM work_sessions WHERE session_date=?",
        (today,)
    ).fetchall()
    today_sec = 0
    now_dt = datetime.now()
    for s in today_sessions:
        if s["end_time"]:
            today_sec += s["duration_seconds"] or 0
        else:
            # 正在进行的工作段
            ci = datetime.fromisoformat(s["start_time"])
            today_sec += max(0, int((now_dt - ci).total_seconds()))
    out["study_minutes_today"] = today_sec // 60

    # 本周汇总
    week_sessions = conn.execute(
        "SELECT duration_seconds FROM work_sessions WHERE session_date>=? AND session_date<=? AND end_time IS NOT NULL",
        (week_start, today)
    ).fetchall()
    week_done = sum(s["duration_seconds"] or 0 for s in week_sessions)
    # 加上今天进行中的
    if today_sec > 0:
        for s in today_sessions:
            if s["end_time"] and s["duration_seconds"]:
                week_done += s["duration_seconds"] or 0
    out["study_minutes_week"] = week_done // 60

    # 本周积分
    pts = conn.execute(
        "SELECT COALESCE(SUM(points),0) FROM growth_logs WHERE log_date>=? AND log_date<=?",
        (week_start, today)
    ).fetchone()[0]
    out["points_week"] = pts or 0

    # ---------- 日期信息 ----------
    weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    out["date_str"] = f"{today_date.year}年{today_date.month}月{today_date.day}日 {weekdays[weekday]}"
    out["date_subtitle"] = f"已学习 {out['study_minutes_today'] // 60} 小时 {out['study_minutes_today'] % 60} 分钟" if out["study_minutes_today"] else "今天还没有签到学习哦"

    # ---------- 可见模块统计 ----------
    out["papers_count"] = out["papers_total"]

    # 近7天工作时长趋势
    rows = conn.execute("""
        SELECT session_date, COALESCE(SUM(duration_seconds),0) as total_sec
        FROM work_sessions 
        WHERE end_time IS NOT NULL 
        GROUP BY session_date 
        ORDER BY session_date DESC LIMIT 7
    """).fetchall()
    out["reading_trend"] = [{"date": r["session_date"], "minutes": int(r["total_sec"] // 60)} for r in rows][::-1]

    # ---------- 最近动态（4 个核心模块：已完成今日任务、论文、文献、项目） ----------
    recent = []
    # 1. 已完成今日任务
    for t in conn.execute(
        "SELECT id,title,status,priority,plan_date,deadline,created_at FROM tasks WHERE status='done' AND (plan_date=? OR deadline=?) ORDER BY created_at DESC LIMIT 5",
        (today, today)
    ).fetchall():
        recent.append({"type": "task", "title": t["title"], "status": t["status"], "priority": t["priority"], "plan_date": t["plan_date"], "time": t["created_at"]})
    # 2. 论文进度
    for p in conn.execute("SELECT id,title,stage,progress,created_at FROM papers ORDER BY created_at DESC LIMIT 5").fetchall():
        recent.append({"type": "paper", "title": p["title"], "stage": p["stage"], "progress": p["progress"], "time": p["created_at"]})
    # 3. 文献阅读
    for l in conn.execute("SELECT id,title,status,authors,source,year,created_at FROM literatures ORDER BY created_at DESC LIMIT 5").fetchall():
        recent.append({"type": "literature", "title": l["title"], "status": l["status"], "authors": l["authors"], "source": l["source"], "year": l["year"], "time": l["created_at"]})
    # 4. 项目管理
    for pj in conn.execute("SELECT id,name,status,progress,start_date,end_date,created_at FROM projects ORDER BY created_at DESC LIMIT 5").fetchall():
        recent.append({"type": "project", "title": pj["name"], "status": pj["status"], "progress": pj["progress"], "start_date": pj["start_date"], "time": pj["created_at"]})
    recent.sort(key=lambda x: x.get("time") or "", reverse=True)
    out["recent"] = recent[:10]

    # ---------- 最近灵感 ----------
    inspires = conn.execute("SELECT * FROM inspirations ORDER BY id DESC LIMIT 3").fetchall()
    out["inspirations"] = [row_to_dict(i) for i in inspires]

    # ---------- 今日健康 ----------
    health = conn.execute("SELECT * FROM health_logs WHERE log_date=? ORDER BY id DESC LIMIT 1", (today,)).fetchone()
    out["health_today"] = row_to_dict(health) or {"mood": 3, "sleep_hours": 7, "exercise_minutes": 0}

    conn.close()
    return out


# ---------- 签到 / 签出 ----------
@app.get("/api/clock/state")
def clock_state():
    """获取今日签到状态、累计工时、工时范围"""
    conn = get_db()
    today = date.today().isoformat()
    now_dt = datetime.now()
    sessions = conn.execute(
        "SELECT * FROM work_sessions WHERE session_date=? ORDER BY id ASC", (today,)
    ).fetchall()

    total_seconds = 0
    for s in sessions:
        ci = datetime.fromisoformat(s["start_time"])
        co = datetime.fromisoformat(s["end_time"]) if s["end_time"] else now_dt
        diff = (co - ci).total_seconds()
        if diff > 0:
            total_seconds += int(diff)

    last = sessions[-1] if sessions else None
    is_working = last and last["end_time"] is None
    first_in = sessions[0]["start_time"] if sessions else None
    last_out = sessions[-1]["end_time"] if sessions and sessions[-1]["end_time"] else None

    return {
        "is_working": bool(is_working),
        "current_session_start": last["start_time"] if is_working else None,
        "total_seconds": total_seconds,
        "session_count": len(sessions),
        "first_in": first_in,
        "last_out": last_out,
        "now": now_dt.isoformat()
    }


@app.post("/api/clock/toggle")
def clock_toggle():
    """切换签到 / 签出 / 继续工作"""
    conn = get_db()
    today = date.today().isoformat()
    now = datetime.now().isoformat()

    last = conn.execute(
        "SELECT * FROM work_sessions WHERE session_date=? ORDER BY id DESC LIMIT 1", (today,)
    ).fetchone()

    if last and last["end_time"] is None:
        # 当前在工作中 -> 签出
        start_dt = datetime.fromisoformat(last["start_time"])
        end_dt = datetime.now()
        duration = int((end_dt - start_dt).total_seconds())
        conn.execute(
            "UPDATE work_sessions SET end_time=?, duration_seconds=?, status='done' WHERE id=?",
            (now, duration, last["id"])
        )
        conn.commit()
        action = "clock_out"
    else:
        # 签出 / 首次 -> 签到 (新工作段)
        conn.execute(
            "INSERT INTO work_sessions(session_date,start_time,end_time,duration_seconds,status,created_at) VALUES (?,?,?,?,?,?)",
            (today, now, None, 0, 'working', now)
        )
        conn.commit()
        action = "clock_in"

    conn.close()
    # 签出时奖励学习积分：每30分钟 +1 积分
    if action == "clock_out" and 'duration' in locals() and duration > 0:
        study_points = max(1, duration // 1800)
        award_points(today, study_points)
    return {"action": action, "now": now}


@app.get("/api/clock/sessions")
def clock_sessions():
    """获取今日所有工作段"""
    conn = get_db()
    today = date.today().isoformat()
    rows = conn.execute(
        "SELECT id, start_time, end_time, duration_seconds, status FROM work_sessions WHERE session_date=? ORDER BY id ASC",
        (today,)
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ---------- 日报生成 ----------
@app.get("/api/daily-report/preview")
def daily_report_preview():
    """预览今日日报内容"""
    conn = get_db()
    today = date.today().isoformat()
    today_date = date.today()
    weekdays = ["周日","周一","周二","周三","周四","周五","周六"]

    # 签到工时
    sessions = conn.execute(
        "SELECT start_time, end_time, duration_seconds FROM work_sessions WHERE session_date=?", (today,)
    ).fetchall()
    now_dt = datetime.now()
    total_sec = 0
    for s in sessions:
        if s["end_time"]:
            total_sec += s["duration_seconds"] or 0
        else:
            ci = datetime.fromisoformat(s["start_time"])
            total_sec += max(0, int((now_dt - ci).total_seconds()))
    study_h = total_sec // 3600
    study_m = (total_sec % 3600) // 60

    # 任务统计
    tasks_total = conn.execute("SELECT COUNT(*) FROM tasks WHERE plan_date=? OR deadline=?", (today, today)).fetchone()[0]
    tasks_done = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='done' AND (plan_date=? OR deadline=?)", (today, today)).fetchone()[0]
    done_tasks = conn.execute(
        "SELECT title FROM tasks WHERE status='done' AND (plan_date=? OR deadline=?) ORDER BY id DESC LIMIT 10",
        (today, today)
    ).fetchall()

    # 论文
    papers = conn.execute("SELECT title, stage, progress FROM papers ORDER BY id DESC").fetchall()

    # 文献
    all_lits = conn.execute("SELECT title, status FROM literatures ORDER BY id DESC LIMIT 10").fetchall()
    lits = len(all_lits)

    # 生成内容
    lines = []
    lines.append(f"📅 {today_date.year}年{today_date.month}月{today_date.day}日 {weekdays[today_date.weekday()]}")
    lines.append("")
    lines.append(f"⏱️ 学习时长：{study_h} 小时 {study_m} 分钟（签到记录 共 {len(sessions)} 段）")
    lines.append(f"✅ 今日任务：完成 {tasks_done}/{tasks_total} 项")
    if done_tasks:
        for t in done_tasks:
            lines.append(f"  ✓ {t['title']}")
    lines.append("")
    if papers:
        lines.append(f"📄 论文进展 ({len(papers)} 篇)：")
        for p in papers:
            lines.append(f"  · {p['title']} [{p['stage']}] {p['progress']}%")
    lines.append("")
    lines.append(f"📚 文献阅读：共 {lits} 篇")
    if all_lits:
        for l in all_lits:
            status_icon = '📖' if l['status'] == 'reading' else '✅' if l['status'] == 'completed' else '⭐' if l['status'] == 'important' else '📥'
            lines.append(f"  {status_icon} {l['title']}")
    lines.append("")
    lines.append("💡 随笔：")
    lines.append("")
    lines.append(f"*本日报自动生成于 {now_dt.strftime('%H:%M')}*")

    content = "\n".join(lines)
    conn.close()

    return {
        "title": f"日报 {today}",
        "content": content,
        "stats": {
            "study_minutes": total_sec // 60,
            "tasks_done": tasks_done,
            "tasks_total": tasks_total,
            "papers_count": len(papers),
            "literatures_count": lits
        }
    }


@app.post("/api/daily-report/save")
async def daily_report_save(request: Request):
    """保存日报到日记随笔"""
    body = await request.json()
    conn = get_db()
    today = date.today().isoformat()
    now = datetime.now().isoformat()

    conn.execute(
        "INSERT INTO diaries(title, content, tags, mood, diary_date, created_at) VALUES (?,?,?,?,?,?)",
        (body.get("title", f"日报 {today}"), body.get("content", ""), body.get("tags", "日报,自动生成"), body.get("mood", 3), today, now)
    )
    conn.commit()
    new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {"id": new_id, "message": "日报已保存到日记随笔"}


# ---------- AI 配置 ----------
PRESET_PROVIDERS = {
    "local": {"name": "本地示例", "base_url": "", "models": ["本地示例"]},
    "openai": {"name": "OpenAI", "base_url": "https://api.openai.com/v1", "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]},
    "deepseek": {"name": "DeepSeek", "base_url": "https://api.deepseek.com/v1", "models": ["deepseek-chat", "deepseek-reasoner"]},
    "claude": {"name": "Claude (Anthropic)", "base_url": "https://api.anthropic.com/v1", "models": ["claude-3-5-sonnet", "claude-3-opus"]},
    "qwen": {"name": "通义千问", "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1", "models": ["qwen-plus", "qwen-max", "qwen-turbo"]},
    "custom": {"name": "自定义", "base_url": "", "models": []}
}


@app.get("/api/ai/config")
def get_ai_config():
    conn = get_db()
    row = conn.execute("SELECT * FROM ai_config ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    cfg = row_to_dict(row) or {"provider": "local", "model": "本地示例", "base_url": "", "api_key": ""}
    cfg["api_key"] = "***" if cfg.get("api_key") else ""
    return cfg


@app.put("/api/ai/config")
async def update_ai_config(request: Request):
    body = await request.json()
    conn = get_db()
    api_key = body.get("api_key")
    if api_key == "***":
        old = conn.execute("SELECT api_key FROM ai_config ORDER BY id DESC LIMIT 1").fetchone()
        api_key = old["api_key"] if old else ""
    conn.execute("UPDATE ai_config SET provider=?, api_key=?, base_url=?, model=? WHERE id=1",
                 (body.get("provider", "local"), api_key, body.get("base_url", ""), body.get("model", "")))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/api/ai/presets")
def ai_presets():
    return PRESET_PROVIDERS


# ---------- AI 对话 ----------
class AIAsk(BaseModel):
    module: str  # advisor / journal
    question: str
    extra: Optional[dict] = None


def get_ai_client():
    """获取配置的 AI 信息"""
    conn = get_db()
    cfg = conn.execute("SELECT * FROM ai_config ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    if not cfg:
        return {"provider": "local", "model": "本地示例", "api_key": "", "base_url": ""}
    return {"provider": cfg["provider"], "model": cfg["model"], "api_key": cfg["api_key"] or "", "base_url": cfg["base_url"] or ""}


def call_real_ai(system_prompt: str, user_prompt: str) -> str:
    """调用配置的真实 AI 接口"""
    client = get_ai_client()
    provider = client["provider"]

    if provider == "local" or not client["api_key"]:
        return None

    base_url = client["base_url"].rstrip("/")
    model = client["model"]
    api_key = client["api_key"]

    # 构造 OpenAI-compatible 请求（适用于 DeepSeek、通义千问等）
    if provider in ("openai", "deepseek", "qwen", "custom"):
        url = f"{base_url}/chat/completions"
        data = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }).encode()
        req = urllib.request.Request(url, data=data, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        })
    elif provider == "claude":
        url = f"{base_url}/messages"
        data = json.dumps({
            "model": model,
            "max_tokens": 2000,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}]
        }).encode()
        req = urllib.request.Request(url, data=data, headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        })
    else:
        return None

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        body = json.loads(resp.read().decode())
        if provider == "claude":
            return body.get("content", [{}])[0].get("text", "")
        return body.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        return f"[AI 调用失败: {str(e)}]"


def ai_advisor_reply(question: str) -> str:
    system = "你是一位资深研究生导师，帮助研究生回复导师的问题。请给出专业、全面、有逻辑的分析和建议。"
    real = call_real_ai(system, f"导师提问：{question}\n请从研究进展、困难、下一步计划三个维度给出回复建议和修改方案。")
    if real:
        return real
    return (
        f"【问题分析】\n针对您导师提到的内容：\"{question}\"，建议从研究进展、遇到的困难、下一步计划三个维度回应。\n\n"
        f"【回复建议】\n尊敬的导师：\n感谢您的指导。关于您提到的问题，我目前的进展如下：\n1) 已完成相关文献调研；\n2) 初步实验已跑通，结论符合预期；\n3) 论文初稿正在撰写中。\n\n"
        f"【修改方案】\n- 若导师对方法提出疑问，可补充对比实验；\n- 若要求补充实验，可提前规划时间节点；\n- 若需修改论文，可按章节逐步迭代。\n\n"
        f"【下一步行动】\n1. 本周内完成补充实验；\n2. 整理最新结果于下次组会汇报；\n3. 同步邮件抄送合作者。\n"
    )


def ai_journal_reply(question: str, extra: Optional[dict] = None) -> str:
    extra = extra or {}
    field = extra.get("field") or "通用"
    system = "你是一位学术论文投稿专家。根据用户的研究方向和摘要，推荐合适的期刊，给出匹配度和投稿建议。"
    user = f"研究方向：{field}\n内容：{question}"
    real = call_real_ai(system, user)
    if real:
        return real
    return (
        f"【研究方向】{field}\n\n"
        f"【推荐期刊】\n"
        f"1. **软件学报**（CCF-A 中文）— 匹配度 88% — 侧重系统设计与方法创新；\n"
        f"2. **计算机研究与发展**（CCF-A 中文）— 匹配度 82% — 偏重理论深度；\n"
        f"3. **IEEE Transactions on Software Engineering** — 匹配度 76% — 国际化影响力高；\n"
        f"4. **ACM Transactions on Software Engineering and Methodology** — 匹配度 73%。\n\n"
        f"【投稿建议】\n- 优先投稿 1-2 个匹配度高的期刊；\n- 阅读近 3 年该期刊相关文章调整写作风格；\n- 注意字数、参考文献格式、匿名要求。\n\n"
        f"【注意事项】\n- 避免一稿多投；\n- 预留 1-2 周返修时间；\n- 准备好 Cover Letter 与 Highlights。\n"
    )


@app.post("/api/ai/ask")
def ai_ask(body: AIAsk):
    if body.module == "advisor":
        answer = ai_advisor_reply(body.question)
    elif body.module == "journal":
        answer = ai_journal_reply(body.question, body.extra)
    else:
        answer = "暂不支持的模块"
    conn = get_db()
    conn.execute(
        "INSERT INTO ai_conversations(module,question,answer,created_at) VALUES (?,?,?,?)",
        (body.module, body.question, answer, now_str())
    )
    conn.commit()
    conn.close()
    return {"answer": answer}


@app.get("/api/ai/history")
def ai_history(module: Optional[str] = None):
    conn = get_db()
    if module:
        rows = conn.execute("SELECT * FROM ai_conversations WHERE module=? ORDER BY id DESC LIMIT 50", (module,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM ai_conversations ORDER BY id DESC LIMIT 50").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ---------- 文件上传 ----------
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"url": f"/uploads/{name}", "filename": file.filename}


# ---------- 文件中心（文件夹 + 管理） ----------
@app.get("/api/folders")
def list_folders():
    conn = get_db()
    rows = conn.execute("SELECT * FROM file_folders ORDER BY id ASC").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]

@app.post("/api/folders")
async def create_folder(request: Request):
    body = await request.json()
    conn = get_db()
    cur = conn.execute("INSERT INTO file_folders(name,created_at) VALUES (?,?)", (body["name"], now_str()))
    conn.commit()
    fid = cur.lastrowid
    conn.close()
    return {"id": fid, "name": body["name"]}

@app.delete("/api/folders/{folder_id}")
def delete_folder(folder_id: int):
    conn = get_db()
    conn.execute("UPDATE file_records SET folder_id=0 WHERE folder_id=?", (folder_id,))
    conn.execute("DELETE FROM file_folders WHERE id=?", (folder_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.post("/api/files/upload")
async def file_upload_folder(folder_id: int = 0, file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    conn = get_db()
    conn.execute("INSERT INTO file_records(folder_id,filename,file_path,file_size,created_at) VALUES (?,?,?,?,?)",
                 (folder_id, file.filename, f"/uploads/{name}", len(content), now_str()))
    conn.commit()
    conn.close()
    return {"filename": file.filename, "url": f"/uploads/{name}"}

@app.get("/api/files")
def list_files(folder_id: int = 0):
    conn = get_db()
    if folder_id == 0:
        rows = conn.execute("SELECT * FROM file_records WHERE folder_id=0 ORDER BY id DESC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM file_records WHERE folder_id=? ORDER BY id DESC", (folder_id,)).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]

@app.delete("/api/files/{file_id}")
def delete_file(file_id: int):
    conn = get_db()
    conn.execute("DELETE FROM file_records WHERE id=?", (file_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.put("/api/files/{file_id}/move")
async def move_file(file_id: int, request: Request):
    body = await request.json()
    conn = get_db()
    conn.execute("UPDATE file_records SET folder_id=? WHERE id=?", (body.get("folder_id", 0), file_id))
    conn.commit()
    conn.close()
    return {"ok": True}


# ---------- 日历 / 每日概览 ----------
@app.get("/api/day-overview")
def day_overview(date: str):
    """返回某一天的概览：任务、当日阅读文献、日记、健康、学习时长"""
    conn = get_db()
    tasks = conn.execute(
        "SELECT * FROM tasks WHERE plan_date=? OR deadline=? ORDER BY priority DESC, id DESC",
        (date, date)
    ).fetchall()
    lits = conn.execute(
        "SELECT id, title, status, authors, source FROM literatures WHERE read_at LIKE ?",
        (date + "%",)
    ).fetchall()
    diaries = conn.execute(
        "SELECT id, title, content FROM diaries WHERE diary_date=?", (date,)
    ).fetchall()
    health = conn.execute("SELECT * FROM health_logs WHERE log_date=?", (date,)).fetchone()
    sessions = conn.execute(
        "SELECT start_time, end_time, duration_seconds FROM work_sessions WHERE session_date=?",
        (date,)
    ).fetchall()
    now_dt = datetime.now()
    total_sec = 0
    for s in sessions:
        if s["end_time"]:
            total_sec += s["duration_seconds"] or 0
        else:
            try:
                ci = datetime.fromisoformat(s["start_time"])
                total_sec += max(0, int((now_dt - ci).total_seconds()))
            except Exception:
                pass
    conn.close()
    return {
        "date": date,
        "tasks": [row_to_dict(t) for t in tasks],
        "literatures": [row_to_dict(l) for l in lits],
        "diaries": [row_to_dict(d) for d in diaries],
        "health": row_to_dict(health) if health else None,
        "study_minutes": total_sec // 60,
    }


# ---------- 健康检查 ----------
@app.get("/")
def root():
    return {"message": "硕博成长工作台 API 运行中", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
