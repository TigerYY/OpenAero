import { test, expect } from '@playwright/test';

/**
 * 健康检查冒烟测试
 * 验证应用基本功能是否正常
 */

test.describe('Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(['healthy', 'ok']).toContain(body.status);
  });

  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/OpenAero/i);
  });

  test('should have working API endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});

