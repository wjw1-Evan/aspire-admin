# 可拖动卡片布局功能测试指南

## 快速开始

### 前置条件

1. 确保后端 API 已实现以下端点：
   - `GET /api/user/welcome-layout` - 获取用户布局配置
   - `POST /api/user/welcome-layout` - 保存用户布局配置

2. 前端开发服务器已启动：
   ```bash
   cd Platform.Admin
   npm run dev
   ```

### 测试环境设置

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签以监控 API 请求
3. 切换到 Console 标签以查看日志

## 功能测试用例

### TC-001: 进入编辑模式

**目的**：验证用户可以进入卡片编辑模式

**步骤**：
1. 打开欢迎页面 `http://localhost:15001/welcome`
2. 找到任意卡片（如"任务概览"）
3. 点击卡片左上角的"解锁"按钮

**预期结果**：
- 按钮图标从"解锁"变为"锁定"
- 卡片右上角显示拖动图标（DragOutlined）
- 卡片的 cursor 样式变为 'grab'

**验证方式**：
```javascript
// 在浏览器控制台执行
const button = document.querySelector('[title="编辑布局"]');
console.log('Button found:', !!button);
console.log('Button icon:', button?.querySelector('svg')?.className);
```

---

### TC-002: 拖动卡片到同列不同位置

**目的**：验证用户可以在同列内拖动卡片

**步骤**：
1. 进入编辑模式（参考 TC-001）
2. 在左列中，将"任务概览"卡片拖动到"统计概览"卡片下方
3. 释放鼠标

**预期结果**：
- 卡片顺序改变
- 显示"布局已保存"提示
- Network 标签显示 POST 请求到 `/api/user/welcome-layout`

**验证方式**：
```javascript
// 检查 API 请求
// 在 Network 标签中查找 welcome-layout 请求
// 检查 Request Payload 中的 layouts 数组顺序
```

---

### TC-003: 拖动卡片到不同列

**目的**：验证用户可以将卡片从左列拖动到右列

**步骤**：
1. 进入编辑模式
2. 将左列的"任务概览"卡片拖动到右列
3. 释放鼠标

**预期结果**：
- 卡片移动到右列
- 右列卡片顺序自动调整
- 显示"布局已保存"提示
- API 请求成功

**验证方式**：
```javascript
// 检查 DOM 结构
const leftCol = document.querySelector('[class*="ant-col"]');
const rightCol = document.querySelectorAll('[class*="ant-col"]')[1];
console.log('Left column cards:', leftCol?.querySelectorAll('[class*="ant-card"]').length);
console.log('Right column cards:', rightCol?.querySelectorAll('[class*="ant-card"]').length);
```

---

### TC-004: 拖动时的视觉反馈

**目的**：验证拖动过程中的视觉反馈

**步骤**：
1. 进入编辑模式
2. 开始拖动卡片（按住但不释放）
3. 观察卡片外观

**预期结果**：
- 被拖动的卡片显示半透明效果（opacity: 0.5）
- 鼠标光标显示为 'grabbing'
- 其他卡片保持正常外观

---

### TC-005: 退出编辑模式

**目的**：验证用户可以退出编辑模式

**步骤**：
1. 进入编辑模式
2. 点击卡片左上角的"锁定"按钮

**预期结果**：
- 按钮图标从"锁定"变为"解锁"
- 拖动图标消失
- 卡片不再可拖动
- cursor 样式恢复为 'default'

---

### TC-006: 页面刷新后布局保留

**目的**：验证布局配置被正确保存和恢复

**步骤**：
1. 进入编辑模式
2. 拖动至少一个卡片到新位置
3. 等待"布局已保存"提示
4. 刷新页面（F5）
5. 观察卡片顺序

**预期结果**：
- 页面加载后卡片顺序与保存前相同
- 没有显示错误提示
- Network 标签显示 GET 请求到 `/api/user/welcome-layout`

**验证方式**：
```javascript
// 在浏览器控制台执行
// 刷新前记录卡片顺序
const getCardOrder = () => {
  return Array.from(document.querySelectorAll('[class*="ant-card"]'))
    .map(card => card.querySelector('[class*="ant-card-head"]')?.textContent)
    .filter(Boolean);
};
console.log('Before refresh:', getCardOrder());
// 刷新后再次执行
console.log('After refresh:', getCardOrder());
```

---

### TC-007: 权限控制 - 审批卡片

**目的**：验证审批卡片根据权限正确显示

**步骤**：
1. 使用有审批权限的账户登录
2. 打开欢迎页面
3. 观察右列是否显示"审批概览"卡片
4. 登出并使用无审批权限的账户登录
5. 打开欢迎页面
6. 观察右列是否不显示"审批概览"卡片

**预期结果**：
- 有权限的用户看到审批卡片
- 无权限的用户看不到审批卡片
- 其他卡片正常显示

---

### TC-008: 错误处理 - API 失败

**目的**：验证 API 失败时的错误处理

**步骤**：
1. 打开浏览器开发者工具
2. 进入编辑模式
3. 使用 Network 标签中的"Throttling"功能模拟网络错误
4. 拖动卡片
5. 观察错误处理

**预期结果**：
- 显示"保存布局失败"错误提示
- 控制台显示错误日志
- 卡片顺序恢复到拖动前的状态

