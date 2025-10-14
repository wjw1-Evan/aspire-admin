# 企业切换和加入功能

## 📋 概述

在 Admin 端右上角添加了企业切换器组件，允许用户在多个企业间切换，并支持通过搜索企业代码/名称申请加入其他企业。

## ✨ 功能特性

### 1. 企业切换器 (CompanySwitcher)

**位置**: 右上角导航栏，通知图标之后

**功能**:
- 显示当前所在企业
- 下拉列表显示用户所属的所有企业
- 点击企业项可以切换到该企业
- 当前企业有 ✓ 标识
- 显示企业角色信息（个人/管理员标签）

**实现细节**:
- 组件路径: `Platform.Admin/src/components/CompanySwitcher/index.tsx`
- 集成位置: `Platform.Admin/src/app.tsx` 的 `actionsRender` 数组中
- 使用 Ant Design 的 Dropdown 组件
- 切换企业后自动刷新页面以更新数据和权限

### 2. 加入新企业 (JoinCompanyModal)

**位置**: 企业切换器下拉菜单底部

**功能**:
- 点击"加入新企业"按钮打开申请模态框
- 支持通过企业名称或代码搜索企业
- 搜索结果列表展示匹配的企业
- 选择企业并填写申请理由
- 提交加入申请

**实现细节**:
- 组件路径: `Platform.Admin/src/components/JoinCompanyModal/index.tsx`
- 搜索 API: `GET /api/company/search?keyword={keyword}`
- 申请 API: `POST /api/join-request`
- 表单验证：企业和申请理由必填
- 申请成功后显示提示并关闭模态框

## 🔧 技术实现

### 前端组件

#### CompanySwitcher 增强

```typescript
// 1. 导入 JoinCompanyModal
import { JoinCompanyModal } from '../JoinCompanyModal';

// 2. 添加状态控制
const [joinModalOpen, setJoinModalOpen] = useState(false);

// 3. 在菜单中添加"加入新企业"项
menuItems.push({
  key: 'join-company',
  label: (
    <div className={styles.joinCompany}>
      <PlusOutlined /> 加入新企业
    </div>
  ),
  onClick: () => setJoinModalOpen(true),
});

// 4. 渲染模态框
<JoinCompanyModal
  open={joinModalOpen}
  onClose={() => setJoinModalOpen(false)}
  onSuccess={() => loadCompanies()}
/>
```

#### JoinCompanyModal 组件

关键功能：
- 企业搜索（实时搜索）
- 企业列表展示（可点击选择）
- 申请理由输入（必填，最多200字）
- 表单验证和提交

### 后端 API（已实现）

#### 获取我的企业列表
```
GET /api/company/my-companies
Response: UserCompanyItem[]
```

#### 切换企业
```
POST /api/company/switch
Body: { targetCompanyId: string }
Response: SwitchCompanyResult
```

#### 搜索企业
```
GET /api/company/search?keyword={keyword}
Response: CompanySearchResult[]
```

#### 提交加入申请
```
POST /api/join-request
Body: { companyId: string, reason: string }
Response: CompanyJoinRequest
```

## 🎨 UI/UX 设计

### 企业切换器

- **触发方式**: 点击右上角企业名称
- **展示样式**: 下拉菜单
- **企业项展示**:
  - 企业名称
  - 角色标签（个人/管理员）
  - 角色列表
  - 当前企业的 ✓ 图标

### 加入企业模态框

- **宽度**: 600px
- **搜索框**: 大号输入框，支持回车搜索
- **结果列表**: 
  - 最大高度 300px，可滚动
  - 点击选择企业，选中项高亮
  - 显示企业名称、代码和描述
- **申请理由**: 4行文本域，最多200字，显示字数统计
- **操作按钮**: 取消和提交申请

## 📊 数据流

### 企业切换流程

```
用户点击企业 
  → 调用 /api/company/switch 
  → 更新 token（如有返回） 
  → 刷新用户信息 
  → 刷新企业列表 
  → 刷新页面
```

### 加入企业流程

