-- 硕博成长工作台 - 数据库初始化脚本
-- 兼容 SQLite / MySQL / PostgreSQL

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    name TEXT,
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
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    literature_id INTEGER,
    title TEXT,
    content TEXT,
    tags TEXT,
    background TEXT,
    method TEXT,
    innovation TEXT,
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

-- 初始化默认用户
INSERT OR IGNORE INTO users(username, name, avatar, created_at)
VALUES ('admin', '研究生', '', datetime('now'));

-- 初始化示例数据
INSERT INTO tasks(title, type, plan_date, deadline, priority, status, progress, tag, description, created_at) VALUES
('完成开题报告 PPT', 'academic', date('now'), date('now'), 'high', 'pending', 60, '开题', '整理研究背景和方案', datetime('now')),
('阅读 3 篇顶会论文', 'reading', date('now'), date('now'), 'medium', 'in_progress', 33, '文献', '关注最新方法', datetime('now')),
('回复导师邮件', 'communication', date('now'), date('now'), 'high', 'pending', 0, '导师', '汇报本周进展', datetime('now')),
('跑通实验 baseline', 'experiment', date('now'), date('now'), 'high', 'in_progress', 50, '实验', '调试环境', datetime('now'));

INSERT INTO papers(title, target_journal, stage, progress, description, created_at)
VALUES ('基于深度学习的科研管理系统设计', '软件学报', '数据分析', 40, '提出新框架', datetime('now'));

INSERT INTO literatures(title, authors, source, year, status, tags, created_at)
VALUES ('Attention Is All You Need', 'Vaswani et al.', 'NeurIPS', '2017', 'completed', 'Transformer,AI', datetime('now'));

INSERT INTO health_logs(log_date, sleep_hours, exercise_minutes, mood, note, created_at)
VALUES (date('now'), 7.5, 30, 4, '状态不错', datetime('now'));

INSERT INTO growth_logs(log_date, research, paper, reading, writing, learning, management, health, points, created_at)
VALUES (date('now'), 70, 50, 80, 60, 75, 65, 80, 12, datetime('now'));
