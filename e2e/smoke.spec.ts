import { test, expect } from '@playwright/test'

// @smoke — fast, no-side-effect checks. Run on pre-push.

test.describe('@smoke', () => {
  test('health endpoint is up', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
  })

  test('tournaments API returns an array', async ({ request }) => {
    const res = await request.get('/api/tournaments')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)
  })

  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('volley-monster')
  })

  test('unknown route shows not-found page', async ({ page }) => {
    const res = await page.goto('/this-does-not-exist')
    // SPA serves index.html for all routes — HTTP status is 200
    expect(res?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#root')).not.toBeEmpty()
  })
})
