import { test, expect } from '@playwright/test'

test.describe('Public site smoke tests', () => {
  test('homepage loads with content', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('body')).toBeVisible()
    const articles = page.locator('article, [class*="card"], [class*="article"]')
    await expect(articles.first()).toBeVisible({ timeout: 10000 })
  })

  test('article page renders', async ({ page }) => {
    await page.goto('/')
    const link = page.locator('a[href*="/vijesti/"], a[href*="/transferi/"], a[href*="/utakmice/"]').first()
    if (await link.isVisible()) {
      await link.click()
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('category page /vijesti loads', async ({ page }) => {
    const response = await page.goto('/vijesti')
    expect(response?.status()).toBeLessThan(500)
  })

  test('tabela page loads', async ({ page }) => {
    const response = await page.goto('/tabela')
    expect(response?.status()).toBeLessThan(500)
  })

  test('utakmice page loads', async ({ page }) => {
    const response = await page.goto('/utakmice')
    expect(response?.status()).toBeLessThan(500)
  })

  test('video page loads', async ({ page }) => {
    const response = await page.goto('/video')
    expect(response?.status()).toBeLessThan(500)
  })

  test('404 page renders correctly', async ({ page }) => {
    const response = await page.goto('/nonexistent-category/nonexistent-slug-12345')
    expect(response?.status()).toBe(404)
  })

  test('robots.txt accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt')
    expect(response?.status()).toBe(200)
  })

  test('sitemap.xml accessible', async ({ page }) => {
    const response = await page.goto('/sitemap.xml')
    expect(response?.status()).toBe(200)
  })
})

test.describe('Auth guard tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input, button, form, [role="form"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login|auth|signin/)
  })

  test('editor redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/editor/new')
    await expect(page).toHaveURL(/login|auth|signin/)
  })

  test('settings redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/login|auth|signin/)
  })
})

test.describe('API health checks', () => {
  test('articles API responds (auth required)', async ({ request }) => {
    const response = await request.get('/api/articles')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('newsroom clusters API responds', async ({ request }) => {
    const response = await request.get('/api/newsroom/clusters')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('autopilot config API responds', async ({ request }) => {
    const response = await request.get('/api/autopilot/config')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('sites API responds', async ({ request }) => {
    const response = await request.get('/api/sites')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('health API responds', async ({ request }) => {
    const response = await request.get('/api/health/newsroom')
    expect([200, 401, 403, 500]).toContain(response.status())
  })
})

test.describe('Security headers', () => {
  test('homepage has security headers', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() || {}
    expect(headers['x-frame-options']).toBeTruthy()
    expect(headers['x-content-type-options']).toBeTruthy()
  })
})
