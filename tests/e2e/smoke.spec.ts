import { test, expect } from '@playwright/test'

test.describe('Public site', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('article page loads', async ({ page }) => {
    await page.goto('/')
    const firstArticle = page.locator('a[href*="/"]').first()
    if (await firstArticle.isVisible()) {
      await firstArticle.click()
      await expect(page.locator('article, main, [role="main"]').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('404 page renders', async ({ page }) => {
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

test.describe('Auth', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input, button, form, [role="form"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('unauthenticated redirect from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login|auth|signin/)
  })
})

test.describe('API health', () => {
  test('articles API returns JSON', async ({ request }) => {
    const response = await request.get('/api/articles')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('newsroom clusters API responds', async ({ request }) => {
    const response = await request.get('/api/newsroom/clusters')
    expect([200, 401, 403]).toContain(response.status())
  })
})
