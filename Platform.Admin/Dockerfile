FROM node:20-alpine AS build
WORKDIR /app

# [优化] 先复制依赖配置，利用 Docker 层缓存
COPY package.json package-lock.json ./

# 安装依赖（依赖 Docker 层缓存）
RUN npm ci --legacy-peer-deps

# 复制源代码并构建
COPY . .
RUN npm run build
