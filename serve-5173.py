"""
5173 端口静态前端服务器（Python，替代 Vite，稳定不崩）
- 服务 frontend/dist 静态文件
- /api/* 反向代理到 localhost:8000
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(BASE, "frontend", "dist")
BACKEND = "http://localhost:8000"

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json",
}


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # 静默

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        # API 代理
        if path.startswith("/api/"):
            self._proxy("GET")
            return
        # 静态文件
        if path == "/":
            path = "/index.html"
        fp = os.path.join(DIST, path.lstrip("/"))
        if os.path.isfile(fp):
            ext = os.path.splitext(fp)[1].lower()
            with open(fp, "rb") as f:
                self._send(200, f.read(), MIME.get(ext, "application/octet-stream"))
        else:
            # SPA 回退
            with open(os.path.join(DIST, "index.html"), "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")

    def _proxy(self, method):
        url = BACKEND + self.path
        try:
            req = urllib.request.Request(url, method=method)
            for h in ("Content-Type", "Authorization"):
                if h in self.headers:
                    req.add_header(h, self.headers[h])
            if method in ("POST", "PUT", "DELETE"):
                ln = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(ln) if ln else b""
                req.data = body
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                ctype = resp.headers.get("Content-Type", "application/json")
                self._send(resp.status, data, ctype)
        except urllib.error.HTTPError as e:
            self._send(e.code, e.read(), "application/json")
        except Exception as e:
            self._send(502, str(e).encode(), "text/plain")

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy("POST")
        else:
            self._send(404, b"not found")

    def do_PUT(self):
        self._proxy("PUT")

    def do_DELETE(self):
        self._proxy("DELETE")


if __name__ == "__main__":
    port = 5173
    with socketserver.ThreadingTCPServer(("0.0.0.0", port), Handler) as httpd:
        print(f"[5173] Static frontend + /api proxy -> {BACKEND}", flush=True)
        httpd.serve_forever()
