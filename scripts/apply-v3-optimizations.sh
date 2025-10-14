#!/bin/bash

# 应用 v3.0 优化版本的脚本
# 使用方法: bash scripts/apply-v3-optimizations.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        应用 v3.0 优化版本                                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 询问用户确认
echo -e "${YELLOW}⚠️  此操作将替换以下文件为优化版本：${NC}"
echo "  • Platform.Admin/src/pages/user-management/index.tsx"
echo "  • Platform.Admin/src/pages/role-management/index.tsx"
echo "  • Platform.Admin/src/pages/menu-management/index.tsx"
echo
echo -e "${YELLOW}原文件将备份为 .backup.tsx${NC}"
echo
read -p "确认继续? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ 操作已取消${NC}"
    exit 1
fi

echo
echo "🔄 开始应用优化版本..."
echo

# 备份并应用 UserManagement
if [ -f "Platform.Admin/src/pages/user-management/index.optimized.tsx" ]; then
    echo "📦 处理 UserManagement..."
    cp Platform.Admin/src/pages/user-management/index.tsx \
       Platform.Admin/src/pages/user-management/index.backup.tsx
    mv Platform.Admin/src/pages/user-management/index.optimized.tsx \
       Platform.Admin/src/pages/user-management/index.tsx
    echo -e "${GREEN}✅ UserManagement 已更新${NC}"
else
    echo -e "${YELLOW}⚠️  UserManagement 优化版本不存在，跳过${NC}"
fi

# 备份并应用 RoleManagement
if [ -f "Platform.Admin/src/pages/role-management/index.optimized.tsx" ]; then
    echo "📦 处理 RoleManagement..."
    cp Platform.Admin/src/pages/role-management/index.tsx \
       Platform.Admin/src/pages/role-management/index.backup.tsx
    mv Platform.Admin/src/pages/role-management/index.optimized.tsx \
       Platform.Admin/src/pages/role-management/index.tsx
    echo -e "${GREEN}✅ RoleManagement 已更新${NC}"
else
    echo -e "${YELLOW}⚠️  RoleManagement 优化版本不存在，跳过${NC}"
fi

# 备份并应用 MenuManagement
if [ -f "Platform.Admin/src/pages/menu-management/index.optimized.tsx" ]; then
    echo "📦 处理 MenuManagement..."
    cp Platform.Admin/src/pages/menu-management/index.tsx \
       Platform.Admin/src/pages/menu-management/index.backup.tsx
    mv Platform.Admin/src/pages/menu-management/index.optimized.tsx \
       Platform.Admin/src/pages/menu-management/index.tsx
    echo -e "${GREEN}✅ MenuManagement 已更新${NC}"
else
    echo -e "${YELLOW}⚠️  MenuManagement 优化版本不存在，跳过${NC}"
fi

echo
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ 优化版本应用完成！${NC}"
echo "══════════════════════════════════════════════════════════════"
echo
echo "📝 备份文件位置:"
echo "  • Platform.Admin/src/pages/user-management/index.backup.tsx"
echo "  • Platform.Admin/src/pages/role-management/index.backup.tsx"
echo "  • Platform.Admin/src/pages/menu-management/index.backup.tsx"
echo
echo "🚀 下一步:"
echo "  1. 启动项目: dotnet run --project Platform.AppHost"
echo "  2. 测试所有功能是否正常"
echo "  3. 如果一切正常，删除备份文件"
echo
echo "🔄 如需回滚，运行: bash scripts/rollback-v3-optimizations.sh"
echo




