import { test, expect } from '@playwright/test'

test('health endpoint is up', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.ok()).toBeTruthy()
})

test('tournaments API returns an array', async ({ request }) => {
  const res = await request.get('/api/tournaments')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(Array.isArray(body)).toBeTruthy()
})

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('volley-monster')
})

test('tournaments list page renders', async ({ page }) => {
  await page.goto('/tournaments')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#root')).not.toBeEmpty()
})

test('about page renders', async ({ page }) => {
  await page.goto('/about')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#root')).not.toBeEmpty()
})

test('unknown route shows not-found page', async ({ page }) => {
  const res = await page.goto('/this-does-not-exist')
  // SPA serves index.html for all routes — HTTP status is 200
  expect(res?.status()).toBe(200)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#root')).not.toBeEmpty()
})
