import { test, expect } from '@playwright/test';

/**
 * 关键路径冒烟测试
 * 验证核心功能是否可用
 */

test.describe('Critical Paths', () => {
  test('should load solutions page', async ({ page }) => {
    await page.goto('/solutions');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load products page', async ({ page }) => {
    await page.goto('/shop/products');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    // 检查导航元素是否存在
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });
});

