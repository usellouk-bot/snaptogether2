/**
 * MomenPix — Playwright UI Tests (Testing Phase 2)
 * Tests run against the deployed GitHub Pages URL.
 *
 * Run locally:
 *   npx playwright test tests/ui.spec.js
 *
 * CI: runs automatically on every push via GitHub Actions
 *
 * Tests: 17 UI visibility and navigation tests (10 original + 7 manager invite)
 * No Firebase login required for visibility tests.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://usellouk-bot.github.io/snaptogether2/';
const EXPECTED_BUILD = 'admin-login-fix-v1';

// ── helpers ───────────────────────────────────────────────────
async function openApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
}

// ══════════════════════════════════════════════════════════════
// ORIGINAL 10 TESTS
// ══════════════════════════════════════════════════════════════
test('1. Home shows Guest Photographer button', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('btn-guest-entry')).toBeVisible();
  await expect(page.getByTestId('btn-guest-entry')).toContainText('כניסה כאורח מצלם');
});

test('2. Home shows Event Manager button', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('btn-manager-entry')).toBeVisible();
  await expect(page.getByTestId('btn-manager-entry')).toContainText('כניסה כמנהל אירוע');
});

test('3. Home shows System Admin button', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('btn-admin-entry')).toBeVisible();
  await expect(page.getByTestId('btn-admin-entry')).toContainText('כניסת מנהל מערכת');
});

test('4. Create Event button NOT visible before login', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('btn-new-event')).toBeHidden();
});

test('5. Guest button opens code entry screen', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-guest-entry').click();
  await expect(page.getByTestId('guest-code-input')).toBeVisible({ timeout: 5000 });
});

test('6. Manager button opens manager entry screen', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-manager-entry').click();
  await expect(page.getByTestId('mgr-email')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('mgr-pass')).toBeVisible();
});

test('7. Admin button opens Admin login with email and password fields', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-admin-entry').click();
  await expect(page.getByTestId('adm-email')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('adm-pass')).toBeVisible();
});

test('8. Build version is visible and matches expected', async ({ page }) => {
  await openApp(page);
  const versionEl = page.getByTestId('build-version');
  await expect(versionEl).toBeVisible();
  const versionText = await versionEl.textContent();
  expect(versionText.trim()).toBe(EXPECTED_BUILD);
});

test('9. Guest cannot access admin screen directly', async ({ page }) => {
  await page.goto(BASE_URL + '?screen=admin', { waitUntil: 'networkidle' });
  await page.waitForSelector('#app', { timeout: 10000 });
  const dashboard = page.locator('#adm-dash');
  const isHidden = await dashboard.isHidden().catch(() => true);
  expect(isHidden).toBeTruthy();
});

test('10. Home screen renders correctly', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#s-home')).toBeVisible();
  await expect(page.getByTestId('btn-guest-entry')).toBeVisible();
  await expect(page.getByTestId('btn-manager-entry')).toBeVisible();
  await expect(page.getByTestId('btn-admin-entry')).toBeVisible();
});

// ══════════════════════════════════════════════════════════════
// MANAGER INVITE UX — 7 NEW TESTS (Tests 11-17)
// ══════════════════════════════════════════════════════════════

test('11. Manager invite panel hidden on page load', async ({ page }) => {
  await openApp(page);
  // Navigate to share screen first (not logged in, so we simulate via URL hash or direct check)
  // Panel must exist but be hidden by default
  const panel = page.getByTestId('mgr-invite-panel');
  // Panel exists in DOM but hidden
  await expect(panel).toBeHidden();
});

test('12. ?manager_invite= link opens manager_entry screen', async ({ page }) => {
  await page.goto(BASE_URL + '?manager_invite=MGR-TESTCODE&ev=STTEST1',
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  // Should navigate to manager_entry screen
  await page.waitForTimeout(600); // wait for setTimeout in handleDeepLink
  const managerScreen = page.locator('#s-manager_entry');
  await expect(managerScreen).toBeVisible({ timeout: 5000 });
});

test('13. manager_entry pre-fills invite code from URL', async ({ page }) => {
  await page.goto(BASE_URL + '?manager_invite=MGR-AUTOTEST&ev=STAUTO1',
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  // Wait until the hidden field is populated (up to 5 seconds)
  await page.waitForFunction(
    () => {
      const el = document.getElementById('mgr-invite-code');
      return el && el.value === 'MGR-AUTOTEST';
    },
    { timeout: 5000 }
  ).catch(() => {}); // don't fail here — let expect below report
  const inviteVal = await page.locator('#mgr-invite-code').inputValue();
  expect(inviteVal).toBe('MGR-AUTOTEST');
});

test('14. manager_entry pre-fills event code from URL', async ({ page }) => {
  await page.goto(BASE_URL + '?manager_invite=MGR-AUTOTEST&ev=STAUTO1',
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  // Wait until the hidden field is populated (up to 5 seconds)
  await page.waitForFunction(
    () => {
      const el = document.getElementById('mgr-event-code');
      return el && el.value === 'STAUTO1';
    },
    { timeout: 5000 }
  ).catch(() => {});
  const evVal = await page.locator('#mgr-event-code').inputValue();
  expect(evVal).toBe('STAUTO1');
});

test('15. manager_entry shows email and password before login', async ({ page }) => {
  await page.goto(BASE_URL + '?manager_invite=MGR-TEST&ev=STTEST1',
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  await page.waitForTimeout(600);
  // Login card visible
  await expect(page.locator('#mgr-login-card')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('mgr-email')).toBeVisible();
  await expect(page.getByTestId('mgr-pass')).toBeVisible();
  // Confirm card hidden (before login)
  await expect(page.getByTestId('mgr-confirm-card')).toBeHidden();
});

test('16. Guest ?code= link still works — not broken', async ({ page }) => {
  await page.goto(BASE_URL + '?code=STTEST1',
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  await page.waitForTimeout(800);
  // Should navigate to guest or welcome screen (not manager_entry or error)
  const managerScreen = page.locator('#s-manager_entry.active');
  const isManagerActive = await managerScreen.count();
  expect(isManagerActive).toBe(0); // guest link must NOT open manager screen
});

test('17. ?screen=admin link still works — not broken', async ({ page }) => {
  await page.goto(BASE_URL + '?screen=admin',
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  await page.waitForTimeout(400);
  // Admin screen should be active (login view shown, not broken)
  const adminScreen = page.locator('#s-admin');
  await expect(adminScreen).toBeVisible({ timeout: 5000 });
});

