#!/bin/bash

echo "=== 图形验证码功能测试 ==="

# 测试不同的端口和协议
PORTS=(15000 15038)
HTTPS_PORTS=(64777)

for PORT in "${PORTS[@]}"; do
    echo ""
    echo "测试端口 $PORT (HTTP)..."
    
    # 测试图形验证码生成
    echo "1. 生成图形验证码..."
    RESPONSE=$(curl -s -X GET "http://localhost:$PORT/api/captcha/image?type=login")
    echo "响应: $RESPONSE"
    
    if [[ "$RESPONSE" == *"captchaId"* ]]; then
        echo "✅ 图形验证码生成成功"
        
        # 提取验证码ID
        CAPTCHA_ID=$(echo "$RESPONSE" | grep -oP '"captchaId":"\K[^"]+')
        echo "验证码ID: $CAPTCHA_ID"
        
        # 测试验证码验证
        echo ""
        echo "2. 验证图形验证码..."
        VERIFY_RESPONSE=$(curl -s -X POST "http://localhost:$PORT/api/captcha/verify-image" \
            -H "Content-Type: application/json" \
            -d "{\"captchaId\": \"$CAPTCHA_ID\", \"answer\": \"TEST123\", \"type\": \"login\"}")
        echo "验证响应: $VERIFY_RESPONSE"
        
        break
    else
        echo "❌ 端口 $PORT 无响应或错误"
    fi
done

for PORT in "${HTTPS_PORTS[@]}"; do
    echo ""
    echo "测试端口 $PORT (HTTPS)..."
    
    # 测试图形验证码生成
    echo "1. 生成图形验证码..."
    RESPONSE=$(curl -k -s -X GET "https://localhost:$PORT/api/captcha/image?type=login")
    echo "响应: $RESPONSE"
    
    if [[ "$RESPONSE" == *"captchaId"* ]]; then
        echo "✅ 图形验证码生成成功"
        
        # 提取验证码ID
        CAPTCHA_ID=$(echo "$RESPONSE" | grep -oP '"captchaId":"\K[^"]+')
        echo "验证码ID: $CAPTCHA_ID"
        
        # 测试验证码验证
        echo ""
        echo "2. 验证图形验证码..."
        VERIFY_RESPONSE=$(curl -k -s -X POST "https://localhost:$PORT/api/captcha/verify-image" \
            -H "Content-Type: application/json" \
            -d "{\"captchaId\": \"$CAPTCHA_ID\", \"answer\": \"TEST123\", \"type\": \"login\"}")
        echo "验证响应: $VERIFY_RESPONSE"
        
        break
    else
        echo "❌ 端口 $PORT 无响应或错误"
    fi
done

echo ""
echo "=== 测试完成 ==="
