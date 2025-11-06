# umi-presets-pro 删除影响分析

## 📋 概述

`umi-presets-pro` 是 UmiJS 的预设配置包，专门为 Ant Design Pro 项目提供开箱即用的功能。

## 🔍 当前使用情况

### 1. 配置文件中的使用

**位置**: `config/config.ts:148`
```typescript
presets: ['umi-presets-pro'],
```

### 2. umi-presets-pro 提供的功能

根据 npm 信息，`umi-presets-pro@2.0.3` 包含以下依赖：

1. **@alita/plugins** - 额外的 UmiJS 插件集合
2. **@umijs/max-plugin-openapi** - OpenAPI 文档生成和查看功能
3. **@umijs/request-record** - 请求记录和调试功能
4. **swagger-ui-dist** - Swagger UI 界面

### 3. 项目中实际使用的功能

#### ✅ 正在使用的功能

1. **OpenAPI 文档功能** (`@umijs/max-plugin-openapi`)
   - **位置**: `src/app.tsx:295`
   - **代码**:
     ```typescript
     links: isDev
       ? [
           <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
             <LinkOutlined />
             <span>OpenAPI 文档</span>
           </Link>,
         ]
       : [],
     ```
   - **影响**: 删除后，开发环境中的 OpenAPI 文档链接将失效

2. **请求记录功能** (`@umijs/request-record`)
   - **位置**: `config/config.ts:157`
   - **代码**: `requestRecord: {}`
   - **影响**: 删除后，请求记录功能将不可用

#### ❓ 可能使用的功能

3. **@alita/plugins**
   - 可能提供了一些额外的插件功能
   - 需要检查是否有实际使用

## ⚠️ 删除影响分析

### 1. 可以删除的情况

如果满足以下条件，**可以安全删除**：

- ✅ 不需要 OpenAPI 文档功能（或使用其他方式提供 API 文档）
- ✅ 不需要请求记录功能（或使用其他调试工具）
- ✅ 不依赖 @alita/plugins 提供的额外功能

### 2. 删除后的影响

#### 🔴 立即失效的功能

1. **OpenAPI 文档页面** (`/umi/plugin/openapi`)
   - 开发环境中的 OpenAPI 文档链接将无法访问
   - 如果点击链接，会显示 404 错误

2. **请求记录功能**
   - `requestRecord: {}` 配置将无效
   - 无法使用 UmiJS 的请求记录功能

#### 🟡 可能受影响的功能

3. **@alita/plugins 提供的功能**
   - 需要检查是否有其他功能依赖这些插件
   - 可能影响某些开发工具或调试功能

### 3. 删除步骤

如果决定删除，需要执行以下步骤：

#### 步骤 1: 移除配置

**文件**: `config/config.ts`

```typescript
// 删除这一行
presets: ['umi-presets-pro'],

// 删除或注释这一行（如果不需要请求记录）
requestRecord: {},
```

#### 步骤 2: 移除 OpenAPI 文档链接

**文件**: `src/app.tsx`

```typescript
// 删除或注释 OpenAPI 文档链接
links: isDev
  ? [
      // <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
      //   <LinkOutlined />
      //   <span>OpenAPI 文档</span>
      // </Link>,
    ]
  : [],
```

#### 步骤 3: 移除依赖

**文件**: `package.json`

```json
// 从 devDependencies 中删除
"umi-presets-pro": "^2.0.3"
```

#### 步骤 4: 重新安装依赖

```bash
npm install
```

## 🔄 替代方案

### 方案 1: 保留 OpenAPI 功能

如果需要保留 OpenAPI 文档功能，可以手动安装：

```bash
npm install --save-dev @umijs/max-plugin-openapi
```

然后在 `config/config.ts` 中手动配置：

```typescript
// 需要查看 @umijs/max-plugin-openapi 的文档来配置
```

### 方案 2: 使用其他 API 文档工具

- 使用 Scalar API 文档（后端已配置）
- 使用 Swagger UI 独立部署
- 使用其他 API 文档工具

### 方案 3: 完全移除

如果不需要这些功能，可以直接删除，不会影响核心功能。

## ✅ 建议

### 推荐：保留 umi-presets-pro

**理由**：
1. ✅ 提供了有用的开发工具（OpenAPI 文档、请求记录）
2. ✅ 包体积较小，不会显著影响项目大小
3. ✅ 是 Ant Design Pro 项目的标准配置
4. ✅ 维护成本低，不需要手动管理多个插件

### 如果决定删除

**前提条件**：
1. ✅ 确认不需要 OpenAPI 文档功能
2. ✅ 确认不需要请求记录功能
3. ✅ 确认没有其他功能依赖 @alita/plugins

**删除后**：
- 需要移除相关配置和代码
- 需要移除 OpenAPI 文档链接
- 需要重新安装依赖

## 📊 总结

| 功能 | 使用情况 | 删除影响 | 建议 |
|------|---------|---------|------|
| OpenAPI 文档 | ✅ 使用中 | 🔴 失效 | 保留或使用替代方案 |
| 请求记录 | ✅ 配置中 | 🟡 可能有用 | 保留或移除 |
| @alita/plugins | ❓ 未知 | 🟡 可能影响 | 需要检查 |

## 🎯 最终建议

**建议保留 `umi-presets-pro`**，因为：
1. 它提供了有用的开发工具
2. 删除后需要手动管理多个插件
3. 包体积小，影响不大
4. 是 Ant Design Pro 的标准配置

如果确实不需要这些功能，可以安全删除，但需要按照上述步骤清理相关配置和代码。

