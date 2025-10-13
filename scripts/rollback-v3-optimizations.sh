#!/bin/bash

# 回滚 v3.0 优化的脚本
# 使用方法: bash scripts/rollback-v3-optimizations.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        回滚 v3.0 优化版本                                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 询问用户确认
echo -e "${YELLOW}⚠️  此操作将从备份文件恢复原始版本${NC}"
echo
read -p "确认继续? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ 操作已取消${NC}"
    exit 1
fi

echo
echo "🔄 开始回滚..."
echo

# 回滚 UserManagement
if [ -f "Platform.Admin/src/pages/user-management/index.backup.tsx" ]; then
    echo "📦 恢复 UserManagement..."
    mv Platform.Admin/src/pages/user-management/index.backup.tsx \
       Platform.Admin/src/pages/user-management/index.tsx
    echo -e "${GREEN}✅ UserManagement 已恢复${NC}"
else
    echo -e "${YELLOW}⚠️  UserManagement 备份不存在，跳过${NC}"
fi

# 回滚 RoleManagement
if [ -f "Platform.Admin/src/pages/role-management/index.backup.tsx" ]; then
    echo "📦 恢复 RoleManagement..."
    mv Platform.Admin/src/pages/role-management/index.backup.tsx \
       Platform.Admin/src/pages/role-management/index.tsx
    echo -e "${GREEN}✅ RoleManagement 已恢复${NC}"
else
    echo -e "${YELLOW}⚠️  RoleManagement 备份不存在，跳过${NC}"
fi

# 回滚 MenuManagement
if [ -f "Platform.Admin/src/pages/menu-management/index.backup.tsx" ]; then
    echo "📦 恢复 MenuManagement..."
    mv Platform.Admin/src/pages/menu-management/index.backup.tsx \
       Platform.Admin/src/pages/menu-management/index.tsx
    echo -e "${GREEN}✅ MenuManagement 已恢复${NC}"
else
    echo -e "${YELLOW}⚠️  MenuManagement 备份不存在，跳过${NC}"
fi

echo
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ 回滚完成！${NC}"
echo "══════════════════════════════════════════════════════════════"
echo


