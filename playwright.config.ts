import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

// When running locally, baseURL points at the Vite dev server; in CI/preview we
// can override via E2E_BASE_URL to test the deployed preview site.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const isLocal = baseURL.startsWith('http://localhost')

export default defineConfig({
  testDir: './e2e',
  // Each spec gets up to 60s. The Stripe Checkout UI test is slow.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 2 : 0,
  reporter: isCI ? 'github' : 'list',
  fullyParallel: false, // tests share a database; serial avoids cross-test interference

  // Bring up the local stack only when targeting localhost.
  globalSetup: isLocal ? './e2e/global-setup.ts' : undefined,

  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start API + Vite when targeting local. Postgres + stripe listen are
  // managed by globalSetup since they aren't HTTP servers Playwright can poll.
  webServer: isLocal
    ? [
        {
          command: 'npm run api:dev:test',
          url: 'http://localhost:3000/api/health',
          reuseExistingServer: !isCI,
          timeout: 60_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !isCI,
          timeout: 60_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ]
    : undefined,
})
