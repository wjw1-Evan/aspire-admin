# Playwright 测试规范

## 9. Playwright 测试规范

### 9.1 测试环境配置

**测试账号**：

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 超级管理员 | `admin` | `Admin@123` | 系统管理权限 |
| 企业管理员 | `manager` | `Manager@123` | 企业管理权限 |
| 普通用户 | `user` | `User@123` | 普通用户权限 |

**测试 URL**：
- 本地开发：`http://localhost:15000/admin/`
- 测试环境：根据部署配置

### 9.2 测试文件组织

```
Platform.Admin/tests/
├── e2e/                    # E2E 测试
│   ├── auth/              # 认证相关测试
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── task/              # 任务管理测试
│   │   ├── list.spec.ts
│   │   └── create.spec.ts
│   └── ...
├── fixtures/               # 测试固件
│   └── auth.fixture.ts
├── pages/                  # 页面对象模型
│   ├── LoginPage.ts
│   ├── TaskPage.ts
│   └── ...
└── playwright.config.ts    # Playwright 配置
```

### 9.3 标准测试模板

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('任务管理', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.login('admin', 'Admin@123');
  });

  test('应该显示任务列表', async ({ page }) => {
    await page.goto('/task-management');
    await expect(page.getByText('任务管理')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('应该能创建新任务', async ({ page }) => {
    await page.goto('/task-management');
    await page.getByRole('button', { name: '新建' }).click();
    await page.getByLabel('任务名称').fill('测试任务');
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page.getByText('创建成功')).toBeVisible();
  });
});
```

### 9.4 页面对象模型 (POM)

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(username: string, password: string) {
    await this.page.goto('/login');
    await this.page.getByLabel('用户名').fill(username);
    await this.page.getByLabel('密码').fill(password);
    await this.page.getByRole('button', { name: '登录' }).click();
    await this.page.waitForURL('**/dashboard');
  }
}

// pages/TaskPage.ts
export class TaskPage {
  constructor(private page: Page) {}

  async createTask(name: string) {
    await this.page.getByRole('button', { name: '新建' }).click();
    await this.page.getByLabel('任务名称').fill(name);
    await this.page.getByRole('button', { name: '提交' }).click();
  }
}
```

### 9.5 常用断言

```typescript
// 元素可见性
await expect(page.getByText('成功')).toBeVisible();

// 表单验证
await expect(page.getByText('名称不能为空')).toBeVisible();

// URL 跳转
await expect(page).toHaveURL(/.*dashboard/);

// 表格行数
const rows = await page.getByRole('row').count();
expect(rows).toBeGreaterThan(0);
```

### 9.6 调试技巧

**调试模式运行**：

```bash
npx playwright test --debug
```

**生成测试代码**：

```bash
npx playwright codegen http://localhost:15000/admin/
```

**查看测试报告**：

```bash
npx playwright show-report
```

### 9.7 测试最佳实践

1. **独立性**：每个测试应该独立运行，不依赖其他测试
2. **清理**：测试结束后清理测试数据
3. **等待**：使用 `waitFor` 而不是 `sleep`
4. **选择器**：优先使用 `getByRole`、`getByLabel` 等语义化选择器
5. **截图**：失败时自动截图（配置 `screenshot: 'only-on-failure'`）

### 9.8 CI/CD 集成

```yaml
# .github/workflows/e2e.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
```

### 9.9 已知问题

1. **登录态保持**：使用 `storageState` 保存登录态，避免每个测试都登录
2. **超时设置**：CI 环境适当增加超时时间
3. **并行执行**：注意测试数据隔离，避免并发冲突

### 9.10 用户体验测试（新增）

#### 为什么要测用户体验？

功能测试保证"功能能用"，用户体验测试保证"用户用得舒服"。前者会拦截 bug，后者会拦截用户流失。

#### 关键用户体验测试场景

| 测试场景 | 测试方法 | 通过标准 |
|---------|---------|---------|
| **页面加载时间** | 记录 `goto` 到 `ProTable` 可见的时间 | ≤ 3s |
| **操作反馈** | 点击按钮后检测 loading 状态出现 | ≤ 500ms |
| **空状态显示** | 无数据时检测引导提示是否存在 | 显示空状态组件 |
| **错误提示** | 模拟网络断开，检测错误提示 | 显示友好错误信息 |
| **移动端布局** | 缩放到 375px 宽度，检测元素不溢出 | 无重叠、不截断 |
| **表单校验** | 不填必填项直接提交，检测校验提示 | 立即显示校验信息 |
| **键盘导航** | Tab 切换字段，Enter 提交 | 焦点顺序正确、可提交 |

#### 性能感知测试

用户对"快"的感知不只是真实响应时间，还有**感知性能**：

```typescript
// ✅ 测试：点击操作后是否有即时反馈
test('点击新建按钮有 loading 反馈', async ({ page }) => {
  await page.goto('/task-management');
  const button = page.getByRole('button', { name: '新建' });

  // 点击前按钮没有 loading 类
  await expect(button).not.toHaveClass(/loading/);

  await button.click();

  // 点击后立即显示 loading
  await expect(button).toHaveClass(/loading/);
});

// ✅ 测试：空数据时显示引导
test('无数据时显示空状态', async ({ page }) => {
  await page.goto('/task-management');
  // 如果没有数据，应该看到 Empty 组件
  await expect(page.getByText('暂无数据')).toBeVisible();
  // 并且有新建按钮可以操作
  await expect(page.getByRole('button', { name: '新建' })).toBeVisible();
});
```

#### 易用性测试

```typescript
// ✅ 测试：删除操作有二次确认
test('删除前弹出确认框', async ({ page }) => {
  await page.goto('/task-management');
  await page.getByRole('button', { name: '删除' }).first().click();

  // 弹出 Popconfirm
  await expect(page.getByText('确定要删除吗？')).toBeVisible();
  await page.getByRole('button', { name: '确定' }).click();
});

// ✅ 测试：错误信息友好可读
test('网络错误时显示友好提示', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  await page.goto('/task-management');

  // 显示友好错误信息，不是技术堆栈
  await expect(page.getByText(/网|加载|失败|请稍后/)).toBeVisible();
});
```

#### 跨浏览器体验一致性

关键页面需要在 Chrome、Firefox、Safari 上验证：

- 布局没有偏移或重叠
- 字体在不同系统上可读
- 弹窗在窄屏上正常显示
- 滚动行为一致

#### 关键用户体验检查清单

编写测试时，问自己：

- [ ] **加载体验** — 页面加载慢的场景有覆盖吗？
- [ ] **错误恢复** — 用户能在错误场景下恢复操作吗？
- [ ] **操作确认** — 删除、批量操作等有确认流程测试吗？
- [ ] **空/满状态** — 边界数据状态（0 条、大量数据）测试了吗？
- [ ] **移动端** — 窄屏下关键功能还能正常使用吗？
- [ ] **反馈及时性** — 每个操作后用户能看到反馈吗？
