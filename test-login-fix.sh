#!/bin/bash

echo "============================================"
echo "  登录企业代码验证测试"
echo "============================================"
echo ""

API_URL="http://localhost:15000/api"

echo "等待服务启动..."
sleep 5

echo ""
echo "测试1: 缺少企业代码 ❌"
echo "--------------------------------------------"
curl -s -X POST "$API_URL/login/account" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' | jq '.errorCode, .errorMessage'

echo ""
echo ""
echo "测试2: 企业代码为空字符串 ❌"
echo "--------------------------------------------"
curl -s -X POST "$API_URL/login/account" \
  -H "Content-Type: application/json" \
  -d '{
    "companyCode": "",
    "username": "admin",
    "password": "admin123"
  }' | jq '.errorCode, .errorMessage'

echo ""
echo ""
echo "测试3: 错误的企业代码 ❌"
echo "--------------------------------------------"
curl -s -X POST "$API_URL/login/account" \
  -H "Content-Type: application/json" \
  -d '{
    "companyCode": "wrongcode",
    "username": "admin",
    "password": "admin123"
  }' | jq '.errorCode, .errorMessage'

echo ""
echo ""
echo "测试4: 正确的企业代码 ✅"
echo "--------------------------------------------"
curl -s -X POST "$API_URL/login/account" \
  -H "Content-Type: application/json" \
  -d '{
    "companyCode": "default",
    "username": "admin",
    "password": "admin123"
  }' | jq '.success, .data.token' | head -5

echo ""
echo ""
echo "============================================"
echo "  测试完成"
echo "============================================"
echo ""
echo "期望结果："
echo "  测试1: 返回 COMPANY_CODE_REQUIRED 错误"
echo "  测试2: 返回 COMPANY_CODE_REQUIRED 或 COMPANY_NOT_FOUND 错误"
echo "  测试3: 返回 COMPANY_NOT_FOUND 错误"
echo "  测试4: 返回 success=true 和 token"
echo ""

