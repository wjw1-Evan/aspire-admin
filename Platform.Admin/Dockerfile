FROM node:20-alpine AS build
WORKDIR /app

# [优化] 先复制依赖配置，利用 Docker 层缓存
COPY package.json package-lock.json ./

# [优化] 使用 BuildKit 缓存挂载，避免重复下载 npm 包
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# 复制源代码并构建
COPY . .
RUN npm run build