**验证方式**：
```javascript
// 在浏览器控制台执行
// 监听 message 事件
const observer = new MutationObserver(() => {
  const message = document.querySelector('[class*="ant-message"]');
  if (message) {
    console.log('Message:', message.textContent);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

---

### TC-009: 快速连续拖动

**目的**：验证快速拖动多个卡片时的行为

**步骤**：
1. 进入编辑模式
2. 快速拖动 3-4 个卡片到不同位置
3. 观察保存行为

**预期结果**：
- 每次拖动都触发一次保存
- 没有显示多个"布局已保存"提示
- 最终布局正确保存

---

### TC-010: 移动设备兼容性

**目的**：验证在移动设备上的行为

**步骤**：
1. 使用浏览器开发者工具的设备模拟功能
2. 选择移动设备（如 iPhone 12）
3. 打开欢迎页面
4. 尝试拖动卡片

**预期结果**：
- 页面在移动设备上正常显示
- 拖动功能可能不可用（预期行为）
- 没有显示错误

**注意**：当前实现不支持移动设备上的拖动，这是预期行为。

---

## 性能测试

### PT-001: 页面加载性能

**目的**：验证添加拖动功能后页面加载性能

**步骤**：
1. 打开浏览器开发者工具的 Performance 标签
2. 刷新页面
3. 记录加载时间

**预期结果**：
- 页面加载时间 < 3 秒
- 没有显示性能警告

**验证方式**：
```javascript
// 在浏览器控制台执行
console.time('Page Load');
// 页面加载完成后
console.timeEnd('Page Load');
```

---

### PT-002: 拖动流畅度

**目的**：验证拖动过程中的帧率

**步骤**：
1. 打开浏览器开发者工具的 Performance 标签
2. 开始录制
3. 进入编辑模式并拖动卡片
4. 停止录制
5. 查看帧率

**预期结果**：
- 帧率 > 30 FPS
- 没有显示长任务警告

---

### PT-003: 内存使用

**目的**：验证拖动功能不会导致内存泄漏

**步骤**：
1. 打开浏览器开发者工具的 Memory 标签
2. 拍摄堆快照
3. 进行 10 次拖动操作
4. 拍摄第二个堆快照
5. 比较两个快照

**预期结果**：
- 内存增长 < 5 MB
- 没有显示内存泄漏警告

---

## 集成测试

### IT-001: 与其他功能的集成

**目的**：验证拖动功能与其他页面功能的兼容性

**步骤**：
1. 进入编辑模式
2. 拖动卡片
3. 点击卡片内的按钮（如"查看全部"）
4. 验证导航是否正常

**预期结果**：
- 卡片内的按钮在编辑模式下仍可点击
- 导航正常工作

---

### IT-002: 与权限系统的集成

**目的**：验证拖动功能与权限系统的兼容性

**步骤**：
1. 使用不同权限的账户登录
2. 验证卡片显示是否正确
3. 进入编辑模式
4. 验证权限控制是否正确

**预期结果**：
- 卡片显示根据权限正确
- 拖动功能正常工作

---

## 浏览器兼容性测试

### BT-001: Chrome/Edge

**步骤**：
1. 在 Chrome 或 Edge 浏览器中打开欢迎页面
2. 执行 TC-001 到 TC-006

**预期结果**：
- 所有功能正常工作

---

### BT-002: Firefox

**步骤**：
1. 在 Firefox 浏览器中打开欢迎页面
2. 执行 TC-001 到 TC-006

**预期结果**：
- 所有功能正常工作

---

### BT-003: Safari

**步骤**：
1. 在 Safari 浏览器中打开欢迎页面
2. 执行 TC-001 到 TC-006

**预期结果**：
- 所有功能正常工作

---

## 调试技巧

### 查看布局配置

```javascript
// 在浏览器控制台执行
// 获取当前布局配置
const layouts = JSON.parse(localStorage.getItem('welcomeLayouts') || '[]');
console.table(layouts);
```

### 监控 API 请求

```javascript
// 在浏览器控制台执行
// 拦截 fetch 请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('welcome-layout')) {
    console.log('API Request:', args);
  }
  return originalFetch.apply(this, args);
};
```

### 强制重置布局

```javascript
// 在浏览器控制台执行
// 删除保存的布局配置
localStorage.removeItem('welcomeLayouts');
// 刷新页面
location.reload();
```

---

## 常见问题

### Q1: 拖动后没有显示"布局已保存"提示

**可能原因**：
- API 请求失败
- 网络连接问题
- 后端服务未启动

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 检查 Network 标签中的 API 请求
3. 确保后端服务已启动

### Q2: 刷新页面后布局没有恢复

**可能原因**：
- 布局保存失败
- 后端返回错误
- 浏览器缓存问题

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 清除浏览器缓存
3. 检查后端日志

### Q3: 拖动卡片时出现卡顿

**可能原因**：
- 浏览器性能问题
- 页面加载过多数据
- 网络延迟

**解决方案**：
1. 关闭其他浏览器标签
2. 清除浏览器缓存
3. 检查网络连接

---

## 测试报告模板

```markdown
# 可拖动卡片布局功能测试报告

## 测试环境
- 浏览器：[Chrome/Firefox/Safari]
- 版本：[版本号]
- 操作系统：[Windows/macOS/Linux]
- 测试日期：[日期]

## 测试结果

| 测试用例 | 结果 | 备注 |
|---------|------|------|
| TC-001  | ✓/✗ |      |
| TC-002  | ✓/✗ |      |
| ...     | ... | ...  |

## 发现的问题

1. [问题描述]
   - 严重程度：[高/中/低]
   - 重现步骤：[步骤]
   - 预期结果：[结果]
   - 实际结果：[结果]

## 总体评价

[总体评价]

## 签名

- 测试人员：[名字]
- 日期：[日期]
```