```
输入关键词 
  → 调用 /api/company/search 
  → 展示搜索结果 
  → 用户选择企业 
  → 填写申请理由 
  → 调用 /api/join-request 
  → 显示成功提示 
  → 关闭模态框
```

## 🔐 权限控制

- 所有接口都需要登录认证
- 只能切换到用户已加入的企业
- 搜索企业不需要额外权限
- 提交申请不需要额外权限

## 🎯 用户场景

### 场景 1: 切换企业
1. 用户登录后默认进入某个企业
2. 点击右上角企业名称
3. 在下拉列表中选择另一个企业
4. 系统切换到选定企业并刷新数据

### 场景 2: 加入新企业
1. 用户想加入某个已存在的企业
2. 点击企业切换器中的"加入新企业"
3. 搜索企业名称或代码
4. 从搜索结果中选择目标企业
5. 填写申请理由
6. 提交申请
7. 等待企业管理员审核

### 场景 3: 查看申请状态（待实现）
- 用户可以查看自己的申请列表
- 查看申请状态（待审核/已通过/已拒绝）
- 撤回待审核的申请

## 🧪 测试要点

### 功能测试
- [x] 企业切换器显示在右上角
- [x] 显示用户所属的所有企业
- [x] 当前企业有标识
- [x] 点击企业可以切换
- [x] 切换后页面刷新
- [x] "加入新企业"按钮显示在底部
- [x] 搜索功能正常
- [x] 可以提交申请
- [x] 表单验证正确

### 边界测试
- [ ] 用户只属于一个企业时的显示
- [ ] 搜索无结果时的提示
- [ ] 网络错误时的处理
- [ ] 申请理由超过200字的限制

### 集成测试
- [ ] 切换企业后菜单正确更新
- [ ] 切换企业后权限正确更新
- [ ] 申请提交后企业列表刷新

## 📝 国际化

已添加国际化文案到 `Platform.Admin/src/locales/zh-CN/menu.ts`:

```typescript
'component.companySwitcher.title': '切换企业',
'component.companySwitcher.join': '加入新企业',
'component.companySwitcher.search': '搜索企业',
'component.companySwitcher.applyReason': '申请理由',
'component.companySwitcher.submit': '提交申请',
'component.companySwitcher.cancel': '取消',
```

## 🔄 后续优化

### 已实现
- ✅ 企业切换功能
- ✅ 加入企业申请功能
- ✅ 企业搜索功能

### 待优化
- [ ] 我的申请列表页面
- [ ] 申请状态查看
- [ ] 撤回申请功能
- [ ] 管理员审核申请功能（已有后端API）
- [ ] 申请通知功能
- [ ] 企业成员管理界面

## 📚 相关文档

- [多企业隶属架构设计](./MULTI-COMPANY-MEMBERSHIP-DESIGN.md)
- [用户加入企业流程设计](./USER-JOIN-COMPANY-DESIGN.md)
- [企业切换组件源码](mdc:Platform.Admin/src/components/CompanySwitcher/index.tsx)
- [加入企业模态框源码](mdc:Platform.Admin/src/components/JoinCompanyModal/index.tsx)
- [企业 API Services](mdc:Platform.Admin/src/services/company.ts)
- [企业控制器](mdc:Platform.ApiService/Controllers/CompanyController.cs)
- [加入申请控制器](mdc:Platform.ApiService/Controllers/JoinRequestController.cs)

## 🎯 核心要点

1. **位置**: 企业切换器位于右上角导航栏，与通知、帮助、语言切换等组件并列
2. **触发方式**: 点击打开下拉菜单，独立的下拉菜单（方案 1a）
3. **加入入口**: 在企业切换器下拉菜单底部（方案 2a）
4. **加入方式**: 支持搜索企业列表并选择申请（方案 3b）
5. **用户体验**: 界面简洁，操作流畅，提示明确
6. **数据隔离**: 遵循多租户数据隔离规范
7. **权限控制**: 基于用户-企业关联关系的权限验证

---

**创建时间**: 2025-01-14  
**最后更新**: 2025-01-14  
**状态**: ✅ 已完成

