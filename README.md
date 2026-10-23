# DataGateway 服务器部署指南

本项目（DataGateway）基于 Hono + Bun 开发。本指南介绍如何在一台全新的 Linux 服务器上完成部署，使用 Linux 原生的 `systemd` 守护进程，并使用 Nginx 作为反向代理，通过不同域名将请求路由到对应的后端服务端口（HTTP 协议，无 HTTPS）。

## 1. 服务器环境准备

登录你的 Linux 服务器（以 Ubuntu/Debian 为例），安装所需的运行环境。

### 1.1 安装 Bun
```bash
curl -fsSL https://bun.sh/install | bash
```
安装完成后，根据终端提示，执行 `source` 命令使环境变量生效（或者重新连接 SSH）：
```bash
source ~/.bashrc
```

### 1.2 安装 Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

---

## 2. 部署项目代码

将代码拉取到服务器的指定目录（例如 `/var/www/`）。

```bash
# 进入目录
cd /var/www/

# 克隆代码 (请替换为你自己的仓库地址)
git clone <你的仓库地址> DataGateway

# 进入项目目录
cd DataGateway

# 安装依赖
bun install
```

## 3. 配置 Systemd 守护进程
```bash
sudo nano /etc/systemd/system/data-gateway.service
```

```ini
[Unit]
Description=DataGateway API Service (Port 3000)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/DataGateway
ExecStart=/root/.bun/bin/bun run dev
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 3.3 启动服务并设置开机自启
```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 设置开机自启
sudo systemctl enable data-gateway

# 启动服务
sudo systemctl start data-gateway

# 检查状态（确保显示为 active (running)）
sudo systemctl status data-gateway
```

*常用维护命令：*
*   重启服务：`sudo systemctl restart api-service`
*   停止服务：`sudo systemctl stop api-service`
*   查看实时日志：`sudo journalctl -u api-service -f`

---

## 4. 配置 Nginx 反向代理

我们将配置 Nginx，让它监听 80 端口，根据请求的域名（`Host` 头）将流量分发给不同的本地端口。

### 4.1 创建 Nginx 配置文件
```bash
sudo nano /etc/nginx/conf.d/datagateway.conf
```

### 4.2 粘贴以下配置
将以下内容完整粘贴进去（**请确保将 `xxx.com` 替换为你实际的域名**）：

```nginx
# ==========================================
# 1. 配置 api.xxx.com -> 转发到 3000 端口
# ==========================================
server {
    listen 80;
    server_name data.xxx.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        
        # 保留基础代理头，方便后端获取真实客户端信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 支持 WebSocket 等长连接（按需保留）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 4.3 启用配置并重载 Nginx
```bash
# 测试 Nginx 配置文件语法是否正确
sudo nginx -t

# 如果提示 successful，则重载 Nginx 使配置生效
sudo systemctl reload nginx
```

---
