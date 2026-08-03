# 硕博成长工作台 (Graduate Research Workspace)

> 面向硕博研究生的个人科研成长管理平台  
> PhD Workbench + Notion + AI 科研助手 的设计融合

## 一、项目结构

```
grw-workspace/
├── backend/                 # FastAPI 后端
│   ├── app.py              # 主程序（API + 路由 + 数据库）
│   ├── requirements.txt    # Python 依赖
│   ├── grw.db              # SQLite 数据库（启动自动创建）
│   ├── uploads/            # 用户上传文件目录
│   └── .venv/              # Python 虚拟环境
└── frontend/                # React + Vite 前端
    ├── src/
    │   ├── pages/          # 17 个业务页面
    │   ├── components/     # 公共组件
    │   ├── layout/         # 全局布局
    │   ├── lib/api.ts      # axios 封装
    │   └── App.tsx         # 路由配置
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── dist/               # 生产构建产物
```

## 二、技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + ECharts + React Router |
| 后端 | Python 3.13 + FastAPI + Uvicorn + Pydantic v2 |
| 数据库 | SQLite（零依赖，开箱即用，可平滑迁移至 MySQL/PostgreSQL） |
| AI | 本地示例回复（可替换为 OpenAI / DeepSeek / 通义千问 等大模型） |

## 三、核心功能（17 个模块）

- **Dashboard** — 数据卡片 + 六维雷达图 + 阅读时长柱状图 + 最近动态
- **计划与复盘** — 目标 + 复盘两条线，支持年/月/周/日
- **论文进度** — 选题→调研→设计→分析→写作→投稿→审稿→发表 完整生命周期
- **成长中心** — 积分 + 雷达 + 多维可视化
- **文献库 + 笔记** — Zotero 风格管理 + 结构化笔记
- **组会纪要** — 会议时间、导师意见、待办、下一步
- **项目管理** — 起止时间、任务列表、成果、进度条
- **实验/模拟索引** — 软件、版本、参数、条件、数据文件、结果图
- **导师消息应答助手** — AI 润色邮件回复
- **投稿择刊助手** — AI 推荐期刊 + 投稿策略
- **健康打卡** — 睡眠 / 运动 / 心情 趋势图
- **英语学习** — 单词 / 阅读 / 听力 时长记录
- **日记随笔** — 标题 + 心情 + 标签 + Markdown
- **日常记账** — 收支记录 + 月度统计 + 分类饼图
- **灵感素材库** — 图片 / 网站 / 想法 / 创新点
- **文件中心** — PDF / 图片 上传管理
- **系统设置** — 主题、存储、AI 接口

## 四、本地运行

### 1. 启动后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
python app.py                  # 默认 0.0.0.0:8000
```

后端启动后会自动创建 SQLite 数据库并注入示例数据。

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev                    # 默认 0.0.0.0:5173
```

### 3. 浏览器访问

打开 **http://localhost:5173/** 即可使用。

> 已在 `vite.config.ts` 配置代理，前端 `/api` 与 `/uploads` 会自动转发到 `http://localhost:8000`。

## 五、生产部署

### 方案 A：单台服务器（Nginx + Systemd）

```bash
# 1. 构建前端
cd frontend
npm run build                  # 产物在 frontend/dist/

# 2. 让 FastAPI 同时托管前端静态资源
# 在 backend/app.py 末尾追加：
#   app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="web")

# 3. 启动后端
cd ../backend
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 2
```

### 方案 B：Docker（推荐）

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### 方案 C：迁移到 MySQL / PostgreSQL

修改 `backend/app.py`：
```python
import pymysql
conn = pymysql.connect(host="...", user="...", password="...", database="grw")
```
所有 SQL 语句均使用标准 ANSI 语法，可直接迁移。

## 六、数据库表（共 16 张）

| 表名 | 用途 |
|------|------|
| users | 用户 |
| tasks | 任务 |
| goals | 目标 |
| reviews | 复盘 |
| papers | 论文 |
| literatures | 文献 |
| notes | 文献笔记 |
| meetings | 组会 |
| projects | 项目 |
| experiments | 实验 |
| submissions | 投稿 |
| health_logs | 健康 |
| english_logs | 英语 |
| diaries | 日记 |
| finances | 账目 |
| inspirations | 灵感 |
| ai_conversations | AI 问答 |
| growth_logs | 成长 |
| files | 文件 |

## 七、AI 接口替换示例

在 `backend/app.py` 中：

```python
import openai

def ai_advisor_reply(question: str) -> str:
    client = openai.OpenAI(api_key="sk-xxx")
    rsp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "你是科研邮件回复助手..."},
            {"role": "user", "content": question}
        ]
    )
    return rsp.choices[0].message.content
```

也可使用 DeepSeek / 通义千问 / Ollama 等，只需替换为对应 SDK 调用。

## 八、Roadmap

- **MVP（已交付）**：Dashboard、任务、论文、文献、笔记、组会、项目、实验、健康、日记、记账、灵感、AI 助手
- **V2**：知识图谱可视化、PDF 智能解析、AI 自动文献总结
- **V3**：移动端 PWA 离线、云同步、个人科研档案 PDF 导出

## 九、License

MIT — 你可以自由使用、修改、商用。
