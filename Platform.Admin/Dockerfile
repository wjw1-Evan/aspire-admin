# Platform.Admin Dockerfile
# 多阶段构建：依赖安装 -> 构建 -> 生产镜像

# 阶段 1: 安装依赖
FROM node:20-alpine AS deps
WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci --only=production=false

# 阶段 2: 构建应用
FROM node:20-alpine AS builder
WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 构建应用（UmiJS 会生成 dist 目录）
RUN npm run build

# 阶段 3: 生产镜像（使用 nginx）
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# 复制构建产物
COPY --from=builder /app/dist ./

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 8080

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

