import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/')
    await page.click('[data-testid="login-button"]')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Layout and Navigation', () => {
    test('should display main dashboard components', async ({ page }) => {
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should navigate between dashboard sections', async ({ page }) => {
      // Navigate to different sections
      await page.click('[data-testid="nav-analytics"]')
      await expect(page).toHaveURL('/dashboard/analytics')
      
      await page.click('[data-testid="nav-projects"]')
      await expect(page).toHaveURL('/dashboard/projects')
      
      await page.click('[data-testid="nav-settings"]')
      await expect(page).toHaveURL('/dashboard/settings')
      
      await page.click('[data-testid="nav-dashboard"]')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should toggle sidebar on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Sidebar should be hidden on mobile
      await expect(page.locator('[data-testid="sidebar"]')).toBeHidden()
      
      // Click menu toggle
      await page.click('[data-testid="menu-toggle"]')
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      
      // Click outside to close
      await page.click('[data-testid="main-content"]')
      await expect(page.locator('[data-testid="sidebar"]')).toBeHidden()
    })
  })

  test.describe('Dashboard Overview', () => {
    test('should display key metrics cards', async ({ page }) => {
      await expect(page.locator('[data-testid="metrics-card-users"]')).toBeVisible()
      await expect(page.locator('[data-testid="metrics-card-revenue"]')).toBeVisible()
      await expect(page.locator('[data-testid="metrics-card-orders"]')).toBeVisible()
      await expect(page.locator('[data-testid="metrics-card-conversion"]')).toBeVisible()
    })

    test('should display charts and graphs', async ({ page }) => {
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-growth-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="traffic-sources-chart"]')).toBeVisible()
    })

    test('should update metrics in real-time', async ({ page }) => {
      const initialValue = await page.locator('[data-testid="metrics-card-users"] .metric-value').textContent()
      
      // Simulate real-time update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('metrics-update', {
          detail: { users: 1250 }
        }))
      })
      
      await page.waitForTimeout(1000)
      const updatedValue = await page.locator('[data-testid="metrics-card-users"] .metric-value').textContent()
      
      expect(updatedValue).not.toBe(initialValue)
    })

    test('should filter data by date range', async ({ page }) => {
      await page.click('[data-testid="date-range-picker"]')
      await page.click('[data-testid="date-range-last-7-days"]')
      
      // Wait for data to update
      await page.waitForLoadState('networkidle')
      
      // Verify URL contains date filter
      await expect(page).toHaveURL(/range=7d/)
      
      // Verify charts update
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    })
  })

  test.describe('Data Tables', () => {
    test('should display recent orders table', async ({ page }) => {
      await expect(page.locator('[data-testid="recent-orders-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="orders-table-header"]')).toBeVisible()
      
      // Check table columns
      await expect(page.locator('th:has-text("Order ID")')).toBeVisible()
      await expect(page.locator('th:has-text("Customer")')).toBeVisible()
      await expect(page.locator('th:has-text("Amount")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()
    })

    test('should sort table columns', async ({ page }) => {
      // Click on Amount column to sort
      await page.click('th:has-text("Amount")')
      
      // Verify sorting indicator
      await expect(page.locator('th:has-text("Amount") .sort-indicator')).toBeVisible()
      
      // Click again to reverse sort
      await page.click('th:has-text("Amount")')
      await expect(page.locator('th:has-text("Amount") .sort-desc')).toBeVisible()
    })

    test('should paginate through table data', async ({ page }) => {
      // Check if pagination exists
      const pagination = page.locator('[data-testid="table-pagination"]')
      if (await pagination.isVisible()) {
        await page.click('[data-testid="next-page"]')
        
        // Verify page change
        await expect(page.locator('[data-testid="current-page"]')).toContainText('2')
        
        // Go back to first page
        await page.click('[data-testid="prev-page"]')
        await expect(page.locator('[data-testid="current-page"]')).toContainText('1')
      }
    })

    test('should search/filter table data', async ({ page }) => {
      const searchInput = page.locator('[data-testid="table-search"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        
        // Wait for search results
        await page.waitForTimeout(500)
        
        // Verify filtered results
        const rows = page.locator('[data-testid="table-row"]')
        const count = await rows.count()
        expect(count).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Quick Actions', () => {
    test('should display quick action buttons', async ({ page }) => {
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()
      await expect(page.locator('[data-testid="action-new-project"]')).toBeVisible()
      await expect(page.locator('[data-testid="action-invite-user"]')).toBeVisible()
      await expect(page.locator('[data-testid="action-export-data"]')).toBeVisible()
    })

    test('should open new project modal', async ({ page }) => {
      await page.click('[data-testid="action-new-project"]')
      
      await expect(page.locator('[data-testid="new-project-modal"]')).toBeVisible()
      await expect(page.locator('input[name="projectName"]')).toBeVisible()
      
      // Close modal
      await page.click('[data-testid="modal-close"]')
      await expect(page.locator('[data-testid="new-project-modal"]')).toBeHidden()
    })

    test('should open invite user modal', async ({ page }) => {
      await page.click('[data-testid="action-invite-user"]')
      
      await expect(page.locator('[data-testid="invite-user-modal"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      
      // Close modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="invite-user-modal"]')).toBeHidden()
    })

    test('should trigger data export', async ({ page }) => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="action-export-data"]')
      ])
      
      expect(download.suggestedFilename()).toMatch(/dashboard-data.*\.csv/)
    })
  })

  test.describe('Notifications', () => {
    test('should display notification center', async ({ page }) => {
      await page.click('[data-testid="notifications-button"]')
      
      await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible()
    })

    test('should mark notifications as read', async ({ page }) => {
      await page.click('[data-testid="notifications-button"]')
      
      const firstNotification = page.locator('[data-testid="notification-item"]').first()
      await firstNotification.click()
      
      await expect(firstNotification).toHaveClass(/read/)
    })

    test('should clear all notifications', async ({ page }) => {
      await page.click('[data-testid="notifications-button"]')
      await page.click('[data-testid="clear-all-notifications"]')
      
      await expect(page.locator('[data-testid="no-notifications"]')).toBeVisible()
    })
  })

  test.describe('User Profile', () => {
    test('should display user profile dropdown', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      
      await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible()
      await expect(page.locator('[data-testid="profile-link"]')).toBeVisible()
      await expect(page.locator('[data-testid="settings-link"]')).toBeVisible()
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
    })

    test('should navigate to profile page', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="profile-link"]')
      
      await expect(page).toHaveURL('/profile')
    })

    test('should navigate to settings page', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="settings-link"]')
      
      await expect(page).toHaveURL('/settings')
    })
  })

  test.describe('Responsive Design', () => {
    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Sidebar should be collapsible on tablet
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      
      // Charts should stack vertically
      const charts = page.locator('[data-testid="chart-container"]')
      const chartCount = await charts.count()
      
      if (chartCount > 1) {
        const firstChart = charts.first()
        const secondChart = charts.nth(1)
        
        const firstBox = await firstChart.boundingBox()
        const secondBox = await secondChart.boundingBox()
        
        // Second chart should be below first chart
        expect(secondBox?.y).toBeGreaterThan(firstBox?.y || 0)
      }
    })

    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Sidebar should be hidden on mobile
      await expect(page.locator('[data-testid="sidebar"]')).toBeHidden()
      
      // Mobile menu should be visible
      await expect(page.locator('[data-testid="menu-toggle"]')).toBeVisible()
      
      // Metrics cards should stack
      const metricsCards = page.locator('[data-testid^="metrics-card"]')
      const cardCount = await metricsCards.count()
      
      if (cardCount > 1) {
        const firstCard = metricsCards.first()
        const secondCard = metricsCards.nth(1)
        
        const firstBox = await firstCard.boundingBox()
        const secondBox = await secondCard.boundingBox()
        
        // Cards should stack vertically on mobile
        expect(secondBox?.y).toBeGreaterThan(firstBox?.y || 0)
      }
    })
  })

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
    })

    test('should lazy load charts', async ({ page }) => {
      // Scroll to bottom to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      
      // Wait for lazy-loaded content
      await page.waitForTimeout(1000)
      
      await expect(page.locator('[data-testid="lazy-chart"]')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('/api/dashboard/metrics', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        })
      })
      
      await page.reload()
      
      // Should display error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0
      
      await page.route('/api/dashboard/metrics', route => {
        requestCount++
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          })
        } else {
          route.continue()
        }
      })
      
      await page.reload()
      await page.click('[data-testid="retry-button"]')
      
      // Should successfully load after retry
      await expect(page.locator('[data-testid="metrics-card-users"]')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through main navigation
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="nav-analytics"]')).toBeFocused()
    })

    test('should have proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1')
      const h2 = page.locator('h2')
      
      await expect(h1).toHaveCount(1) // Should have exactly one h1
      await expect(h2.first()).toBeVisible() // Should have h2 elements
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('role', 'navigation')
      await expect(page.locator('[data-testid="main-content"]')).toHaveAttribute('role', 'main')
    })
  })
})