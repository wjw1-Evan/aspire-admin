# 环境变量配置说明

## 环境变量设置

### 1. API网关地址配置

**重要更新**：现在支持动态获取环境变量，解决了生命周期问题！

#### 方式一：使用 EXPO_PUBLIC_ 前缀（强烈推荐）
```bash
# 临时设置（当前终端会话有效）
export EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0="http://192.168.1.100:15000"

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0="http://192.168.1.100:15000"' >> ~/.bashrc
source ~/.bashrc
```

#### 方式二：使用原始环境变量名（兼容模式）
```bash
# 临时设置（当前终端会话有效）
export services__apigateway__http__0="http://192.168.1.100:15000"

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export services__apigateway__http__0="http://192.168.1.100:15000"' >> ~/.bashrc
source ~/.bashrc
```

#### 方式三：自动获取IP地址（开发环境）
```bash
# 运行脚本自动获取本机IP并设置环境变量
cd Platform.App
node scripts/get-ip.js
```

### 2. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
# 创建 .env.local 文件（推荐）
cat > .env.local << EOF
EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0=http://192.168.1.100:15000
EOF

# 或者创建 .env 文件
cat > .env << EOF
services__apigateway__http__0=http://192.168.1.100:15000
EOF
```

### 3. 获取本机IP地址

#### macOS
```bash
ipconfig getifaddr en0
```

#### Windows
```cmd
ipconfig
```

#### Linux
```bash
hostname -I
```

### 4. 验证配置

启动应用后，可以通过以下方式验证配置：

1. 访问 `/debug/network` 页面查看当前配置
2. 使用网络配置组件测试连接
3. 查看控制台输出的API地址信息

## 配置要求

### 环境变量优先级
1. `EXPO_PUBLIC_SERVICES__APIGATEWAY__HTTP__0` (推荐)
2. `services__apigateway__http__0` (兼容)
3. 开发环境默认值: `http://localhost:15000`

### 重要说明
- ✅ **已解决生命周期问题**：现在支持动态获取环境变量
- ✅ **无需重启应用**：修改环境变量后立即生效
- ✅ **智能降级**：开发环境自动使用默认值
- ✅ **兼容性**：同时支持新旧环境变量名
- 确保API网关地址可以被移动设备访问

### 故障排除
如果仍然遇到问题，请检查：
1. 环境变量是否正确设置
2. 网络连接是否正常
3. API网关服务是否启动
4. 查看控制台日志获取详细错误信息
