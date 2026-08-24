# Mnemosyne (CPKB) 部署指南

> 个人知识库 · FastAPI 后端 + React 前端 · Caddy 自动 HTTPS · 公网 ECS
> 域名：`mnemosyne.cdxypo.cn`（子域名，公网 IP `8.130.92.46`）
> 最后更新: 2026-08-25

## 目标架构

```
浏览器 ── https://mnemosyne.cdxypo.cn
        │
        ▼
Caddy (80/443, 自动 HTTPS)
   ├── handle /api/*   ── reverse_proxy 127.0.0.1:8000   (FastAPI 后端)
   └── handle 其余     ── 托管 frontend/dist 静态文件 (SPA fallback)
```

后端只监听 `127.0.0.1:8000`，不暴露公网；Caddy 作为唯一 HTTPS 入口。
与 Cronos 部署方式完全一致（Caddy 反代 + 宿主机直跑，无 Docker）。

## 一、构建前端

```bash
cd /home/ecs-user/workspace/Mnemosyne/frontend
npm install
npm run build          # 产出 frontend/dist
```

## 二、后端（venv + uvicorn）

> 注意：本机未安装 `python3-venv`，创建 venv 需用 `--without-pip` + 手动引导 pip。

```bash
cd /home/ecs-user/workspace/Mnemosyne/backend
python3 -m venv --without-pip .venv
curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
.venv/bin/python /tmp/get-pip.py
.venv/bin/pip install -r requirements.txt
```

启动（后台，写日志到 `logs/backend.log`）：

```bash
cd /home/ecs-user/workspace/Mnemosyne/backend
nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 \
  >> /home/ecs-user/workspace/Mnemosyne/logs/backend.log 2>&1 &
```

验证：

```bash
curl http://127.0.0.1:8000/api/health     # {"status":"ok","version":"0.1.0"}
```

数据落在 `backend/data/`（`cpkb.db` + `uploads/`），已加入 `.gitignore`。

## 三、Caddy（反代 + 自动 HTTPS）

`deploy/Caddyfile` 已包含 `mnemosyne.cdxypo.cn` 与 `cronos.cdxypo.cn` 两个站点块。部署：

```bash
sudo cp /home/ecs-user/workspace/Mnemosyne/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager    # active (running)
```

Caddy 自动向 Let's Encrypt 申请证书，无需手动操作。

## 四、DNS 解析（阿里云控制台）

云解析 DNS → `cdxypo.cn` → 添加记录：

```
记录类型: A
主机记录: mnemosyne       # 子域名 mnemosyne.cdxypo.cn
记录值:   8.130.92.46     # ECS 公网 IP
TTL:      默认 600
```

安全组 80 / 443 已放行（Cronos 已配置），无需改动。

## 五、验证 HTTPS

```bash
curl -I https://mnemosyne.cdxypo.cn                      # 200
curl -s https://mnemosyne.cdxypo.cn/api/health           # {"status":"ok",...}
curl -s https://mnemosyne.cdxypo.cn/api/v1/notes         # {"items":[],...}
```

## 六、日常维护

重启后端：

```bash
pkill -f "uvicorn app.main" 2>/dev/null; sleep 2
cd /home/ecs-user/workspace/Mnemosyne/backend
nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 \
  >> /home/ecs-user/workspace/Mnemosyne/logs/backend.log 2>&1 &
```

更新代码后重新构建前端并重启后端：

```bash
cd /home/ecs-user/workspace/Mnemosyne/frontend && npm run build
# 再重启后端（或仅需重启后端即可，静态文件由 Caddy 直接托管，无需重启后端）
```

> 静态文件由 Caddy 直接托管 `frontend/dist`，前端更新后 `npm run build` 即生效；
> 后端代码改动才需要重启 uvicorn 进程。

## 七、可选：开机自启 / 健康检查

当前后端用 `nohup` 启动，重启服务器后需手动拉起。可选方案：

- **systemd 服务**：`deploy/mnemosyne.service` 已写好，`Restart=always` 开机自启 + 崩溃自动拉起：

  ```bash
  # 先停掉 nohup 旧进程（避免端口占用）
  pkill -f "uvicorn app.main"
  # 安装并启动
  sudo cp /home/ecs-user/workspace/Mnemosyne/deploy/mnemosyne.service /etc/systemd/system/mnemosyne.service
  sudo systemctl daemon-reload
  sudo systemctl enable --now mnemosyne
  sudo systemctl status mnemosyne --no-pager
  ```

  之后管理命令：`sudo systemctl restart|stop|status mnemosyne`，日志 `sudo journalctl -u mnemosyne -f`。

- **crontab 健康检查**：仿照 Cronos 的 `scripts/health_check.sh`，每 5 分钟探测 `/api/health`，失败自动重启（systemd 已覆盖此场景，可省略）。
