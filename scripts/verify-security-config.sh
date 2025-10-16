#!/bin/bash

# 🔐 安全配置验证脚本
# 用途：检查系统安全配置是否正确
# 使用：./scripts/verify-security-config.sh

set -e

echo "🔐 开始安全配置验证..."
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0
SUCCESS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((SUCCESS++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

echo "==================== 后端配置检查 ===================="
echo ""

# 1. 检查JWT密钥配置
echo "1️⃣  检查JWT密钥配置..."
if [ -f Platform.ApiService/Platform.ApiService.csproj ]; then
    cd Platform.ApiService
    
    # 检查User Secrets是否已初始化
    if grep -q "UserSecretsId" Platform.ApiService.csproj; then
        check_pass "User Secrets已初始化"
        
        # 检查密钥是否已设置
        if dotnet user-secrets list 2>/dev/null | grep -q "Jwt:SecretKey"; then
            SECRET=$(dotnet user-secrets list 2>/dev/null | grep "Jwt:SecretKey" | cut -d'=' -f2 | tr -d ' ')
            SECRET_LEN=${#SECRET}
            
            if [ $SECRET_LEN -lt 32 ]; then
                check_fail "JWT密钥长度不足（当前: $SECRET_LEN，最少: 32）"
            elif [ "$SECRET" = "" ]; then
                check_fail "JWT密钥为空，必须设置"
            else
                check_pass "JWT密钥已设置且长度足够（$SECRET_LEN字符）"
            fi
        else
            check_fail "JWT密钥未设置，请运行: dotnet user-secrets set \"Jwt:SecretKey\" \"your-secret-key\""
        fi
    else
        check_warn "User Secrets未初始化，请运行: dotnet user-secrets init"
    fi
    
    cd ..
else
    check_fail "未找到Platform.ApiService项目"
fi

echo ""

# 2. 检查appsettings.json中是否有硬编码密钥
echo "2️⃣  检查appsettings.json..."
if grep -q '"SecretKey": ""' Platform.ApiService/appsettings.json; then
    check_pass "appsettings.json中SecretKey为空（正确）"
elif grep -q '"SecretKey": "your-' Platform.ApiService/appsettings.json; then
    check_pass "appsettings.json中SecretKey为示例值（正确）"
else
    if grep -q '"SecretKey": ".\{10,\}"' Platform.ApiService/appsettings.json; then
        check_fail "appsettings.json包含真实密钥，必须移除！"
    else
        check_warn "无法确定SecretKey状态"
    fi
fi

echo ""

# 3. 检查.gitignore
echo "3️⃣  检查.gitignore配置..."
if [ -f .gitignore ]; then
    if grep -q "secrets.json" .gitignore || grep -q "*.secrets.json" .gitignore; then
        check_pass ".gitignore包含secrets.json"
    else
        check_warn ".gitignore未包含secrets.json，建议添加"
    fi
    
    if grep -q ".env" .gitignore; then
        check_pass ".gitignore包含.env文件"
    else
        check_warn ".gitignore未包含.env，建议添加"
    fi
else
    check_fail "未找到.gitignore文件"
fi

echo ""

echo "==================== 前端配置检查 ===================="
echo ""

# 4. 检查前端环境变量配置
echo "4️⃣  检查前端配置..."
if [ -f Platform.Admin/.env.example ]; then
    check_pass "前端.env.example存在"
else
    check_warn "未找到.env.example，建议创建"
fi

if [ -f Platform.Admin/.env.production ]; then
    if grep -q "REACT_APP_API_BASE_URL" Platform.Admin/.env.production; then
        check_pass "生产环境API地址已配置"
    else
        check_warn "生产环境API地址未配置"
    fi
else
    check_warn "未找到.env.production（生产部署时需要）"
fi

echo ""

# 5. 检查敏感信息日志
echo "5️⃣  检查敏感信息保护..."
if grep -q "process.env.NODE_ENV === 'development'" Platform.Admin/src/app.tsx; then
    check_pass "前端日志已添加环境检测"
else
    check_warn "前端日志可能未添加环境检测"
fi

echo ""

echo "==================== 代码安全检查 ===================="
echo ""

# 6. 检查是否有硬编码的密钥
echo "6️⃣  检查硬编码密钥..."
HARDCODED=$(grep -r "password.*=.*['\"].\{8,\}['\"]" Platform.ApiService --include="*.cs" | grep -v "test" | grep -v "example" | wc -l)
if [ $HARDCODED -eq 0 ]; then
    check_pass "未发现明显的硬编码密码"
else
    check_warn "发现 $HARDCODED 处可能的硬编码密码，需要手动检查"
fi

echo ""

# 7. 检查Program.cs中的密钥验证
echo "7️⃣  检查Program.cs安全配置..."
if grep -q "throw new InvalidOperationException.*JWT SecretKey" Platform.ApiService/Services/JwtService.cs; then
    check_pass "JWT密钥验证已实施"
else
    check_fail "JWT密钥验证未实施"
fi

echo ""

echo "==================== 检查摘要 ===================="
echo ""
echo -e "${GREEN}✅ 通过: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  警告: $WARNINGS${NC}"
echo -e "${RED}❌ 错误: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ 安全配置检查失败！请修复所有错误后再部署。${NC}"
    echo ""
    echo "📚 参考文档:"
    echo "   - JWT密钥配置: docs/deployment/JWT-SECRET-CONFIGURATION.md"
    echo "   - 安全检查清单: docs/deployment/SECURITY-CHECKLIST.md"
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  检查完成但有警告，建议修复后再部署生产环境。${NC}"
    echo ""
    exit 0
else
    echo -e "${GREEN}✅ 所有安全配置检查通过！${NC}"
    echo ""
    exit 0
fi

