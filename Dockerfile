FROM python:3.11-slim

WORKDIR /app

# Install deps (纯 runtime 依赖，无编译风险)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Data directory for persistent storage
RUN mkdir -p /app/data
ENV GRW_DB_PATH=/app/data/grw.db
ENV GRW_UPLOAD_DIR=/app/data/uploads

WORKDIR /app/backend
# Railway 动态分配 PORT，默认 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
