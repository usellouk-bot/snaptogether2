/**
 * MomenPix — Upload Simulation Tests (Phase 1)
 * tests/simulation/upload.sim.spec.js
 *
 * Phase 1 scope (no Firebase Emulator):
 *   MVP-04: Cloudinary failure → item remains in IDB queue
 *
 * Phase 2 scope (Firebase Emulator required — NOT implemented here):
 *   MVP-05: Offline → take 3 photos → 3 items in IDB
 *   MVP-06: Online restored → queue drains successfully
 *
 * How to run locally:
 *   npx playwright test tests/simulation/upload.sim.spec.js --config=playwright.config.js
 */

const { test, expect } = require('@playwright/test');
const { IC_UNDEFINED } = require('../mocks/imagecapture.mock');
const { mockCloudinaryFail } = require('../mocks/cloudinary.mock');
const { readIDBQueue, assertNoBlobInQueue } = require('../mocks/idb.mock');

const BASE_URL = 'https://usellouk-bot.github.io/snaptogether2/';

async function openApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
}

/**
 * takeFakePhoto
 * Calls the canvas path directly via _captureFromCanvas.
 * IC_UNDEFINED is injected so ImageCapture is never involved.
 * canCaptureNow() is patched to allow capture.
 */
async function takeFakePhoto(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      try {
        if (!window.S) window.S = {};
        if (!window.S.ev) window.S.ev = { code: 'sim-test', name: 'Simulation Test' };

        // Patch canCaptureNow to allow capture
        const origCCN = window.canCaptureNow;
        window.canCaptureNow = () => true;

        // Patch processUploadQueue to NOT auto-drain (we want item to stay in queue for MVP-04)
        const origPUQ = window.processUploadQueue;
        window.processUploadQueue = () => {}; // no-op — let Cloudinary mock handle it

        window.takePhotoNow();

        setTimeout(() => {
          window.canCaptureNow = origCCN;
          window.processUploadQueue = origPUQ;
          resolve('ok');
        }, 1000);
      } catch (e) {
        resolve('error:' + e.message);
      }
    });
  });
}

// ── MVP-04 ────────────────────────────────────────────────────────────────────

test('MVP-04: Cloudinary failure → item remains in IDB queue (not lost)', async ({ page }) => {
  // IC_UNDEFINED → canvas path only (no ImageCapture involved)
  await page.addInitScript(IC_UNDEFINED);

  // Intercept Cloudinary upload → return 500
  await mockCloudinaryFail(page);

  await openApp(page);

  // Take one fake photo — patches processUploadQueue to no-op
  // so item goes to IDB but Cloudinary is NOT called yet
  const result = await takeFakePhoto(page);
  expect(result, 'takeFakePhoto must not throw').toBe('ok');

  // Wait for IDB write to settle
  await page.waitForTimeout(500);

  // Assert: item is in IDB queue
  const queue = await readIDBQueue(page);
  expect(
    queue.length,
    `Expected 1 item in IDB queue after failed Cloudinary upload. Found: ${queue.length}`
  ).toBeGreaterThanOrEqual(1);

  // Assert: item in queue is a valid dataURL string — not a Blob
  const idbResult = await assertNoBlobInQueue(page);
  expect(
    idbResult.passed,
    `Queue item type violation: ${idbResult.violations.join(', ')}`
  ).toBe(true);

  // Now trigger processUploadQueue with Cloudinary still mocked to 500
  const uploadResult = await page.evaluate(async () => {
    try {
      await window.processUploadQueue();
      return 'ok';
    } catch (e) {
      return 'error:' + e.message;
    }
  });
  expect(uploadResult, 'processUploadQueue must not throw on Cloudinary 500').toBe('ok');

  // Wait for retry attempts (3 attempts × 1500ms = ~4500ms)
  await page.waitForTimeout(5000);

  // Assert: item STILL in IDB after all retries exhausted
  const queueAfter = await readIDBQueue(page);
  expect(
    queueAfter.length,
    `Item must remain in IDB after Cloudinary failure. Queue length: ${queueAfter.length}`
  ).toBeGreaterThanOrEqual(1);

  console.log(`MVP-04 PASS — ${queueAfter.length} item(s) remain in IDB after Cloudinary 500. Data not lost.`);
});

// ── Phase 2 placeholder ───────────────────────────────────────────────────────

// MVP-05 and MVP-06 are NOT implemented in Phase 1.
// They require Firebase Emulator for auth state.
// See Simulation Lab MVP Plan — Phase 2.
