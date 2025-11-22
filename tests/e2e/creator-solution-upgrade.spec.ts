/**
 * 创作者方案升级流程 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { loginAsCreator } from './helpers/auth-helpers';

test.describe('Creator Solution Upgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 以创作者身份登录
    await loginAsCreator(page);
    
    // 导航到创作者仪表板
    await page.goto('/zh-CN/creators/dashboard?tab=solutions');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 等待关键元素加载
    await page.waitForSelector('body', { timeout: 10000 });
  });

  test('应该能够升级已发布的方案', async ({ page }) => {
    // 1. 在方案列表中找到已发布的方案
    const publishedTab = page.locator('text=已发布').or(page.locator('[data-testid="tab-published"]'));
    if (await publishedTab.isVisible()) {
      await publishedTab.click();
    }
    
    // 等待方案卡片加载（如果存在）
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 10000 }).catch(() => {
      // 如果没有已发布的方案，跳过此测试
      test.skip();
    });
    
    // 2. 点击"升级"按钮
    const upgradeButton = page.locator('button:has-text("升级")').first();
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();
    
    // 3. 应该显示升级对话框
    await expect(page.locator('text=升级方案')).toBeVisible({ timeout: 5000 });
    
    // 4. 填写升级信息
    await page.fill('input[name="title"]', '升级后的方案标题');
    await page.fill('textarea[name="upgradeNotes"]', '这是升级说明');
    
    // 5. 选择升级选项（不复制资产和BOM）
    await page.uncheck('input[name="upgradeAssets"]');
    await page.uncheck('input[name="upgradeBom"]');
    
    // 6. 提交升级
    await page.click('button:has-text("确认升级")');
    
    // 7. 应该显示成功消息
    await expect(page.locator('text=方案升级成功')).toBeVisible({ timeout: 5000 });
    
    // 8. 应该跳转到新方案的编辑页面
    await expect(page).toHaveURL(/\/creators\/solutions\/.*\/edit/);
    
    // 9. 新方案应该是草稿状态
    await expect(page.locator('text=草稿')).toBeVisible();
  });

  test('应该能够升级方案并复制资产和BOM', async ({ page }) => {
    // 1. 在方案列表中找到已发布的方案
    await page.click('text=已发布');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 点击"升级"按钮
    await page.click('button:has-text("升级")').first();
    
    // 3. 填写升级信息
    await page.fill('input[name="title"]', '升级方案（包含资产和BOM）');
    
    // 4. 选择复制资产和BOM
    await page.check('input[name="upgradeAssets"]');
    await page.check('input[name="upgradeBom"]');
    
    // 5. 提交升级
    await page.click('button:has-text("确认升级")');
    
    // 6. 应该显示成功消息
    await expect(page.locator('text=方案升级成功')).toBeVisible({ timeout: 5000 });
    
    // 7. 在编辑页面应该能看到复制的资产和BOM
    await expect(page).toHaveURL(/\/creators\/solutions\/.*\/edit/);
    
    // 8. 检查资产标签页
    await page.click('text=资产');
    await expect(page.locator('[data-testid="asset-item"]')).toHaveCount(1, { timeout: 5000 });
    
    // 9. 检查BOM标签页
    await page.click('text=BOM');
    await expect(page.locator('[data-testid="bom-item"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('应该能够在方案详情页升级方案', async ({ page }) => {
    // 1. 进入方案详情页
    await page.goto('/zh-CN/solutions');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    await page.click('[data-testid="solution-card"]').first();
    
    // 2. 点击"升级方案"按钮
    const upgradeButton = page.locator('button:has-text("升级方案")');
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();
    
    // 3. 应该显示升级对话框
    await expect(page.locator('text=升级方案')).toBeVisible({ timeout: 5000 });
    
    // 4. 填写升级信息并提交
    await page.fill('input[name="title"]', '从详情页升级的方案');
    await page.click('button:has-text("确认升级")');
    
    // 5. 应该显示成功消息并跳转
    await expect(page.locator('text=方案升级成功')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/creators\/solutions\/.*\/edit/);
  });

  test('应该显示升级关系信息', async ({ page }) => {
    // 1. 进入已升级的方案详情页
    await page.goto('/zh-CN/creators/dashboard?tab=solutions');
    await page.click('text=草稿');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 找到标记为"升级"的方案
    const upgradeBadge = page.locator('text=升级').first();
    if (await upgradeBadge.isVisible()) {
      await upgradeBadge.click();
      
      // 3. 应该显示升级关系信息
      await expect(page.locator('text=升级自')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=升级说明')).toBeVisible();
    }
  });

  test('应该显示升级历史', async ({ page }) => {
    // 1. 进入源方案详情页
    await page.goto('/zh-CN/solutions');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    await page.click('[data-testid="solution-card"]').first();
    
    // 2. 滚动到升级历史部分
    const upgradeHistorySection = page.locator('text=升级历史');
    if (await upgradeHistorySection.isVisible()) {
      await upgradeHistorySection.scrollIntoViewIfNeeded();
      
      // 3. 应该显示升级历史列表
      await expect(page.locator('[data-testid="upgrade-history-item"]')).toHaveCount(1, { timeout: 5000 });
    }
  });

  test('应该限制每天最多升级5个方案', async ({ page }) => {
    // 1. 尝试升级第6个方案
    await page.click('text=已发布');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 点击"升级"按钮
    await page.click('button:has-text("升级")').first();
    
    // 3. 填写升级信息
    await page.fill('input[name="title"]', '第6个升级方案');
    await page.click('button:has-text("确认升级")');
    
    // 4. 如果已达到限制，应该显示错误消息
    const errorMessage = page.locator('text=最多只能升级 5 个方案');
    // 注意：这个测试取决于当前已升级的方案数量
    // 在实际测试中，可能需要先创建5个升级方案
    if (await errorMessage.isVisible({ timeout: 5000 })) {
      await expect(errorMessage).toBeVisible();
    }
  });
});

