# 密码本功能使用指南

> 本文档说明密码本功能的使用方式、安全机制和最佳实践。

## 📋 概述

密码本功能提供安全的密码存储和管理能力，支持：

- **加密存储**：使用 AES-256-GCM 算法加密密码
- **分类管理**：支持分类和标签组织密码
- **密码生成**：内置随机密码生成器
- **强度检测**：自动检测密码强度
- **数据导出**：支持导出密码数据

## 🔐 安全机制

### 加密算法

- **算法**：AES-256-GCM（高级加密标准，256位密钥，Galois/Counter Mode）
- **密钥派生**：基于用户ID派生加密密钥，每个用户使用独立密钥
- **Nonce**：每次加密使用随机 nonce，确保相同密码加密结果不同
- **认证标签**：GCM 模式提供完整性验证

### 访问控制

- **用户隔离**：用户只能访问自己创建的密码条目
- **企业隔离**：密码条目属于企业资源，受多租户隔离保护
- **权限控制**：通过 `password-book` 菜单权限控制访问
- **审计日志**：所有操作记录在活动日志中（敏感信息已过滤）

### 安全措施

1. **密码不返回列表**：列表查询不返回密码字段
2. **详情需权限验证**：获取密码详情时验证用户权限
3. **活动日志过滤**：活动日志自动过滤密码字段
4. **软删除支持**：删除操作使用软删除，可恢复

## 🚀 使用方式

### 1. 创建密码条目

**API**：
```
POST /api/password-book
```

**请求**：
```json
{
  "platform": "GitHub",
  "account": "user@example.com",
  "password": "myPassword123",
  "url": "https://github.com",
  "category": "开发工具",
  "tags": ["代码", "Git"],
  "notes": "个人账号"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "entry123",
    "platform": "GitHub",
    "account": "user@example.com",
    "encryptedPassword": "encrypted_data...",
    "url": "https://github.com",
    "category": "开发工具",
    "tags": ["代码", "Git"],
    "notes": "个人账号",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. 查询密码列表

**API**：
```
POST /api/password-book/list
```

**请求**：
```json
{
  "pageIndex": 1,
  "pageSize": 20,
  "keyword": "GitHub",
  "category": "开发工具",
  "tags": ["代码"]
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "entry123",
        "platform": "GitHub",
        "account": "user@example.com",
        "url": "https://github.com",
        "category": "开发工具",
        "tags": ["代码", "Git"],
        "lastUsedAt": "2024-01-01T00:00:00Z"
        // 注意：不包含 password 字段
      }
    ],
    "total": 1
  }
}
```

### 3. 获取密码详情

**API**：
```
GET /api/password-book/{id}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "entry123",
    "platform": "GitHub",
    "account": "user@example.com",
    "password": "myPassword123",  // 解密后的密码
    "url": "https://github.com",
    "category": "开发工具",
    "tags": ["代码", "Git"],
    "notes": "个人账号"
  }
}
```

### 4. 更新密码条目

**API**：
```
PUT /api/password-book/{id}
```

**请求**：
```json
{
  "platform": "GitHub",
  "account": "newuser@example.com",
  "password": "newPassword123",
  "url": "https://github.com",
  "category": "开发工具",
  "tags": ["代码", "Git"],
  "notes": "更新后的备注"
}
```

### 5. 删除密码条目

**API**：
```
DELETE /api/password-book/{id}
```

**响应**：
```json
{
  "success": true,
  "data": true
}
```

### 6. 生成随机密码

**API**：
```
POST /api/password-book/generate-password
```

**请求**：
```json
{
  "length": 16,
  "includeUppercase": true,
  "includeLowercase": true,
  "includeNumbers": true,
  "includeSymbols": true
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "password": "aB3$dE5fG7hI9jK1",
    "strength": "Strong"
  }
}
```

### 7. 检测密码强度

**API**：
```
POST /api/password-book/check-strength
```

**请求**：
```json
{
  "password": "myPassword123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "strength": "Medium",
    "level": 1,
    "feedback": ["密码长度建议至少12位", "建议包含特殊字符"]
  }
}
```

### 8. 获取分类列表

**API**：
```
GET /api/password-book/categories
```

**响应**：
```json
{
  "success": true,
  "data": ["开发工具", "社交媒体", "金融服务", "其他"]
}
```

### 9. 获取标签列表

**API**：
```
GET /api/password-book/tags
```

**响应**：
```json
{
  "success": true,
  "data": ["代码", "Git", "工作", "个人"]
}
```

### 10. 导出密码数据

**API**：
```
POST /api/password-book/export
```

**请求**：
```json
{
  "category": "开发工具",
  "tags": ["代码"]
}
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "platform": "GitHub",
      "account": "user@example.com",
      "password": "myPassword123",  // 解密后的密码
      "url": "https://github.com",
      "category": "开发工具",
      "tags": ["代码", "Git"],
      "notes": "个人账号"
    }
  ]
}
```

### 11. 获取统计信息

**API**：
```
GET /api/password-book/statistics
```

**响应**：
```json
{
  "success": true,
  "data": {
    "totalEntries": 50,
    "totalCategories": 5,
    "totalTags": 20,
    "categoryDistribution": {
      "开发工具": 15,
      "社交媒体": 10,
      "金融服务": 8
    }
  }
}
```

## 💻 前端使用示例

### React 组件示例

```typescript
import { useState, useEffect } from 'react';
import { 
  getPasswordBookList, 
  getPasswordBookEntry,
  createPasswordBookEntry,
  updatePasswordBookEntry,
  deletePasswordBookEntry 
} from '@/services/password-book/api';

