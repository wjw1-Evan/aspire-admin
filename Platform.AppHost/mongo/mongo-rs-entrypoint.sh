#!/bin/bash
set -e

# 🛡️ 为副本集认证创建 KeyFile
# 在 Auth 模式下启动副本集，MongoDB 强制要求拥有共同的 KeyFile。
# 由于直接挂载 host 文件的权限通常不符合 MongoDB 要求的 400，
# 我们在容器内部的临时目录中动态生成它。
KEYFILE_PATH="/tmp/mongo-keyfile"

echo "ReplicaSetSecureKey12345" > "$KEYFILE_PATH"
chmod 400 "$KEYFILE_PATH"
chown mongodb:mongodb "$KEYFILE_PATH"

echo "🚀 [Custom Entrypoint] 正在启动 MongoDB 副本集模式..."

# 调用原始入口点脚本，注入 --replSet 和 --keyFile 参数
# "$@" 包含了 Aspire 定义的其他参数（如 --bind_ip_all）
exec /usr/local/bin/docker-entrypoint.sh mongod \
    --replSet rs0 \
    --keyFile "$KEYFILE_PATH" \
    "$@"
