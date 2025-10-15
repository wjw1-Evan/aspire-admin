#!/bin/bash

echo "🔍 测试 OpenAPI 端点..."
echo ""

# 等待服务启动
echo "⏳ 等待服务启动（30秒）..."
sleep 30

echo ""
echo "📋 测试 OpenAPI JSON 端点..."
curl -s http://localhost:15000/apiservice/openapi/v1.json | jq '.info' 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ OpenAPI JSON 端点正常"
else
    echo "❌ OpenAPI JSON 端点异常"
fi

echo ""
echo "📊 检查 schema 数量..."
schema_count=$(curl -s http://localhost:15000/apiservice/openapi/v1.json | jq '.components.schemas | length' 2>/dev/null)

if [ ! -z "$schema_count" ]; then
    echo "✅ 找到 $schema_count 个 schema 定义"
else
    echo "❌ 无法获取 schema 数量"
fi

echo ""
echo "🔐 检查 JWT 安全方案..."
bearer_scheme=$(curl -s http://localhost:15000/apiservice/openapi/v1.json | jq '.components.securitySchemes.Bearer' 2>/dev/null)

if [ ! -z "$bearer_scheme" ] && [ "$bearer_scheme" != "null" ]; then
    echo "✅ JWT Bearer 安全方案已配置"
else
    echo "❌ JWT Bearer 安全方案未配置"
fi

echo ""
echo "🎯 测试完成！"
echo ""
echo "访问以下地址查看文档："
echo "  - OpenAPI JSON: http://localhost:15000/apiservice/openapi/v1.json"
echo "  - Scalar 文档: http://localhost:15000/scalar/v1"
echo "  - Aspire Dashboard: http://localhost:15003"

