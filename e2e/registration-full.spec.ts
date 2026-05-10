import { test, expect } from '@playwright/test'
import { deleteTeamsByEmail, withDb } from './helpers/db'

// @slow — full UI E2E: navigate the registration flow, drive the real Stripe
// Checkout page with the 4242 test card, wait for `stripe listen` to deliver
// the webhook, and assert the team appears on the tournament page.
//
// This is the most realistic test in the suite. It is slow (10–30s) and
// depends on Stripe's hosted Checkout UI, which is why a faster
// signed-webhook variant lives in registration-webhook.spec.ts.

test.describe('@slow full UI registration → Stripe Checkout → confirmed', () => {
  test.slow()

  const CAPTAIN_EMAIL = `full-ui-${Date.now()}@test.vm`

  test.beforeEach(async () => {
    await deleteTeamsByEmail(CAPTAIN_EMAIL)
  })
  test.afterAll(async () => {
    await deleteTeamsByEmail(CAPTAIN_EMAIL)
  })

  test('captain registers a doubles team and team appears on tournament page', async ({ page }) => {
    // Navigate to the registration flow
    await page.goto('/tournaments/season-opener-2026/register')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Register/i }).first()).toBeVisible()

    // ── Step 1: pick a day + division ────────────────────────────────────────
    // Select the first available day toggle and accept its default division
    // (which is whatever the first <option> is — most reliable across seeds).
    const firstDayCheckbox = page.locator('input[type="checkbox"]').first()
    if (!(await firstDayCheckbox.isChecked())) {
      await firstDayCheckbox.click()
    }
    await page.getByRole('button', { name: /Next/i }).click()

    // ── Step 2: captain info ────────────────────────────────────────────────
    await page.getByLabel(/Full Name/i).fill('Test Captain')
    await page.getByLabel(/Email Address/i).fill(CAPTAIN_EMAIL)
    await page.getByLabel(/Phone/i).fill('3015551234')
    await page.getByLabel(/City/i).fill('Rockville')
    await page.getByRole('button', { name: /Next/i }).click()

    // ── Step 3: roster ───────────────────────────────────────────────────────
    // Player 1 is auto-filled if "I'm playing" is checked. Fill any remaining
    // empty player inputs with synthetic names.
    const playerInputs = page.locator('input[id^="player-"]')
    const count = await playerInputs.count()
    for (let i = 0; i < count; i++) {
      const input = playerInputs.nth(i)
      if (!(await input.isDisabled()) && (await input.inputValue()) === '') {
        await input.fill(`E2E Player ${i + 1}`)
      }
    }
    await page.getByRole('button', { name: /Next/i }).click()

    // ── Step 4: review + submit ─────────────────────────────────────────────
    await page.getByRole('checkbox').last().check()
    await page.getByRole('button', { name: /Continue to Payment|Complete Registration/ }).click()

    // ── Stripe Checkout ─────────────────────────────────────────────────────
    // Stripe's hosted Checkout in test mode shows an accordion of payment
    // methods (Card / Klarna / Cash App Pay / Affirm / Bank). None is
    // selected by default, so card fields are hidden until the Card
    // accordion item is clicked.
    //
    // Selector reference (confirmed via Chrome DevTools 2026-05):
    //   - card accordion button: data-testid="card-accordion-item-button"
    //   - card number input:     #cardNumber (aria-label "Card number")
    //   - expiration input:      #cardExpiry (aria-label "Expiration")
    //   - CVC input:             #cardCvc    (aria-label "CVC")
    //   - cardholder name:       #billingName
    //   - submit button:         data-testid="hosted-payment-submit-button"
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })

    await page.getByLabel(/^Email/i).fill(CAPTAIN_EMAIL)

    // Click the Card payment-method radio. The visible accordion button
    // (`data-testid=card-accordion-item-button`) reports "not visible" to
    // Playwright in some layouts because Stripe overlays it with the
    // expandedClickArea sibling, so target the actual radio input by id
    // and force-click — it'll be intercepted into the underlying handler.
    const cardRadio = page.locator('#payment-method-accordion-item-title-card')
    const cardNumber = page.locator('#cardNumber')
    if (!(await cardNumber.isVisible().catch(() => false))) {
      await cardRadio.click({ force: true })
      await cardNumber.waitFor({ state: 'visible', timeout: 10_000 })
    }

    await cardNumber.fill('4242 4242 4242 4242')
    await page.locator('#cardExpiry').fill('12 / 34')
    await page.locator('#cardCvc').fill('123')
    const nameOnCard = page.locator('#billingName')
    if (await nameOnCard.isVisible().catch(() => false)) {
      await nameOnCard.fill('Test Captain')
    }
    const zip = page.getByLabel(/ZIP|Postal/i)
    if (await zip.isVisible().catch(() => false)) {
      await zip.fill('20850')
    }
    const country = page.getByLabel(/Country or region|^Country$/i)
    if (await country.isVisible().catch(() => false)) {
      await country.selectOption({ label: 'United States' }).catch(() => {})
    }

    // Stripe checks "Save my information for faster checkout" (Link signup)
    // by default, which makes the phone number required. Fill phone if it
    // shows up — simpler than trying to uncheck Link's enrollment widget,
    // which is a custom non-<input> element.
    const phone = page.locator('#phoneNumber')
    if (await phone.isVisible().catch(() => false)) {
      await phone.fill('3015551234')
    }

    await page.getByTestId('hosted-payment-submit-button').click()

    // Redirected to /registration/success?session_id=...
    await page.waitForURL(/\/registration\/success/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')

    // The webhook arrives via `stripe listen`; poll for the team to flip
    // to confirmed. Up to 15s.
    const team = await pollForConfirmedTeam(CAPTAIN_EMAIL, 15_000)
    expect(team).toBeTruthy()

    // The team's player names appear when browsing the tournament detail page.
    // Same caveats as registration-webhook.spec.ts: we have to navigate to
    // the right day tab (page defaults to first upcoming day, so for past
    // tournaments it shows the LAST day) and expand the right gender section.
    await page.goto('/tournaments/season-opener-2026')
    await page.waitForLoadState('networkidle')

    // Click the day tab matching our team's day. For Season Opener the
    // labels are "M/W Doubles" (Saturday) and "Coed Doubles" (Sunday).
    // Our test picks day[0] = Saturday.
    const saturdayTab = page.getByRole('button', { name: /M\/W Doubles/i })
    if (await saturdayTab.count()) await saturdayTab.first().click()

    // Expand the gender section. Our division is non-Open with smallest
    // team_size; in season-opener-2026 day 0 that's Boys 16U (team_size=2).
    // Genders sections are "Men's", "Women's", "Boys", "Girls" — try them.
    for (const label of ["Men's", 'Boys', "Women's", 'Girls', 'Coed']) {
      const toggle = page.getByRole('button', { name: new RegExp(`^${label}$`) })
      if (await toggle.count())
        await toggle
          .first()
          .click()
          .catch(() => {})
    }

    // Page renders player names joined by ", " (DivisionsTable.tsx:43)
    const expectedPlayerList = team!.players.join(', ')
    await expect(page.getByText(expectedPlayerList)).toBeVisible({ timeout: 10_000 })
  })
})

async function pollForConfirmedTeam(
  email: string,
  timeoutMs: number,
): Promise<{ id: string; name: string; players: string[] } | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const team = await withDb(async (c) => {
      const r = await c.query<{ id: string; name: string; players: string[] }>(
        `SELECT t.id, t.name,
                COALESCE(array_agg(p.name ORDER BY p.sort_order)
                         FILTER (WHERE p.id IS NOT NULL), '{}') AS players
         FROM teams t
         LEFT JOIN players p ON p.team_id = t.id
         WHERE t.captain_email = $1 AND t.status = 'confirmed'
         GROUP BY t.id LIMIT 1`,
        [email.toLowerCase().trim()],
      )
      return r.rows[0] ?? null
    })
    if (team) return team
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}
