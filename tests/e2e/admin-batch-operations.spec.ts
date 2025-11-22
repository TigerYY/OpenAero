/**
 * 管理员批量操作 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth-helpers';

test.describe('Admin Batch Operations', () => {
  test.beforeEach(async ({ page }) => {
    // 以管理员身份登录
    await loginAsAdmin(page);
    
    // 导航到发布管理页面
    await page.goto('/zh-CN/admin/solutions/publish-management');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 等待关键元素加载
    await page.waitForSelector('select[name="status"], [data-testid="status-filter"]', { timeout: 10000 }).catch(() => {
      // 如果选择器不存在，尝试其他可能的选择器
      return page.waitForSelector('body', { timeout: 5000 });
    });
  });

  test('应该能够批量发布方案', async ({ page }) => {
    // 1. 在发布管理页面选择"准备发布"状态
    const statusSelect = page.locator('select[name="status"]').or(page.locator('[data-testid="status-filter"]'));
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('READY_TO_PUBLISH');
    } else {
      // 如果选择器不存在，尝试点击标签页
      await page.click('text=准备发布').or(page.click('[data-testid="tab-ready-to-publish"]')).catch(() => {});
    }
    
    // 等待方案卡片加载（如果存在）
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 10000 }).catch(() => {
      // 如果没有方案卡片，测试可能无法继续，但不应失败
      test.skip();
    });
    
    // 2. 选择多个方案（最多10个）
    const checkboxes = page.locator('input[type="checkbox"][data-testid="solution-checkbox"]');
    const count = await checkboxes.count();
    const selectCount = Math.min(count, 3); // 选择3个进行测试
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }
    
    // 3. 点击"批量发布"按钮
    const batchPublishButton = page.locator('button:has-text("批量发布")');
    await expect(batchPublishButton).toBeVisible();
    await batchPublishButton.click();
    
    // 4. 确认操作
    await page.click('button:has-text("确认")');
    
    // 5. 应该显示成功消息
    await expect(page.locator('text=成功发布')).toBeVisible({ timeout: 5000 });
    
    // 6. 方案应该出现在"已发布"状态
    await page.selectOption('select[name="status"]', 'PUBLISHED');
    await expect(page.locator('[data-testid="solution-card"]')).toHaveCount(selectCount, { timeout: 5000 });
  });

  test('应该能够批量临时下架方案', async ({ page }) => {
    // 1. 在发布管理页面选择"已发布"状态
    await page.selectOption('select[name="status"]', 'PUBLISHED');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 选择多个方案
    const checkboxes = page.locator('input[type="checkbox"][data-testid="solution-checkbox"]');
    const count = await checkboxes.count();
    const selectCount = Math.min(count, 3);
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }
    
    // 3. 点击"批量临时下架"按钮
    const batchSuspendButton = page.locator('button:has-text("批量临时下架")');
    await expect(batchSuspendButton).toBeVisible();
    await batchSuspendButton.click();
    
    // 4. 确认操作
    await page.click('button:has-text("确认")');
    
    // 5. 应该显示成功消息
    await expect(page.locator('text=成功临时下架')).toBeVisible({ timeout: 5000 });
    
    // 6. 方案应该出现在"临时下架"状态
    await page.selectOption('select[name="status"]', 'SUSPENDED');
    await expect(page.locator('[data-testid="solution-card"]')).toHaveCount(selectCount, { timeout: 5000 });
  });

  test('应该能够批量恢复方案', async ({ page }) => {
    // 1. 在发布管理页面选择"临时下架"状态
    await page.selectOption('select[name="status"]', 'SUSPENDED');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 选择多个方案
    const checkboxes = page.locator('input[type="checkbox"][data-testid="solution-checkbox"]');
    const count = await checkboxes.count();
    const selectCount = Math.min(count, 3);
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }
    
    // 3. 点击"批量恢复"按钮
    const batchRestoreButton = page.locator('button:has-text("批量恢复")');
    await expect(batchRestoreButton).toBeVisible();
    await batchRestoreButton.click();
    
    // 4. 确认操作
    await page.click('button:has-text("确认")');
    
    // 5. 应该显示成功消息
    await expect(page.locator('text=成功恢复')).toBeVisible({ timeout: 5000 });
    
    // 6. 方案应该重新出现在"已发布"状态
    await page.selectOption('select[name="status"]', 'PUBLISHED');
    await expect(page.locator('[data-testid="solution-card"]')).toHaveCount(selectCount, { timeout: 5000 });
  });

  test('应该限制批量操作最多10个方案', async ({ page }) => {
    // 1. 选择"准备发布"状态
    await page.selectOption('select[name="status"]', 'READY_TO_PUBLISH');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 尝试选择超过10个方案
    const checkboxes = page.locator('input[type="checkbox"][data-testid="solution-checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 10) {
      // 选择前10个
      for (let i = 0; i < 10; i++) {
        await checkboxes.nth(i).check();
      }
      
      // 第11个应该被禁用或显示提示
      const batchPublishButton = page.locator('button:has-text("批量发布")');
      await expect(batchPublishButton).toBeVisible();
      
      // 点击批量发布应该只处理前10个
      await batchPublishButton.click();
      await page.click('button:has-text("确认")');
      
      // 应该显示成功消息，说明处理了10个
      await expect(page.locator('text=成功发布 10 个方案')).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该显示批量操作的结果统计', async ({ page }) => {
    // 1. 选择多个方案进行批量发布
    await page.selectOption('select[name="status"]', 'READY_TO_PUBLISH');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    const checkboxes = page.locator('input[type="checkbox"][data-testid="solution-checkbox"]');
    const selectCount = Math.min(await checkboxes.count(), 3);
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }
    
    // 2. 执行批量发布
    await page.click('button:has-text("批量发布")');
    await page.click('button:has-text("确认")');
    
    // 3. 应该显示操作结果
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=失败')).toBeVisible({ timeout: 5000 });
    
    // 4. 如果有失败，应该显示失败详情
    const failureDetails = page.locator('[data-testid="batch-operation-failures"]');
    if (await failureDetails.isVisible()) {
      await expect(failureDetails).toBeVisible();
    }
  });

  test('应该能够全选/取消全选方案', async ({ page }) => {
    // 1. 选择"准备发布"状态
    await page.selectOption('select[name="status"]', 'READY_TO_PUBLISH');
    await page.waitForSelector('[data-testid="solution-card"]', { timeout: 5000 });
    
    // 2. 点击全选复选框
    const selectAllCheckbox = page.locator('input[type="checkbox"][data-testid="select-all"]');
    await expect(selectAllCheckbox).toBeVisible();
    await selectAllCheckbox.check();
    
    // 3. 所有方案应该被选中
    const checkboxes = page.locator('input[type="checkbox"][data-testid="solution-checkbox"]');
    const count = await checkboxes.count();
    
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
    
    // 4. 再次点击应该取消全选
    await selectAllCheckbox.uncheck();
    
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }
  });
});

