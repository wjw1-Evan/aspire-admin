#!/bin/bash

# 菜单级权限系统测试脚本

echo "=========================================="
echo "菜单级权限系统测试"
echo "=========================================="
echo ""

BASE_URL="http://localhost:15000/apiservice/api"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果计数
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local token=$6
    
    echo -n "测试: $test_name ... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ 失败${NC} (期望 $expected_status, 实际 $http_code)"
        echo "   响应: $body"
        ((FAILED++))
    fi
}

echo "1. 准备测试"
echo "----------------------------------------"
echo "⚠️  请确保："
echo "   - 已删除旧数据库"
echo "   - 系统正在运行（dotnet run --project Platform.AppHost）"
echo "   - API网关可访问: $BASE_URL"
echo ""
read -p "按回车继续测试..."
echo ""

echo "2. 用户注册和登录"
echo "----------------------------------------"

# 注册测试用户
echo -n "注册测试用户 ... "
register_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser",
        "password": "test123456",
        "email": "test@example.com"
    }')

register_code=$(echo "$register_response" | tail -n1)
if [ "$register_code" == "200" ]; then
    echo -e "${GREEN}✓ 注册成功${NC}"
else
    echo -e "${RED}✗ 注册失败${NC} (HTTP $register_code)"
    echo "如果是用户已存在错误，可以继续测试"
fi
echo ""

# 登录获取token
echo -n "登录获取token ... "
login_response=$(curl -s -X POST "$BASE_URL/login/account" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser",
        "password": "test123456"
    }')

TOKEN=$(echo $login_response | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ 登录成功${NC}"
    echo "   Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ 登录失败${NC}"
    echo "   响应: $login_response"
    exit 1
fi
echo ""

echo "3. 测试菜单权限控制"
echo "----------------------------------------"

# 获取当前用户信息（应该成功）
test_api "获取当前用户信息" "GET" "/currentUser" "" "200" "$TOKEN"

# 测试用户管理API（管理员应该有权限）
test_api "获取用户列表" "POST" "/user/list" '{"page":1,"pageSize":10}' "200" "$TOKEN"

# 测试统计信息（需要user-management权限）
test_api "获取用户统计" "GET" "/user/statistics" "" "200" "$TOKEN"

# 测试活动日志（需要user-log权限）
test_api "获取活动日志" "GET" "/users/activity-logs?page=1&pageSize=10" "" "200" "$TOKEN"

echo ""
echo "4. 测试角色管理"
echo "----------------------------------------"

# 获取所有角色
test_api "获取角色列表" "GET" "/role" "" "200" "$TOKEN"

# 获取角色（带统计）
test_api "获取角色统计" "GET" "/role/with-stats" "" "200" "$TOKEN"

echo ""
echo "5. 测试通知和标签"
echo "----------------------------------------"

# 获取通知（所有登录用户可访问）
test_api "获取通知列表" "GET" "/notices" "" "200" "$TOKEN"

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！菜单级权限系统工作正常。${NC}"
    exit 0
else
    echo -e "${YELLOW}部分测试失败，请检查日志。${NC}"
    exit 1
fi

