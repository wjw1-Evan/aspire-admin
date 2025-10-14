#!/bin/bash

# 多租户系统 API 测试脚本

echo "======================================"
echo "  多租户系统 API 全面测试"
echo "======================================"
echo ""

API_BASE="http://localhost:15000"
ADMIN_BASE="http://localhost:15001"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local token="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "测试 $name ... "
    
    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -X "$method" "$url" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -w "\n%{http_code}" 2>&1)
        else
            response=$(curl -s -X "$method" "$url" \
                -H "Authorization: Bearer $token" \
                -w "\n%{http_code}" 2>&1)
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -w "\n%{http_code}" 2>&1)
        else
            response=$(curl -s -X "$method" "$url" \
                -w "\n%{http_code}" 2>&1)
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  响应: $(echo $body | head -c 100)..."
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "1. 基础服务检查"
echo "======================================" 
test_endpoint "健康检查" "$API_BASE/health"
test_endpoint "API 根路径" "$API_BASE/"
echo ""

echo "2. 认证 API 测试（匿名访问）"
echo "======================================"
test_endpoint "检查当前用户（未登录）" "$API_BASE/api/currentUser"

# 测试登录
echo -n "测试登录 ... "
login_response=$(curl -s -X POST "$API_BASE/api/login/account" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123","autoLogin":true}' 2>&1)

if echo "$login_response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    # 提取 token
    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "  Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  响应: $(echo $login_response | head -c 200)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOKEN=""
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}警告: 登录失败，跳过需要认证的测试${NC}"
    echo ""
else
    echo "3. 认证 API 测试（需要登录）"
    echo "======================================"
    test_endpoint "获取当前用户信息" "$API_BASE/api/currentUser" "GET" "" "$TOKEN"
    echo ""

    echo "4. 企业 API 测试（v3.0 新增）"
    echo "======================================"
    test_endpoint "检查企业代码可用性" "$API_BASE/api/company/check-code?code=test-company"
    test_endpoint "获取当前企业信息" "$API_BASE/api/company/current" "GET" "" "$TOKEN"
    test_endpoint "获取企业统计信息" "$API_BASE/api/company/statistics" "GET" "" "$TOKEN"
    echo ""

    echo "5. 用户管理 API 测试"
    echo "======================================"
    test_endpoint "获取用户列表" "$API_BASE/api/user/list" "POST" '{"page":1,"pageSize":10}' "$TOKEN"
    test_endpoint "获取用户统计" "$API_BASE/api/user/statistics" "GET" "" "$TOKEN"
    test_endpoint "检查用户名" "$API_BASE/api/user/check-username?username=test"
    test_endpoint "检查邮箱" "$API_BASE/api/user/check-email?email=test@test.com"
    echo ""

    echo "6. 角色管理 API 测试"
    echo "======================================"
    test_endpoint "获取所有角色" "$API_BASE/api/role" "GET" "" "$TOKEN"
    test_endpoint "获取角色（带统计）" "$API_BASE/api/role/with-stats" "GET" "" "$TOKEN"
    echo ""

    echo "7. 菜单管理 API 测试"
    echo "======================================"
    test_endpoint "获取所有菜单" "$API_BASE/api/menu" "GET" "" "$TOKEN"
    test_endpoint "获取菜单树" "$API_BASE/api/menu/tree" "GET" "" "$TOKEN"
    test_endpoint "获取当前用户菜单" "$API_BASE/api/menu/current-user" "GET" "" "$TOKEN"
    echo ""

    echo "8. 通知 API 测试"
    echo "======================================"
    test_endpoint "获取通知列表" "$API_BASE/api/notices" "GET" "" "$TOKEN"
    echo ""

    echo "9. 权限 API 测试"
    echo "======================================"
    test_endpoint "获取所有权限" "$API_BASE/api/permission" "GET" "" "$TOKEN"
    test_endpoint "获取权限分组" "$API_BASE/api/permission/grouped" "GET" "" "$TOKEN"
    echo ""

    echo "10. 活动日志 API 测试"
    echo "======================================"
    test_endpoint "获取所有活动日志" "$API_BASE/api/users/activity-logs?page=1&pageSize=20" "GET" "" "$TOKEN"
    echo ""
fi

echo "11. 企业注册 API 测试（匿名访问）"
echo "======================================"

# 生成随机企业代码
RANDOM_CODE="test-company-$(date +%s)"

test_data=$(cat <<EOF
{
  "companyName": "API测试公司",
  "companyCode": "$RANDOM_CODE",
  "companyDescription": "通过API测试脚本创建的企业",
  "industry": "软件开发",
  "adminUsername": "admin-$RANDOM_CODE",
  "adminPassword": "Admin@123",
  "adminEmail": "admin@$RANDOM_CODE.com",
  "contactName": "测试联系人",
  "contactPhone": "13900139000"
}
EOF
)

echo "测试企业注册（企业代码: $RANDOM_CODE）"
register_response=$(curl -s -X POST "$API_BASE/api/company/register" \
    -H "Content-Type: application/json" \
    -d "$test_data" 2>&1)

if echo "$register_response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ 企业注册成功${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # 提取新企业的 token
    NEW_TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$NEW_TOKEN" ]; then
        echo "  新企业Token: ${NEW_TOKEN:0:50}..."
        
        # 使用新企业的 token 测试隔离
        echo ""
        echo "12. 测试数据隔离（使用新企业 token）"
        echo "======================================"
        test_endpoint "新企业-获取用户列表" "$API_BASE/api/user/list" "POST" '{"page":1,"pageSize":10}' "$NEW_TOKEN"
        test_endpoint "新企业-获取企业信息" "$API_BASE/api/company/current" "GET" "" "$NEW_TOKEN"
        test_endpoint "新企业-获取统计信息" "$API_BASE/api/company/statistics" "GET" "" "$NEW_TOKEN"
    fi
else
    echo -e "${RED}✗ 企业注册失败${NC}"
    echo "  响应: $(echo $register_response | head -c 200)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "======================================"
echo "  测试结果汇总"
echo "======================================"
echo -e "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi

