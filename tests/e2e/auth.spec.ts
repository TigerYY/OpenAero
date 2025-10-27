import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      await page.fill('input[name="email"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials')
    })

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should remember login state after page refresh', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await expect(page).toHaveURL('/dashboard')
      
      // Refresh page
      await page.reload()
      
      // Should still be logged in
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })
  })

  test.describe('Registration', () => {
    test('should display registration form', async ({ page }) => {
      await page.click('[data-testid="register-button"]')
      
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible()
      await expect(page.locator('input[name="name"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    })

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.click('[data-testid="register-button"]')
      
      // Test empty fields
      await page.click('button[type="submit"]')
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email')
      await page.click('button[type="submit"]')
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email')
      
      // Test password mismatch
      await page.fill('input[name="password"]', 'password123')
      await page.fill('input[name="confirmPassword"]', 'different')
      await page.click('button[type="submit"]')
      await expect(page.locator('[data-testid="confirmPassword-error"]')).toContainText('Passwords do not match')
    })

    test('should register successfully with valid data', async ({ page }) => {
      await page.click('[data-testid="register-button"]')
      
      const timestamp = Date.now()
      await page.fill('input[name="name"]', 'Test User')
      await page.fill('input[name="email"]', `test${timestamp}@example.com`)
      await page.fill('input[name="password"]', 'password123')
      await page.fill('input[name="confirmPassword"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Should show success message or redirect
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    })

    test('should show error for existing email', async ({ page }) => {
      await page.click('[data-testid="register-button"]')
      
      await page.fill('input[name="name"]', 'Test User')
      await page.fill('input[name="email"]', 'existing@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.fill('input[name="confirmPassword"]', 'password123')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[data-testid="register-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="register-error"]')).toContainText('Email already exists')
    })
  })

  test.describe('Password Reset', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      await page.click('[data-testid="forgot-password-link"]')
      
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
    })

    test('should send reset email for valid email', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      await page.click('[data-testid="forgot-password-link"]')
      
      await page.fill('input[name="email"]', 'test@example.com')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="reset-success"]')).toContainText('Reset email sent')
    })

    test('should show error for non-existent email', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      await page.click('[data-testid="forgot-password-link"]')
      
      await page.fill('input[name="email"]', 'nonexistent@example.com')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[data-testid="reset-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="reset-error"]')).toContainText('Email not found')
    })
  })

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should logout successfully', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="logout-button"]')
      
      // Should redirect to home page
      await expect(page).toHaveURL('/')
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
    })

    test('should clear session after logout', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="logout-button"]')
      
      // Try to access protected route
      await page.goto('/dashboard')
      
      // Should redirect to login
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Social Authentication', () => {
    test('should display social login options', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      await expect(page.locator('[data-testid="google-login"]')).toBeVisible()
      await expect(page.locator('[data-testid="github-login"]')).toBeVisible()
    })

    test('should redirect to Google OAuth', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('[data-testid="google-login"]')
      ])
      
      await expect(popup).toHaveURL(/accounts\.google\.com/)
    })

    test('should redirect to GitHub OAuth', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('[data-testid="github-login"]')
      ])
      
      await expect(popup).toHaveURL(/github\.com/)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login for unauthenticated users', async ({ page }) => {
      await page.goto('/dashboard')
      
      await expect(page).toHaveURL('/login')
    })

    test('should allow access to protected routes for authenticated users', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Access protected routes
      await page.goto('/dashboard')
      await expect(page).toHaveURL('/dashboard')
      
      await page.goto('/profile')
      await expect(page).toHaveURL('/profile')
      
      await page.goto('/settings')
      await expect(page).toHaveURL('/settings')
    })
  })

  test.describe('Session Management', () => {
    test('should handle session expiration', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Simulate session expiration by clearing cookies
      await page.context().clearCookies()
      
      // Try to access protected route
      await page.goto('/dashboard')
      
      // Should redirect to login
      await expect(page).toHaveURL('/login')
    })

    test('should show session timeout warning', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Mock session timeout warning
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('session-timeout-warning'))
      })
      
      await expect(page.locator('[data-testid="session-warning"]')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      // Tab through form elements
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="email"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="password"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('button[type="submit"]')).toBeFocused()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label', 'Email address')
      await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label', 'Password')
    })

    test('should announce errors to screen readers', async ({ page }) => {
      await page.click('[data-testid="login-button"]')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('role', 'alert')
      await expect(page.locator('[data-testid="password-error"]')).toHaveAttribute('role', 'alert')
    })
  })
})