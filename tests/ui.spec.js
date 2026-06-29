
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
const EXPECTED_BUILD = 'self-service-v4';

// ── helpers ───────────────────────────────────────────────────
async function openApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
}

// ══════════════════════════════════════════════════════════════
// ORIGINAL TESTS — updated to test CLICK BEHAVIOR not just visibility
// ══════════════════════════════════════════════════════════════
// ── Home Button Order ─────────────────────────────────────────
// Required order: הרשמה, כניסה, אורח, מנהל
test('1. Signup button is FIRST and clickable — opens register screen', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-register');
  await expect(btn).toBeVisible();
  // Verify it appears before login button in DOM
  const registerBox = await btn.boundingBox();
  const loginBox = await page.getByTestId('btn-login').boundingBox();
  expect(registerBox.y).toBeLessThan(loginBox.y); // signup above login
  await btn.click();
  await expect(page.locator('#s-register')).toBeVisible({ timeout: 5000 });
});

test('2. Login button is SECOND and clickable — opens login screen', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-login');
  await expect(btn).toBeVisible();
  // Verify it appears before guest button in DOM
  const loginBox = await btn.boundingBox();
  const guestBox = await page.getByTestId('btn-guest-entry').boundingBox();
  expect(loginBox.y).toBeLessThan(guestBox.y); // login above guest
  await btn.click();
  await expect(page.locator('#s-login')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#l-email')).toBeVisible();
  await expect(page.locator('#l-pass')).toBeVisible();
});

test('3. Guest button is THIRD and clickable — opens guest screen', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-guest-entry');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('#s-guest')).toBeVisible({ timeout: 5000 });
});

test('4. Manager button is FOURTH and clickable — opens manager_entry screen', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-manager-entry');
  await expect(btn).toBeVisible();
  // Must appear after guest
  const managerBox = await btn.boundingBox();
  const guestBox = await page.getByTestId('btn-guest-entry').boundingBox();
  expect(managerBox.y).toBeGreaterThan(guestBox.y); // manager below guest
  await btn.click();
  await expect(page.locator('#s-manager_entry')).toBeVisible({ timeout: 5000 });
});

test('5. Admin button hidden by default — not visible to public (P0)', async ({ page }) => {
  await openApp(page);
  const btn = page.getByTestId('btn-admin-entry');
  // P0-FIX: Admin button must be hidden from public home screen.
  // Admin accesses via ?screen=admin path only.
  await expect(btn).toBeHidden();
});

test('6. Create Event button NOT visible before login', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('btn-new-event')).toBeHidden();
});

test('7. Admin login screen reachable via ?screen=admin — shows email and password fields (P0)', async ({ page }) => {
  // P0-FIX: Admin button is hidden. Admin must use ?screen=admin path.
  await page.goto(BASE_URL + '?screen=admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  await page.waitForTimeout(400);
  await expect(page.locator('#s-admin')).toBeVisible({ timeout: 5000 });
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
  // P0-FIX: Admin button hidden from public home screen
  await expect(page.getByTestId('btn-admin-entry')).toBeHidden();
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

test('13. manager_entry screen exists with hidden code fields', async ({ page }) => {
  await openApp(page);
  // manager_entry screen exists in DOM with hidden fields for auto-fill
  const screen = page.locator('#s-manager_entry');
  await expect(screen).toBeAttached();
  const inviteField = page.locator('#mgr-invite-code');
  await expect(inviteField).toBeAttached();
  const evField = page.locator('#mgr-event-code');
  await expect(evField).toBeAttached();
});

test('14. manager entry confirm button exists', async ({ page }) => {
  await openApp(page);
  const confirmBtn = page.getByTestId('btn-confirm-manager');
  await expect(confirmBtn).toBeAttached();
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
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
  await page.waitForTimeout(1000);
  // Guest link must NOT open manager_entry screen
  const managerActive = await page.locator('#s-manager_entry.active').count();
  expect(managerActive).toBe(0);
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


// ══════════════════════════════════════════════════════════════
// UX-001 — Gallery Lightbox Experience (Tests 18–30)
// Tests run against deployed GitHub Pages URL.
// These tests verify DOM structure and JS function existence.
// Gesture simulation (Swipe, Pinch) runs in simulation/ux001.sim.spec.js.
// ══════════════════════════════════════════════════════════════

test('18. lb-prev button exists in DOM', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#lb-prev')).toBeAttached();
});

test('19. lb-next button exists in DOM', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#lb-next')).toBeAttached();
});

test('20. lb-counter exists in DOM', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#lb-counter')).toBeAttached();
});

test('21. lb-img-wrapper exists in DOM', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#lb-img-wrapper')).toBeAttached();
});

test('22. lb-prev and lb-next hidden when lightbox closed', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#lb-prev')).toBeHidden();
  await expect(page.locator('#lb-next')).toBeHidden();
});

test('23. lbNext function exists on window', async ({ page }) => {
  await openApp(page);
  const exists = await page.evaluate(() => typeof window.lbNext === 'function');
  expect(exists).toBe(true);
});

test('24. lbPrev function exists on window', async ({ page }) => {
  await openApp(page);
  const exists = await page.evaluate(() => typeof window.lbPrev === 'function');
  expect(exists).toBe(true);
});

test('25. _lbResetZoom function exists on window', async ({ page }) => {
  await openApp(page);
  const exists = await page.evaluate(() => typeof window._lbResetZoom === 'function');
  expect(exists).toBe(true);
});

test('26. _lbApplyTransform function exists on window', async ({ page }) => {
  await openApp(page);
  const exists = await page.evaluate(() => typeof window._lbApplyTransform === 'function');
  expect(exists).toBe(true);
});

test('27. _lbFocalZoom function exists on window', async ({ page }) => {
  await openApp(page);
  const exists = await page.evaluate(() => typeof window._lbFocalZoom === 'function');
  expect(exists).toBe(true);
});

test('28. Escape key closes lightbox when open', async ({ page }) => {
  await openApp(page);
  // Open lightbox via JS
  await page.evaluate(() => {
    window._lbIsGalleryMode = false;
    window.openLB('<div style="color:white;padding:20px;">test</div>', 'test');
  });
  await expect(page.locator('#lb')).toHaveClass(/open/, { timeout: 3000 });
  // Press Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await expect(page.locator('#lb')).not.toHaveClass(/open/);
});

test('29. ArrowRight does not throw when lightbox is closed', async ({ page }) => {
  await openApp(page);
  let threw = false;
  page.on('pageerror', () => { threw = true; });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  expect(threw).toBe(false);
});

test('30. Lightbox reset: _lbZoom and _lbCurrentIdx reset to defaults after close', async ({ page }) => {
  await openApp(page);
  // Open then close lightbox
  await page.evaluate(() => {
    window.openLB('<div>test</div>', 'test');
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => window.closeLB());
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    zoom: window._lbZoom,
    idx: window._lbCurrentIdx,
    panX: window._lbPanX,
    panY: window._lbPanY,
    isGalleryMode: window._lbIsGalleryMode,
  }));
  expect(state.zoom).toBe(1);
  expect(state.idx).toBe(-1);
  expect(state.panX).toBe(0);
  expect(state.panY).toBe(0);
  expect(state.isGalleryMode).toBe(false);
});
