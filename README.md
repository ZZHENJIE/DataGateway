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

---

## 3. 获取 Bun 的绝对路径 (重要)

由于 `systemd` 不读取用户的环境变量，我们需要知道 `bun` 的确切安装位置：

```bash
which bun
```
*记录下输出的路径（例如：`/root/.bun/bin/bun` 或 `/home/ubuntu/.bun/bin/bun`），下一步会用到。*

---

## 4. 配置 Systemd 守护进程

假设我们需要运行两个不同的服务（请确保你在代码中已经为它们分配了不同的端口）：
*   **Service A (`api.xxx.com`)**：运行在 `3000` 端口。
*   **Service B (`data.xxx.com`)**：运行在 `8080` 端口。

### 4.1 创建 api-service 服务
```bash
sudo nano /etc/systemd/system/api-service.service
```
写入以下内容（**注意替换 `WorkingDirectory` 和 `ExecStart` 中的实际路径**）：

```ini
[Unit]
Description=DataGateway API Service (Port 3000)
After=network.target

[Service]
Type=simple
# 建议使用普通用户运行（如果使用 root 则保留 User=root）
User=root
# 你的项目目录
WorkingDirectory=/var/www/DataGateway
# 启动命令（替换为你上一步查到的 bun 绝对路径）
ExecStart=/root/.bun/bin/bun run src/index.ts
# 崩溃自动重启
Restart=always
RestartSec=3
# 生产环境变量
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 4.2 创建 data-service 服务
```bash
sudo nano /etc/systemd/system/data-service.service
```
写入以下内容（假设你的第二个服务代码在 `DataGateway/data-service` 目录下，端口为 8080）：

```ini
[Unit]
Description=DataGateway Data Service (Port 8080)
After=network.target

[Service]
Type=simple
User=root
# 第二个服务的目录
WorkingDirectory=/var/www/DataGateway/data-service
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 4.3 启动服务并设置开机自启
```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 设置开机自启
sudo systemctl enable api-service
sudo systemctl enable data-service

# 启动服务
sudo systemctl start api-service
sudo systemctl start data-service

# 检查状态（确保显示为 active (running)）
sudo systemctl status api-service
sudo systemctl status data-service
```

*常用维护命令：*
*   重启服务：`sudo systemctl restart api-service`
*   停止服务：`sudo systemctl stop api-service`
*   查看实时日志：`sudo journalctl -u api-service -f`

---

## 5. 配置 Nginx 反向代理

我们将配置 Nginx，让它监听 80 端口，根据请求的域名（`Host` 头）将流量分发给不同的本地端口。

### 5.1 创建 Nginx 配置文件
```bash
sudo nano /etc/nginx/sites-available/datagateway
```

### 5.2 粘贴以下配置
将以下内容完整粘贴进去（**请确保将 `xxx.com` 替换为你实际的域名**）：

```nginx
# ==========================================
# 1. 配置 api.xxx.com -> 转发到 3000 端口
# ==========================================
server {
    listen 80;
    server_name api.xxx.com;

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

# ==========================================
# 2. 配置 data.xxx.com -> 转发到 8080 端口
# ==========================================
server {
    listen 80;
    server_name data.xxx.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5.3 启用配置并重载 Nginx
```bash
# 创建软链接，启用该站点配置
sudo ln -s /etc/nginx/sites-available/datagateway /etc/nginx/sites-enabled/

# 移除 Nginx 默认的欢迎页面配置（可选，防止干扰）
sudo rm /etc/nginx/sites-enabled/default

# 测试 Nginx 配置文件语法是否正确
sudo nginx -t

# 如果提示 successful，则重载 Nginx 使配置生效
sudo systemctl reload nginx
```

---

## 6. DNS 解析

登录你的域名服务商控制台，为两个子域名添加 **A 记录**：

| 主机记录 | 记录类型 | 记录值 (IP) | 说明 |
| :--- | :--- | :--- | :--- |
| `api` | A | 你的服务器公网 IP | 指向 3000 端口的服务 |
| `data` | A | 你的服务器公网 IP | 指向 8080 端口的服务 |

---

## 7. 验证部署

由于不需要 HTTPS，直接使用 Postman 或 curl 发起 HTTP 请求即可。

```bash
# 测试 api 服务 (预期返回你的 API 响应)
curl http://api.xxx.com/

# 测试 data 服务
curl http://data.xxx.com/
```

### 注意事项
1.  **防火墙放行**：请确保云服务器的安全组（Security Group）或系统防火墙放行了 **80** 端口的入站规则。
2.  **代码更新**：后续如果代码有更新，只需在服务器项目目录执行 `git pull`，更新依赖，然后重启对应的服务：
    ```bash
    cd /var/www/DataGateway
    git pull
    bun install
    sudo systemctl restart api-service
    # 如果有其他服务也一并重启
    sudo systemctl restart data-service
    ```
