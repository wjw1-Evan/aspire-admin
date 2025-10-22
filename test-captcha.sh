#!/bin/bash

echo "=== 验证码 MongoDB 迁移测试 ==="
echo

echo "1. 生成验证码..."
RESPONSE=$(curl -s -X GET "http://localhost:15001/api/login/captcha?phone=13900139000")
echo "响应: $RESPONSE"
echo

echo "2. 验证验证码..."
CAPTCHA=$(echo $RESPONSE | grep -o '"captcha":"[^"]*"' | cut -d'"' -f4)
echo "提取的验证码: $CAPTCHA"
echo

if [ ! -z "$CAPTCHA" ]; then
    echo "3. 验证验证码..."
    VERIFY_RESPONSE=$(curl -s -X POST "http://localhost:15001/api/login/verify-captcha" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"13900139000\",\"code\":\"$CAPTCHA\"}")
    echo "验证响应: $VERIFY_RESPONSE"
    echo

    echo "4. 重复验证（应该失败）..."
    REPEAT_RESPONSE=$(curl -s -X POST "http://localhost:15001/api/login/verify-captcha" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"13900139000\",\"code\":\"$CAPTCHA\"}")
    echo "重复验证响应: $REPEAT_RESPONSE"
    echo
fi

echo "=== 测试完成 ==="
