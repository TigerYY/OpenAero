/**
 * 管理员方案优化和发布流程 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth-helpers';

test.describe('Admin Solution Optimization and Publishing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 以管理员身份登录
    await loginAsAdmin(page);
    
    // 导航到审核工作台
    await page.goto('/zh-CN/admin/review-workbench');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 等待关键元素加载
    await page.waitForSelector('body', { timeout: 10000 });
  });

  test('应该能够优化已审核通过的方案', async ({ page }) => {
    // 1. 在审核工作台找到已审核通过的方案
    const completedTab = page.locator('text=已完成').or(page.locator('[data-testid="tab-completed"]'));
    if (await completedTab.isVisible()) {
      await completedTab.click();
    }
    
    // 等待方案卡片加载（如果存在）
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 10000 }).catch(() => {
      // 如果没有方案，跳过此测试
      test.skip();
    });
    
    // 2. 点击"优化"按钮
    const optimizeButton = page.locator('button:has-text("优化")').first();
    await expect(optimizeButton).toBeVisible();
    await optimizeButton.click();
    
    // 3. 应该跳转到优化页面
    await expect(page).toHaveURL(/\/admin\/solutions\/.*\/optimize/);
    
    // 4. 填写优化信息
    await page.fill('textarea[name="publishDescription"]', '这是优化后的方案描述');
    
    // 5. 添加媒体链接
    await page.click('button:has-text("添加媒体链接")');
    await page.fill('input[name="mediaLinks.0.title"]', '演示视频');
    await page.fill('input[name="mediaLinks.0.url"]', 'https://example.com/video.mp4');
    
    // 6. 设置SEO信息
    await page.fill('input[name="metaTitle"]', '优化后的SEO标题');
    await page.fill('textarea[name="metaDescription"]', '优化后的SEO描述');
    
    // 7. 设置为推荐方案
    await page.check('input[name="isFeatured"]');
    
    // 8. 保存优化
    await page.click('button:has-text("保存优化")');
    
    // 9. 应该显示成功消息
    await expect(page.locator('text=方案优化完成')).toBeVisible({ timeout: 5000 });
    
    // 10. 方案状态应该变为"准备发布"
    await expect(page.locator('text=准备发布')).toBeVisible();
  });

  test('应该能够预览优化后的方案', async ({ page }) => {
    // 1. 进入优化页面
    await page.goto('/zh-CN/admin/review-workbench');
    await page.click('text=已完成');
    await page.click('button:has-text("优化")').first();
    
    // 2. 填写优化信息
    await page.fill('textarea[name="publishDescription"]', '预览测试描述');
    
    // 3. 点击预览按钮
    await page.click('button:has-text("预览")');
    
    // 4. 应该显示预览对话框或页面
    await expect(page.locator('text=方案预览')).toBeVisible({ timeout: 5000 });
    
    // 5. 预览应该显示优化后的内容
    await expect(page.locator('text=预览测试描述')).toBeVisible();
  });

  test('应该能够直接发布优化后的方案', async ({ page }) => {
    // 1. 进入优化页面
    await page.goto('/zh-CN/admin/review-workbench');
    await page.click('text=已完成');
    await page.click('button:has-text("优化")').first();
    
    // 2. 填写优化信息
    await page.fill('textarea[name="publishDescription"]', '直接发布测试');
    
    // 3. 点击"保存并发布"按钮
    await page.click('button:has-text("保存并发布")');
    
    // 4. 确认对话框
    await page.click('button:has-text("确认")');
    
    // 5. 应该显示成功消息
    await expect(page.locator('text=方案发布成功')).toBeVisible({ timeout: 5000 });
    
    // 6. 方案状态应该变为"已发布"
    await expect(page.locator('text=已发布')).toBeVisible();
  });

  test('应该能够发布准备发布的方案', async ({ page }) => {
    // 1. 在审核工作台找到准备发布的方案
    await page.click('text=准备发布');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 点击"发布"按钮
    const publishButton = page.locator('button:has-text("发布")').first();
    await expect(publishButton).toBeVisible();
    await publishButton.click();
    
    // 3. 确认发布
    await page.click('button:has-text("确认")');
    
    // 4. 应该显示成功消息
    await expect(page.locator('text=方案发布成功')).toBeVisible({ timeout: 5000 });
    
    // 5. 方案应该出现在"已发布"标签页
    await page.click('text=已发布');
    await expect(page.locator('[data-testid="solution-card"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('应该能够临时下架已发布的方案', async ({ page }) => {
    // 1. 在审核工作台找到已发布的方案
    await page.click('text=已发布');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 点击"查看详情"
    await page.click('button:has-text("查看详情")').first();
    
    // 3. 在详情对话框中点击"临时下架"
    await page.click('button:has-text("临时下架")');
    
    // 4. 确认操作
    await page.click('button:has-text("确认")');
    
    // 5. 应该显示成功消息
    await expect(page.locator('text=方案已临时下架')).toBeVisible({ timeout: 5000 });
    
    // 6. 方案应该出现在"临时下架"标签页
    await page.click('text=临时下架');
    await expect(page.locator('[data-testid="solution-card"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('应该能够恢复临时下架的方案', async ({ page }) => {
    // 1. 在审核工作台找到临时下架的方案
    await page.click('text=临时下架');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 点击"恢复"按钮
    const restoreButton = page.locator('button:has-text("恢复")').first();
    await expect(restoreButton).toBeVisible();
    await restoreButton.click();
    
    // 3. 确认操作
    await page.click('button:has-text("确认")');
    
    // 4. 应该显示成功消息
    await expect(page.locator('text=方案已恢复发布')).toBeVisible({ timeout: 5000 });
    
    // 5. 方案应该重新出现在"已发布"标签页
    await page.click('text=已发布');
    await expect(page.locator('[data-testid="solution-card"]')).toHaveCount(1, { timeout: 5000 });
  });
});

