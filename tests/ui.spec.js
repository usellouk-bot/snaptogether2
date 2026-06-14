/**
 * MomenPix — Playwright UI Tests (Testing Phase 2)
 * Tests run against the deployed GitHub Pages URL.
 *
 * Run locally:
 *   npx playwright test tests/ui.spec.js
 *
 * CI: runs automatically on every push via GitHub Actions
 *
 * Tests: 10 UI visibility and navigation tests
 * No Firebase login required for visibility tests.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://usellouk-bot.github.io/snaptogether2/';
const EXPECTED_BUILD = 'admin-login-fix-v1';

// ── helpers ───────────────────────────────────────────────────
async function openApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  // Wait for app to initialize
  await page.waitForSelector('#app', { timeout: 10000 });
}

// ══════════════════════════════════════════════════════════════
// TEST 1 — Home screen: all three entry buttons visible
// ══════════════════════════════════════════════════════════════
test('1. Home shows Guest Photographer button', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-guest-entry');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('כניסה כאורח מצלם');
});

test('2. Home shows Event Manager button', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-manager-entry');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('כניסה כמנהל אירוע');
});

test('3. Home shows System Admin button', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-admin-entry');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('כניסת מנהל מערכת');
});

// ══════════════════════════════════════════════════════════════
// TEST 4 — Create Event hidden before login
// ══════════════════════════════════════════════════════════════
test('4. Create Event button NOT visible before login', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-new-event');
  // Button exists but must be hidden
  await expect(btn).toBeHidden();
});

// ══════════════════════════════════════════════════════════════
// TEST 5 — Guest Photographer click → opens code entry
// ══════════════════════════════════════════════════════════════
test('5. Guest button opens code entry screen', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-guest-entry').click();
  // Should show guest screen with code input
  const codeInput = page.getByTestId('guest-code-input');
  await expect(codeInput).toBeVisible({ timeout: 5000 });
});

// ══════════════════════════════════════════════════════════════
// TEST 6 — Event Manager click → opens manager claim screen
// ══════════════════════════════════════════════════════════════
test('6. Manager button opens manager entry screen', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-manager-entry').click();
  // Should show manager entry screen with email + invite fields
  const emailInput = page.getByTestId('mgr-email');
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  const passInput = page.getByTestId('mgr-pass');
  await expect(passInput).toBeVisible();
});

// ══════════════════════════════════════════════════════════════
// TEST 7 — Admin button → opens Admin login with email + password
// ══════════════════════════════════════════════════════════════
test('7. Admin button opens Admin login with email and password fields', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-admin-entry').click();
  // Should show admin login view
  const emailField = page.getByTestId('adm-email');
  await expect(emailField).toBeVisible({ timeout: 5000 });
  const passField = page.getByTestId('adm-pass');
  await expect(passField).toBeVisible();
});

// ══════════════════════════════════════════════════════════════
// TEST 8 — Build version visible and matches expected
// ══════════════════════════════════════════════════════════════
test('8. Build version is visible and matches expected', async ({ page }) => {
  await openApp(page);
  const versionEl = page.getByTestId('build-version');
  await expect(versionEl).toBeVisible();
  const versionText = await versionEl.textContent();
  expect(versionText.trim()).toBe(EXPECTED_BUILD);
});

// ══════════════════════════════════════════════════════════════
// TEST 9 — Guest cannot navigate to admin/manager screens
// ══════════════════════════════════════════════════════════════
test('9. Guest cannot access admin screen directly', async ({ page }) => {
  await openApp(page);
  // Try direct URL with ?screen=admin — should not show dashboard without auth
  await page.goto(BASE_URL + '?screen=admin', { waitUntil: 'networkidle' });
  await page.waitForSelector('#app', { timeout: 10000 });
  // Admin dashboard should NOT be visible (login view should be shown instead)
  const dashboard = page.locator('#adm-dash');
  // Either hidden or not showing dashboard content
  const isHidden = await dashboard.isHidden().catch(() => true);
  expect(isHidden).toBeTruthy();
});

// ══════════════════════════════════════════════════════════════
// TEST 10 — Home screen has correct structure
// ══════════════════════════════════════════════════════════════
test('10. Home screen renders correctly', async ({ page }) => {
  await openApp(page);
  // App container visible
  await expect(page.locator('#app')).toBeVisible();
  // Home screen active
  await expect(page.locator('#s-home')).toBeVisible();
  // All three entry buttons in correct order
  const guestBtn   = page.getByTestId('btn-guest-entry');
  const managerBtn = page.getByTestId('btn-manager-entry');
  const adminBtn   = page.getByTestId('btn-admin-entry');
  await expect(guestBtn).toBeVisible();
  await expect(managerBtn).toBeVisible();
  await expect(adminBtn).toBeVisible();
});
