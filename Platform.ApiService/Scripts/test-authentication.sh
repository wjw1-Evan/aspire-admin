#!/bin/bash

# 全局身份验证中间件测试脚本
# 用于手动验证API的身份验证功能

API_BASE_URL="http://localhost:15000"
TEST_RESULTS=()

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
run_test() {
    local test_name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local auth_header="$6"
    
    echo -e "\n${YELLOW}测试: $test_name${NC}"
    echo "请求: $method $url"
    
    if [ -n "$data" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "%{http_code}" -X $method \
                -H "Content-Type: application/json" \
                -H "Authorization: $auth_header" \
                -d "$data" \
                "$API_BASE_URL$url")
        else
            response=$(curl -s -w "%{http_code}" -X $method \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_BASE_URL$url")
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "%{http_code}" -X $method \
                -H "Authorization: $auth_header" \
                "$API_BASE_URL$url")
        else
            response=$(curl -s -w "%{http_code}" -X $method \
                "$API_BASE_URL$url")
        fi
    fi
    
    actual_status="${response: -3}"
    response_body="${response%???}"
    
    echo "期望状态码: $expected_status"
    echo "实际状态码: $actual_status"
    
    if [ "$actual_status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 测试通过${NC}"
        TEST_RESULTS+=("✓ $test_name")
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应内容: $response_body"
        TEST_RESULTS+=("✗ $test_name (期望: $expected_status, 实际: $actual_status)")
    fi
}

echo -e "${YELLOW}=== Platform.ApiService 全局身份验证中间件测试 ===${NC}"
echo "API基础URL: $API_BASE_URL"
echo "注意: 请确保API服务正在运行在 $API_BASE_URL"

# 等待用户确认
echo -e "\n${YELLOW}按Enter开始测试...${NC}"
read

# 测试1: 公共接口 - 无需认证应该可以访问
run_test "公共接口访问测试" "GET" "/api/public/test" "" "200"

# 测试2: 认证接口 - 无需认证应该可以访问
run_test "验证码接口访问测试" "GET" "/api/auth/captcha/image?type=login" "" "200"

# 测试3: 受保护的接口 - 无认证应该返回401
run_test "保护接口无认证测试" "GET" "/api/project" "" "401"

# 测试4: 健康检查接口 - 无需认证应该可以访问
run_test "健康检查接口测试" "GET" "/health" "" "200"

# 测试5: 登录接口 - 无需认证应该可以访问（但可能返回400验证错误）
run_test "登录接口访问测试" "POST" "/api/auth/login" '{"username":"test","password":"test"}' "400"

# 测试6: 受保护接口 - 使用无效token应该返回401
run_test "保护接口无效token测试" "GET" "/api/project" "" "401" "Bearer invalid.token.here"

# 测试7: 受保护接口 - 使用有效格式的假token应该返回401
run_test "保护接口假token测试" "GET" "/api/project" "" "401" "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwibmFtZSI6InRlc3QiLCJpYXQiOjE2MTYyMzkwMjJ9.fake"

# 测试8: 非存在的接口 - 应该返回404
run_test "不存在接口测试" "GET" "/api/nonexistent" "" "404"

# 测试9: 公共接口的认证方法 - 无token应该返回401
run_test "公共接口认证方法测试" "GET" "/api/public/current-user" "" "401"

echo -e "\n${YELLOW}=== 测试结果汇总 ===${NC}"

for result in "${TEST_RESULTS[@]}"; do
    echo "$result"
done

# 计算通过的测试数量
passed=$(echo "${TEST_RESULTS[@]}" | grep -o "✓" | wc -l)
total=${#TEST_RESULTS[@]}

echo -e "\n${YELLOW}总计: $total 个测试，通过: $passed 个，失败: $((total - passed)) 个${NC}"

if [ $passed -eq $total ]; then
    echo -e "${GREEN}🎉 所有测试通过！全局身份验证中间件工作正常。${NC}"
    exit 0
else
    echo -e "${RED}❌ 有测试失败，请检查中间件配置。${NC}"
    exit 1
fi