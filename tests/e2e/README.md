# E2E 测试说明

## 概述

本目录包含使用 Playwright 编写的端到端（E2E）测试。这些测试验证整个应用程序的用户流程和功能。

## 测试文件

- `homepage.spec.ts` - 首页功能测试
- `auth.spec.ts` - 认证流程测试
- `dashboard.spec.ts` - 仪表板功能测试
- `admin-batch-operations.spec.ts` - 管理员批量操作测试
- `admin-solution-optimize.spec.ts` - 管理员方案优化和发布流程测试
- `creator-solution-upgrade.spec.ts` - 创作者方案升级流程测试

## 运行测试

### 运行所有 E2E 测试

```bash
npm run test:e2e
```

### 运行特定测试文件

```bash
npx playwright test tests/e2e/admin-batch-operations.spec.ts
```

### 以 UI 模式运行测试

```bash
npx playwright test --ui
```

### 运行特定浏览器的测试

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 调试测试

```bash
npx playwright test --debug
```

## 环境变量配置

E2E 测试需要配置测试用户凭据。创建 `.env.local` 文件并添加以下变量：

```env
# 管理员测试账户
E2E_ADMIN_EMAIL=admin@openaero.test
E2E_ADMIN_PASSWORD=admin123456

# 创作者测试账户
E2E_CREATOR_EMAIL=creator@openaero.test
E2E_CREATOR_PASSWORD=creator123456

# 普通用户测试账户
E2E_USER_EMAIL=user@openaero.test
E2E_USER_PASSWORD=user123456
```

## 测试辅助函数

### 认证辅助函数 (`helpers/auth-helpers.ts`)

- `loginAsAdmin(page)` - 以管理员身份登录
- `loginAsCreator(page)` - 以创作者身份登录
- `loginAsUser(page)` - 以普通用户身份登录
- `isLoggedIn(page)` - 检查是否已登录
- `logout(page)` - 退出登录

### 使用示例

```typescript
import { loginAsAdmin } from './helpers/auth-helpers';

test('管理员功能测试', async ({ page }) => {
  await loginAsAdmin(page);
  // 执行测试...
});
```

## 测试数据

测试数据定义在 `helpers/test-data.ts` 中，包括：

- 测试用户凭据
- 测试方案数据

## 测试最佳实践

1. **使用 data-testid 属性**：在组件中添加 `data-testid` 属性，使测试更稳定
2. **等待元素加载**：使用 `waitForSelector` 或 `waitForLoadState` 等待页面加载
3. **处理异步操作**：使用 `await` 等待异步操作完成
4. **错误处理**：使用 `test.skip()` 跳过无法执行的测试，而不是让测试失败
5. **清理资源**：在 `afterEach` 中清理测试数据

## 常见问题

### 测试执行时间过短

如果测试执行时间非常短（< 10ms），可能是：
- 测试被跳过（使用 `test.skip()`）
- 页面元素不存在，导致测试快速失败
- 服务器未启动

### 登录失败

如果登录失败，检查：
1. 测试用户是否存在于数据库中
2. 环境变量是否正确配置
3. 登录表单的选择器是否正确

### 元素找不到

如果找不到页面元素：
1. 检查选择器是否正确
2. 等待页面完全加载
3. 检查元素是否在 iframe 中
4. 使用 Playwright 的调试工具查看页面状态

## 查看测试报告

运行测试后，可以使用以下命令查看 HTML 报告：

```bash
npx playwright show-report
```

报告包含：
- 测试执行结果
- 失败测试的截图
- 失败测试的视频（如果配置）
- 测试执行时间统计

## CI/CD 集成

在 CI/CD 环境中运行测试时：

1. 安装 Playwright 浏览器：
   ```bash
   npx playwright install --with-deps
   ```

2. 设置环境变量

3. 运行测试：
   ```bash
   npm run test:e2e
   ```

4. 上传测试结果（如果失败）：
   ```bash
   # 上传 playwright-report 目录
   ```

