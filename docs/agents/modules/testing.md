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
