// tests/smoke/home.spec.js
const { test, expect } = require('@playwright/test');
const { waitForScreen, collectCriticalErrors, waitForFirebase } = require('./helpers/wait-helpers');

const BASE = 'https://usellouk-bot.github.io/snaptogether2';

test.describe('Home Screen', () => {

  test('1. Site loads without critical Console errors', async ({ page }) => {
    const errors = collectCriticalErrors(page);

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // allow Firebase + Auth to settle

    // Filter out ReferenceError / SyntaxError / TypeError — these are critical
    const critical = errors.filter((e) =>
      /ReferenceError|SyntaxError|TypeError|is not defined|is not a function/.test(e)
    );

    if (critical.length > 0) {
      console.log('Critical errors found:');
      critical.forEach((e) => console.log('  ', e));
    }

    expect(critical, 'No critical JS errors on load').toHaveLength(0);
  });

  test('2. Home screen is active after load', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await waitForFirebase(page);

    // The home screen div should have class "active"
    await waitForScreen(page, 'home');

    const homeScreen = page.locator('#s-home');
    await expect(homeScreen).toHaveClass(/active/);
  });

  test('3. MomenPix logo is visible', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await waitForScreen(page, 'home');

    // Logo contains MOMEN and PIX
    const logo = page.locator('.home-logo, .app-logo, :text("MOMEN")').first();
    await expect(logo).toBeVisible({ timeout: 5000 });
  });

  test('4. Guest entry button is visible', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await waitForScreen(page, 'home');

    // Button that navigates to guest screen
    const guestBtn = page.locator('button:has-text("כניסה כאורח מצלם")');
    await expect(guestBtn).toBeVisible({ timeout: 5000 });
  });

  test('5. "Create new event" button is NOT visible to unauthenticated user', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await waitForFirebase(page);
    await waitForScreen(page, 'home');

    // Allow renderHome to run
    await page.waitForTimeout(1500);

    const createBtn = page.locator('#btn-new-event');

    // Either hidden (display:none) or not in DOM
    const isHidden = await createBtn.evaluate((el) => {
      return !el || el.style.display === 'none' || getComputedStyle(el).display === 'none';
    }).catch(() => true); // if element not found → also hidden

    expect(isHidden, '"Create new event" button should be hidden for unauthenticated user').toBe(true);
  });

});
