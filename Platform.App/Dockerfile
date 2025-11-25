# Dockerfile for Expo Web App
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Export static web build
RUN npm run web 

# Production image, copy all the files and run
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy static files from builder
COPY --from=builder /app/dist ./

# Copy nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
