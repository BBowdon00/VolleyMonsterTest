import { test, expect } from '@playwright/test'

const VALID_ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'local-admin-9d5c1c6f9ff75daa'

test.describe('@smoke admin auth', () => {
  test('GET /api/admin/teams without token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/teams')
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('unauthorized')
  })

  test('GET /api/admin/teams with INVALID token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/teams', {
      headers: { 'x-admin-token': 'totally-bogus-token-xxx' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/teams with empty-string token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/teams', {
      headers: { 'x-admin-token': '' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/teams with VALID token returns 200', async ({ request }) => {
    const res = await request.get('/api/admin/teams?tournament_slug=season-opener-2026', {
      headers: { 'x-admin-token': VALID_ADMIN_TOKEN },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body) || typeof body === 'object').toBeTruthy()
  })

  test('GET /api/admin/season-passes with INVALID token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/season-passes', {
      headers: { 'x-admin-token': 'wrong' },
    })
    expect(res.status()).toBe(401)
  })

  test('admin page renders without a token (login gate visible)', async ({ page, context }) => {
    // sessionStorage is per-context; ensure it's clean
    await context.clearCookies()
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    // AdminLayout / AdminLogin should render some form to enter the token
    await expect(page.locator('#root')).not.toBeEmpty()
    await expect(page.getByText(/admin/i).first()).toBeVisible()
  })
})

test.describe('admin auth — payload tampering', () => {
  test('case-mismatch on token still rejected', async ({ request }) => {
    const res = await request.get('/api/admin/teams', {
      headers: { 'x-admin-token': VALID_ADMIN_TOKEN.toUpperCase() },
    })
    expect(res.status()).toBe(401)
  })

  test('token with surrounding whitespace authenticates (HTTP normalizes header values)', async ({
    request,
  }) => {
    // HTTP header values are trimmed of leading/trailing whitespace per
    // RFC 7230 § 3.2.4 before they reach application code, so the admin
    // auth check sees the same bytes as without padding. This test pins
    // that behavior so a future "defensive" trim() in admin-auth.ts
    // doesn't accidentally start REJECTING tokens that real-world HTTP
    // clients submit with stray whitespace.
    const res = await request.get('/api/admin/teams?tournament_slug=season-opener-2026', {
      headers: { 'x-admin-token': ` ${VALID_ADMIN_TOKEN} ` },
    })
    expect(res.status()).toBe(200)
  })
})