function PasswordBook() {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // 加载列表
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const response = await getPasswordBookList({
      pageIndex: 1,
      pageSize: 20
    });
    setEntries(response.data.items);
  };

  // 查看详情
  const handleView = async (id: string) => {
    const response = await getPasswordBookEntry(id);
    setSelectedEntry(response.data);
  };

  // 创建条目
  const handleCreate = async (data: CreatePasswordBookEntryRequest) => {
    await createPasswordBookEntry(data);
    await loadEntries();
  };

  // 更新条目
  const handleUpdate = async (id: string, data: UpdatePasswordBookEntryRequest) => {
    await updatePasswordBookEntry(id, data);
    await loadEntries();
  };

  // 删除条目
  const handleDelete = async (id: string) => {
    await deletePasswordBookEntry(id);
    await loadEntries();
  };

  return (
    <div>
      {/* 列表展示 */}
      {/* 详情弹窗 */}
    </div>
  );
}
```

## 🔒 安全最佳实践

### 1. 密码管理

- ✅ 使用强密码（至少12位，包含大小写字母、数字、特殊字符）
- ✅ 定期更换密码
- ✅ 不同平台使用不同密码
- ✅ 使用密码生成器生成随机密码

### 2. 分类和标签

- ✅ 使用清晰的分类组织密码
- ✅ 使用标签便于搜索和筛选
- ✅ 避免在备注中存储敏感信息

### 3. 访问控制

- ✅ 仅授予必要人员密码本访问权限
- ✅ 定期审查权限分配
- ✅ 离职人员及时撤销权限

### 4. 数据备份

- ✅ 定期导出密码数据备份
- ✅ 备份文件加密存储
- ✅ 备份文件安全保管

## 📊 密码强度等级

| 等级 | 值 | 描述 | 要求 |
|------|-----|------|------|
| Weak | 0 | 弱 | 长度 < 8 或仅包含单一字符类型 |
| Medium | 1 | 中 | 长度 8-11 或包含2种字符类型 |
| Strong | 2 | 强 | 长度 12-15 且包含3种字符类型 |
| VeryStrong | 3 | 非常强 | 长度 >= 16 且包含4种字符类型 |

## 🔍 常见问题

### Q: 密码如何加密存储？

A: 使用 AES-256-GCM 算法，密钥基于用户ID派生，每次加密使用随机 nonce。

### Q: 忘记密码怎么办？

A: 密码本存储的是平台密码，不是系统登录密码。如果忘记系统登录密码，需要通过密码重置功能。

### Q: 可以共享密码吗？

A: 当前版本不支持密码共享。如需共享，可以手动导出后安全传递。

### Q: 删除的密码可以恢复吗？

A: 删除操作使用软删除，理论上可以恢复，但当前版本未提供恢复功能。

### Q: 密码本数据会同步吗？

A: 密码本数据存储在数据库中，多设备登录同一账号可以访问相同数据。

## 📚 相关文档

- [密码本安全审计报告](../security/PASSWORD-BOOK-SECURITY-AUDIT.md)
- [后端核心与中间件规范](BACKEND-RULES.md)
- [数据访问工厂使用指南](DATABASE-OPERATION-FACTORY-GUIDE.md)
