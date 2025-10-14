#!/bin/bash

# 测试头像修复的脚本
# 用途：验证 /api/currentUser 返回的数据中是否包含 name 字段

echo "🔍 测试头像修复..."
echo ""

# 等待服务启动
echo "⏳ 等待服务启动 (5秒)..."
sleep 5

# 获取 token（假设已登录，从浏览器复制）
# 如果没有 token，请先登录系统
if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠️  请先设置 AUTH_TOKEN 环境变量"
    echo "   示例: export AUTH_TOKEN='your-jwt-token'"
    echo ""
    echo "   获取方式："
    echo "   1. 登录系统"
    echo "   2. 打开浏览器开发者工具"
    echo "   3. Application -> Local Storage -> auth_token"
    exit 1
fi

echo "🚀 发送请求到 /api/currentUser..."
echo ""

# 发送请求
RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
    http://localhost:15000/apiservice/api/currentUser)

echo "📦 响应数据:"
echo "$RESPONSE" | jq '.'
echo ""

# 检查是否包含 name 字段
if echo "$RESPONSE" | jq -e '.data.name' > /dev/null 2>&1; then
    NAME=$(echo "$RESPONSE" | jq -r '.data.name')
    echo "✅ 成功: 找到 name 字段，值为: $NAME"
    echo "✅ 头像应该能正常显示了！"
else
    echo "❌ 失败: 没有找到 name 字段"
    echo "❌ 请检查以下内容:"
    echo "   1. 后端服务是否已重启"
    echo "   2. JsonPropertyName 特性是否正确配置"
    echo "   3. JSON 序列化选项是否正确"
fi

echo ""
echo "🔍 详细字段检查:"
echo "   - name: $(echo "$RESPONSE" | jq -r '.data.name // "不存在"')"
echo "   - displayName: $(echo "$RESPONSE" | jq -r '.data.displayName // "不存在"')"
echo "   - username: $(echo "$RESPONSE" | jq -r '.data.username // "不存在"')"
echo "   - isLogin: $(echo "$RESPONSE" | jq -r '.data.isLogin // "不存在"')"

