import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/OpenAero/)
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /社区驱动的开放式无人机解决方案平台/ })).toBeVisible()
    
    // Check navigation links
    await expect(page.getByRole('link', { name: /解决方案市场/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /创作者中心/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /认证标准/ })).toBeVisible()
  })

  test('should display hero section with call-to-action buttons', async ({ page }) => {
    await page.goto('/')
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: /浏览解决方案/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /成为创作者/ })).toBeVisible()
    
    // Check feature indicators
    await expect(page.getByText(/专业认证/)).toBeVisible()
    await expect(page.getByText(/70%利润分成/)).toBeVisible()
    await expect(page.getByText(/全球供应链/)).toBeVisible()
  })

  test('should display value flow section', async ({ page }) => {
    await page.goto('/')
    
    // Check section heading
    await expect(page.getByRole('heading', { name: /价值流转流程/ })).toBeVisible()
    
    // Check flow steps
    await expect(page.getByText(/创作者提交方案/)).toBeVisible()
    await expect(page.getByText(/专业审核认证/)).toBeVisible()
    await expect(page.getByText(/供应链生产/)).toBeVisible()
    await expect(page.getByText(/平台销售分成/)).toBeVisible()
  })

  test('should display solutions section', async ({ page }) => {
    await page.goto('/')
    
    // Check section heading
    await expect(page.getByRole('heading', { name: /认证解决方案/ })).toBeVisible()
    
    // Check solution cards (at least one should be visible)
    await expect(page.getByText(/FPV验证机套件/)).toBeVisible()
    await expect(page.getByText(/安防巡检套件/)).toBeVisible()
    await expect(page.getByText(/农业植保套件/)).toBeVisible()
  })

  test('should display transparency section', async ({ page }) => {
    await page.goto('/')
    
    // Check section heading
    await expect(page.getByRole('heading', { name: /透明化运营/ })).toBeVisible()
    
    // Check transparency features
    await expect(page.getByText(/公开透明的认证流程/)).toBeVisible()
    await expect(page.getByText(/详细的成本分解/)).toBeVisible()
    await expect(page.getByText(/实时进度跟踪/)).toBeVisible()
    await expect(page.getByText(/社区监督机制/)).toBeVisible()
  })

  test('should display partners section', async ({ page }) => {
    await page.goto('/')
    
    // Check section heading
    await expect(page.getByRole('heading', { name: /生态伙伴/ })).toBeVisible()
    
    // Check partner logos
    await expect(page.getByText(/大疆创新/)).toBeVisible()
    await expect(page.getByText(/华为云/)).toBeVisible()
    await expect(page.getByText(/阿里云/)).toBeVisible()
  })

  test('should display case studies section', async ({ page }) => {
    await page.goto('/')
    
    // Check section heading
    await expect(page.getByRole('heading', { name: /成功案例/ })).toBeVisible()
    
    // Check case study cards
    await expect(page.getByText(/王工的FPV验证机成功案例/)).toBeVisible()
    await expect(page.getByText(/李工的安防巡检套件/)).toBeVisible()
    await expect(page.getByText(/张工的农业植保套件/)).toBeVisible()
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Test solutions link
    await page.getByRole('link', { name: /解决方案市场/ }).click()
    await expect(page).toHaveURL('/solutions')
    
    // Go back to homepage
    await page.goto('/')
    
    // Test creators link
    await page.getByRole('link', { name: /创作者中心/ }).click()
    await expect(page).toHaveURL('/creators')
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check that mobile menu button is visible
    await expect(page.getByRole('button', { name: /打开主菜单/ })).toBeVisible()
    
    // Check that main content is still visible
    await expect(page.getByRole('heading', { name: /社区驱动的开放式无人机解决方案平台/ })).toBeVisible()
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /社区驱动的开放式无人机解决方案平台/)
    
    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /OpenAero/)
    
    // Check canonical URL
    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveAttribute('href', 'https://openaero.cn/')
  })
})
