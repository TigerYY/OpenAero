/**
 * E2E 测试认证辅助函数
 */

import { Page } from '@playwright/test';

/**
 * 以管理员身份登录
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  
  // 点击登录按钮
  const loginButton = page.locator('[data-testid="login-button"]').or(page.getByRole('link', { name: /登录|Sign in/i }));
  if (await loginButton.isVisible()) {
    await loginButton.click();
  } else {
    // 如果登录按钮不可见，直接导航到登录页面
    await page.goto('/auth/login');
  }
  
  // 等待登录表单加载
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 });
  
  // 填写管理员凭据（需要根据实际测试环境配置）
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@openaero.test';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123456';
  
  await page.fill('input[name="email"], input[type="email"]', adminEmail);
  await page.fill('input[name="password"], input[type="password"]', adminPassword);
  
  // 提交登录表单
  await page.click('button[type="submit"]').or(page.getByRole('button', { name: /登录|Sign in/i }));
  
  // 等待登录完成（跳转到仪表板或首页）
  await page.waitForURL(/\/(dashboard|admin|creators)/, { timeout: 10000 });
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
}

/**
 * 以创作者身份登录
 */
export async function loginAsCreator(page: Page) {
  await page.goto('/');
  
  // 点击登录按钮
  const loginButton = page.locator('[data-testid="login-button"]').or(page.getByRole('link', { name: /登录|Sign in/i }));
  if (await loginButton.isVisible()) {
    await loginButton.click();
  } else {
    await page.goto('/auth/login');
  }
  
  // 等待登录表单加载
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 });
  
  // 填写创作者凭据
  const creatorEmail = process.env.E2E_CREATOR_EMAIL || 'creator@openaero.test';
  const creatorPassword = process.env.E2E_CREATOR_PASSWORD || 'creator123456';
  
  await page.fill('input[name="email"], input[type="email"]', creatorEmail);
  await page.fill('input[name="password"], input[type="password"]', creatorPassword);
  
  // 提交登录表单
  await page.click('button[type="submit"]').or(page.getByRole('button', { name: /登录|Sign in/i }));
  
  // 等待登录完成
  await page.waitForURL(/\/(dashboard|creators)/, { timeout: 10000 });
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
}

/**
 * 以普通用户身份登录
 */
export async function loginAsUser(page: Page) {
  await page.goto('/');
  
  const loginButton = page.locator('[data-testid="login-button"]').or(page.getByRole('link', { name: /登录|Sign in/i }));
  if (await loginButton.isVisible()) {
    await loginButton.click();
  } else {
    await page.goto('/auth/login');
  }
  
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 });
  
  const userEmail = process.env.E2E_USER_EMAIL || 'user@openaero.test';
  const userPassword = process.env.E2E_USER_PASSWORD || 'user123456';
  
  await page.fill('input[name="email"], input[type="email"]', userEmail);
  await page.fill('input[name="password"], input[type="password"]', userPassword);
  
  await page.click('button[type="submit"]').or(page.getByRole('button', { name: /登录|Sign in/i }));
  
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * 检查是否已登录
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // 检查是否存在用户菜单或退出按钮
    const userMenu = page.locator('[data-testid="user-menu"]').or(page.getByRole('button', { name: /退出|Logout/i }));
    return await userMenu.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * 退出登录
 */
export async function logout(page: Page) {
  const logoutButton = page.locator('[data-testid="logout-button"]').or(page.getByRole('button', { name: /退出|Logout/i }));
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/\/(login|home|$)/, { timeout: 5000 });
  }
}

