#!/bin/bash

# CRUD 权限系统自动化测试脚本
# 使用方法: ./test-permission-system.sh

set -e

echo "================================"
echo "CRUD 权限系统自动化测试"
echo "================================"
echo ""

# 配置
API_BASE="http://localhost:15000"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local token=$6
    
    echo -n "测试: $test_name ... "
    
    if [ -n "$token" ]; then
        AUTH_HEADER="-H \"Authorization: Bearer $token\""
    else
        AUTH_HEADER=""
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" $AUTH_HEADER 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json" $AUTH_HEADER -d "$data" 2>/dev/null || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (期望 $expected_status, 实际 $http_code)"
        echo "  响应: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

# 等待服务启动
echo "检查服务状态..."
for i in {1..30}; do
    if curl -s http://localhost:15000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务已就绪${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ 服务未启动，请先运行: dotnet run --project Platform.AppHost${NC}"
        exit 1
    fi
    sleep 1
done

echo ""
echo "================================"
echo "开始测试..."
echo "================================"
echo ""

# 测试 1: 登录获取 Token
echo "【测试组 1：身份认证】"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/login/account" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\",\"type\":\"account\"}")

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ 登录成功，获取到 Token${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 登录失败${NC}"
    echo "  响应: $LOGIN_RESPONSE"
    ((TESTS_FAILED++))
    exit 1
fi

echo ""
echo "【测试组 2：权限初始化】"

# 测试 2: 获取所有权限
PERMISSIONS_RESPONSE=$(curl -s -X GET "$API_BASE/api/permission" \
    -H "Authorization: Bearer $TOKEN")

PERMISSION_COUNT=$(echo $PERMISSIONS_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', [])))" 2>/dev/null || echo "0")

echo -n "测试: 获取所有权限 ... "
if [ "$PERMISSION_COUNT" -ge "28" ]; then
    echo -e "${GREEN}✓ 通过${NC} (共 $PERMISSION_COUNT 个权限)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ 部分通过${NC} (只有 $PERMISSION_COUNT 个权限，期望 28 个)"
    echo "  提示: 可能需要手动调用初始化接口"
    ((TESTS_FAILED++))
fi

# 测试 3: 按资源分组获取权限
echo -n "测试: 按资源分组获取权限 ... "
GROUPED_RESPONSE=$(curl -s -X GET "$API_BASE/api/permission/grouped" \
    -H "Authorization: Bearer $TOKEN")

GROUP_COUNT=$(echo $GROUPED_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', [])))" 2>/dev/null || echo "0")

if [ "$GROUP_COUNT" -ge "7" ]; then
    echo -e "${GREEN}✓ 通过${NC} (共 $GROUP_COUNT 个资源分组)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 失败${NC} (只有 $GROUP_COUNT 个分组，期望 7 个)"
    ((TESTS_FAILED++))
fi

echo ""
echo "【测试组 3：用户权限】"

# 测试 4: 获取当前用户权限
echo -n "测试: 获取当前用户权限 ... "
MY_PERMS_RESPONSE=$(curl -s -X GET "$API_BASE/api/user/my-permissions" \
    -H "Authorization: Bearer $TOKEN")

MY_PERM_COUNT=$(echo $MY_PERMS_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', {}).get('allPermissionCodes', [])))" 2>/dev/null || echo "0")

if [ "$MY_PERM_COUNT" -ge "20" ]; then
    echo -e "${GREEN}✓ 通过${NC} (超级管理员有 $MY_PERM_COUNT 个权限)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ 警告${NC} (只有 $MY_PERM_COUNT 个权限)"
    ((TESTS_FAILED++))
fi

echo ""
echo "【测试组 4：权限验证】"

# 测试 5: 有权限的操作（应该成功）
echo -n "测试: 访问有权限的 API ... "
USERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/api/user" \
    -H "Authorization: Bearer $TOKEN")

USERS_STATUS=$(echo "$USERS_RESPONSE" | tail -n1)

if [ "$USERS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ 通过${NC} (HTTP 200)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 失败${NC} (HTTP $USERS_STATUS)"
    ((TESTS_FAILED++))
fi

# 测试 6: 获取角色列表
echo -n "测试: 获取角色列表 ... "
ROLES_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/api/role" \
    -H "Authorization: Bearer $TOKEN")

ROLES_STATUS=$(echo "$ROLES_RESPONSE" | tail -n1)

if [ "$ROLES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ 通过${NC} (HTTP 200)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 失败${NC} (HTTP $ROLES_STATUS)"
    ((TESTS_FAILED++))
fi

echo ""
echo "【测试组 5：菜单和前端】"

# 测试 7: 获取用户菜单
echo -n "测试: 获取用户菜单 ... "
MENU_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/api/menu/user" \
    -H "Authorization: Bearer $TOKEN")

MENU_STATUS=$(echo "$MENU_RESPONSE" | tail -n1)

if [ "$MENU_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ 通过${NC} (HTTP 200)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 失败${NC} (HTTP $MENU_STATUS)"
    ((TESTS_FAILED++))
fi

# 测试 8: 获取当前用户信息
echo -n "测试: 获取当前用户信息 ... "
CURRENT_USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/api/currentUser" \
    -H "Authorization: Bearer $TOKEN")

CURRENT_USER_STATUS=$(echo "$CURRENT_USER_RESPONSE" | tail -n1)

if [ "$CURRENT_USER_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ 通过${NC} (HTTP 200)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 失败${NC} (HTTP $CURRENT_USER_STATUS)"
    ((TESTS_FAILED++))
fi

echo ""
echo "================================"
echo "测试完成"
echo "================================"
echo ""
echo "测试统计:"
echo "  通过: ${GREEN}$TESTS_PASSED${NC}"
echo "  失败: ${RED}$TESTS_FAILED${NC}"
echo "  总计: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo ""
    echo "下一步:"
    echo "  1. 访问管理后台: http://localhost:15001"
    echo "  2. 登录: admin / admin123"
    echo "  3. 进入「系统管理」→「权限管理」"
    echo "  4. 查看 28 个默认权限"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 部分测试失败，请检查系统日志${NC}"
    echo ""
    exit 1
fi

