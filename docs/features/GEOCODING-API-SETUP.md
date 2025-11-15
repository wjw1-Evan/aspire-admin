# 地理编码 API 配置指南

## 概述

项目使用**完全免费、不需要 API Key**的地理编码服务，用于将经纬度坐标转换为城市名称。系统会按优先级自动选择可用的服务。

## 支持的 API 服务

### 1. BigDataCloud Reverse Geocoding API（优先使用）

**优势**：
- ✅ **完全免费，不需要 API Key**
- ✅ 全球支持
- ✅ 免费额度：每天 10,000 次
- ✅ 响应速度快
- ✅ 支持中文

**特点**：
- 无需注册
- 无需配置
- 开箱即用

### 2. GeoNames API（备选方案）

**优势**：
- ✅ **完全免费，不需要 API Key**
- ✅ 全球支持
- ✅ 免费额度：每天 20,000 次
- ✅ 支持中文

**特点**：
- 需要用户名（但不需要 API Key）
- 默认使用 "demo" 用户名（可直接使用）
- 建议注册自己的用户名以获得更好的服务

**注册用户名（可选）**：
1. 访问 [GeoNames](http://www.geonames.org/login)
2. 注册/登录账号
3. 获取用户名

**配置方法（可选）**：
```json
{
  "Geocoding": {
    "GeoNamesUsername": "你的用户名"
  }
}
```

如果不配置，默认使用 "demo" 用户名。

## 配置优先级

系统按以下优先级选择 API 服务：

1. **BigDataCloud API**（优先，不需要任何配置）
2. **GeoNames API**（如果 BigDataCloud 失败，自动回退）
3. **返回 null**（如果都失败，不记录错误）

## 配置位置

### 默认配置（无需配置）

**BigDataCloud API 和 GeoNames API 都不需要配置即可使用！**

系统默认配置：
```json
{
  "Geocoding": {
    "GeoNamesUsername": "demo"
  }
}
```

### 可选配置（仅 GeoNames）

如果你想使用自己的 GeoNames 用户名（可选，推荐）：

**开发环境**：
在 `Platform.ApiService/appsettings.json` 或 `appsettings.Development.json` 中配置：

```json
{
  "Geocoding": {
    "GeoNamesUsername": "你的用户名"
  }
}
```

**生产环境**：
使用环境变量：

```bash
# Linux/macOS
export Geocoding__GeoNamesUsername="你的用户名"

# Windows
set Geocoding__GeoNamesUsername=你的用户名
```

或使用 User Secrets（仅开发环境）：

```bash
dotnet user-secrets set "Geocoding:GeoNamesUsername" "你的用户名"
```

## 使用说明

### 工作流程

1. 用户上报位置 → `POST /api/social/location/beacon`
2. 立即保存位置（city 为 null）→ 返回响应
3. 后台任务执行地理编码（最多 5 秒）
4. 地理编码成功后更新城市字段

### 坐标系说明

**BigDataCloud API**：
- 使用 **WGS-84** 坐标系（GPS 坐标）
- 全球通用

**GeoNames API**：
- 使用 **WGS-84** 坐标系（GPS 坐标）
- 全球通用

### 返回的城市信息

- **BigDataCloud**：优先返回 `locality`（城市），如果没有则返回 `principalSubdivision`（区县）或 `countryName`（国家）
- **GeoNames**：优先返回 `name`（城市名称），如果没有则返回 `adminName1`（行政区划名称）

## 故障排查

### 问题：城市信息始终为空

**可能原因**：
1. 网络连接问题
2. API 服务限流
3. 坐标无效

**解决方法**：
1. 检查网络连接
2. 查看应用日志中的警告信息
3. 测试 API 是否可访问：
   ```bash
   # 测试 BigDataCloud API
   curl "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=30.27415&longitude=120.15515&localityLanguage=zh"
   
   # 测试 GeoNames API
   curl "http://api.geonames.org/findNearbyPlaceNameJSON?lat=30.27415&lng=120.15515&username=demo&lang=zh"
   ```

### 问题：地理编码超时

**可能原因**：
- 网络连接慢
- API 服务响应慢

**解决方法**：
- 检查网络连接
- 查看日志中的超时警告
- 考虑使用本地地理编码数据库

### 问题：返回的城市名称不正确

**可能原因**：
- 坐标系不匹配（WGS-84 vs GCJ-02）
- API 返回的数据结构变化

**解决方法**：
- 确认设备返回的坐标系类型
- 如果使用高德地图，确保输入的是 GCJ-02 坐标
- 查看日志中的 API 响应，确认数据结构

## 相关文档

- [BigDataCloud Reverse Geocoding API 文档](https://www.bigdatacloud.com/docs/api/reverse-geocoding-api)
- [GeoNames Web Services 文档](http://www.geonames.org/export/web-services.html)

## 注意事项

1. **完全免费**：
   - BigDataCloud：每天 10,000 次免费额度
   - GeoNames：每天 20,000 次免费额度（使用 demo 用户名）
   - 超出限制后需要等待重置或注册自己的用户名

2. **无需配置**：
   - BigDataCloud 和 GeoNames 都不需要 API Key
   - 开箱即用，无需任何配置
   - GeoNames 用户名是可选的，默认使用 "demo"

3. **性能优化**：
   - 地理编码在后台异步执行，不阻塞位置保存
   - 超时时间设置为 5 秒
   - 如果地理编码失败，不影响位置保存

