#!/bin/bash

# 测试多实例并发启动脚本
# 验证分布式锁和数据库初始化的幂等性

echo "=========================================="
echo "  多实例并发启动测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 MongoDB 是否运行
echo -e "${YELLOW}[1/4] 检查 MongoDB 连接...${NC}"
if ! mongo --eval "db.version()" > /dev/null 2>&1; then
    echo -e "${RED}❌ MongoDB 未运行，请先启动 MongoDB${NC}"
    exit 1
fi
echo -e "${GREEN}✅ MongoDB 连接正常${NC}"
echo ""

# 清空数据库（可选）
echo -e "${YELLOW}[2/4] 是否清空数据库? (y/n)${NC}"
read -p "> " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}正在清空数据库...${NC}"
    mongo aspire-admin --eval "db.dropDatabase()" > /dev/null 2>&1
    echo -e "${GREEN}✅ 数据库已清空${NC}"
else
    echo -e "${YELLOW}⏭️  跳过数据库清空${NC}"
fi
echo ""

# 编译项目
echo -e "${YELLOW}[3/4] 编译项目...${NC}"
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet build Platform.ApiService/Platform.ApiService.csproj --no-restore > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 编译成功${NC}"
else
    echo -e "${RED}❌ 编译失败${NC}"
    exit 1
fi
echo ""

# 并发启动多个实例
echo -e "${YELLOW}[4/4] 并发启动 3 个实例...${NC}"
echo ""

# 创建日志目录
mkdir -p /tmp/aspire-test-logs

# 启动实例 1
echo -e "${GREEN}启动实例 1...${NC}"
ASPNETCORE_URLS="http://localhost:5001" dotnet run --project Platform.ApiService/Platform.ApiService.csproj --no-build > /tmp/aspire-test-logs/instance1.log 2>&1 &
INSTANCE1_PID=$!

# 启动实例 2
echo -e "${GREEN}启动实例 2...${NC}"
ASPNETCORE_URLS="http://localhost:5002" dotnet run --project Platform.ApiService/Platform.ApiService.csproj --no-build > /tmp/aspire-test-logs/instance2.log 2>&1 &
INSTANCE2_PID=$!

# 启动实例 3
echo -e "${GREEN}启动实例 3...${NC}"
ASPNETCORE_URLS="http://localhost:5003" dotnet run --project Platform.ApiService/Platform.ApiService.csproj --no-build > /tmp/aspire-test-logs/instance3.log 2>&1 &
INSTANCE3_PID=$!

echo ""
echo -e "${YELLOW}等待实例启动（10秒）...${NC}"
sleep 10

# 检查日志
echo ""
echo "=========================================="
echo "  日志分析"
echo "=========================================="
echo ""

# 统计获取锁的实例
echo -e "${YELLOW}检查分布式锁使用情况：${NC}"
LOCK_COUNT=$(grep -r "获取锁 'database-initialization' 成功" /tmp/aspire-test-logs/ | wc -l | xargs)
SKIP_COUNT=$(grep -r "锁 'database-initialization' 已被其他实例持有" /tmp/aspire-test-logs/ | wc -l | xargs)

echo "  - 获取锁的实例数: $LOCK_COUNT"
echo "  - 跳过初始化的实例数: $SKIP_COUNT"
echo ""

if [ "$LOCK_COUNT" -eq 1 ] && [ "$SKIP_COUNT" -eq 2 ]; then
    echo -e "${GREEN}✅ 分布式锁工作正常！只有一个实例执行了初始化${NC}"
elif [ "$LOCK_COUNT" -gt 1 ]; then
    echo -e "${RED}⚠️  警告：有 $LOCK_COUNT 个实例获取了锁（应该只有1个）${NC}"
else
    echo -e "${YELLOW}ℹ️  注意：锁可能被跳过或初始化已完成${NC}"
fi
echo ""

# 检查索引创建
echo -e "${YELLOW}检查索引创建情况：${NC}"
INDEX_CREATED=$(grep -r "创建索引" /tmp/aspire-test-logs/ | grep "✅" | wc -l | xargs)
INDEX_SKIPPED=$(grep -r "索引已存在" /tmp/aspire-test-logs/ | grep "⚠️" | wc -l | xargs)

echo "  - 创建的索引数: $INDEX_CREATED"
echo "  - 跳过的索引数: $INDEX_SKIPPED"
echo ""

# 检查错误
echo -e "${YELLOW}检查是否有错误：${NC}"
ERROR_COUNT=$(grep -ir "error\|exception\|failed" /tmp/aspire-test-logs/ | grep -v "IndexOptionsConflict" | wc -l | xargs)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 没有发现错误${NC}"
else
    echo -e "${RED}⚠️  发现 $ERROR_COUNT 个错误，请检查日志${NC}"
fi
echo ""

# 查看完整日志
echo "=========================================="
echo "  查看详细日志? (y/n)"
echo "=========================================="
read -p "> " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}=== 实例 1 日志 ===${NC}"
    cat /tmp/aspire-test-logs/instance1.log | grep -E "(初始化|索引|锁)" | head -20
    echo ""
    echo -e "${YELLOW}=== 实例 2 日志 ===${NC}"
    cat /tmp/aspire-test-logs/instance2.log | grep -E "(初始化|索引|锁)" | head -20
    echo ""
    echo -e "${YELLOW}=== 实例 3 日志 ===${NC}"
    cat /tmp/aspire-test-logs/instance3.log | grep -E "(初始化|索引|锁)" | head -20
fi

# 停止所有实例
echo ""
echo "=========================================="
echo "  清理"
echo "=========================================="
echo ""
echo -e "${YELLOW}停止所有实例...${NC}"
kill $INSTANCE1_PID $INSTANCE2_PID $INSTANCE3_PID > /dev/null 2>&1
sleep 2
echo -e "${GREEN}✅ 所有实例已停止${NC}"

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo "日志文件保存在: /tmp/aspire-test-logs/"
echo "  - instance1.log"
echo "  - instance2.log"
echo "  - instance3.log"
echo ""
echo -e "${GREEN}测试完成！${NC}"

