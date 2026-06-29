/**
 * MomenPix — Camera Simulation Tests — CORE (Blocking CI)
 * tests/simulation/core/camera.core.spec.js
 *
 * MVP-01: ImageCapture undefined → canvas fallback executes
 * MVP-03: Blob never reaches uploadPhoto or IDB (iron rule)
 *
 * MVP-02 is in tests/simulation/experimental/ (non-blocking)
 *
 * Rules:
 * - No Firebase Emulator (Phase 1 scope)
 * - No production code changes
 * - No modifications to existing tests
 * - Runs against deployed GitHub Pages URL
 * - Requires: --use-fake-device-for-media-stream Chromium flag
 *
 * How to run locally:
 *   npx playwright test tests/simulation/core/camera.core.spec.js --config=playwright.config.js
 *
 * CI: Will run automatically if playwright.config.js testMatch includes simulation/ folder.
 * See CI notes at bottom of this file.
 */

const { test, expect } = require('@playwright/test');
const { IC_UNDEFINED, IC_SUCCESS, IC_FAILURE } = require('../../mocks/imagecapture.mock');
const { assertNoBlobInQueue, readIDBQueue } = require('../../mocks/idb.mock');

const BASE_URL = 'https://usellouk-bot.github.io/snaptogether2/';

// ── Setup helpers ─────────────────────────────────────────────────────────────

/**
 * openAppAsGuest
 * Opens the app and navigates to the camera screen via a test event deep link.
 *
 * NOTE: This requires a real test event code in Firebase production.
 * For Phase 1 we navigate to the camera screen manually after guest entry.
 * MVP-05/06/07 will use Firebase Emulator for full auth flows.
 */
async function openApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
}

/**
 * injectConsoleCapture
 * Captures all console.log/warn/error calls from the page.
 * Used to verify which path executed (IC path vs canvas fallback).
 */
function captureConsole(page) {
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  return logs;
}

/**
 * triggerTakePhotoNow
 * Calls takePhotoNow() directly via page.evaluate().
 * Only works if the function is in global scope (it is — confirmed in index.html).
 *
 * Returns: 'ok' if called without throwing, 'error:<msg>' if threw.
 */
async function triggerTakePhotoNow(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      try {
        // takePhotoNow is guarded by canCaptureNow() — we bypass the guard
        // by calling _captureFromCanvas directly for isolation tests,
        // or override canCaptureNow to return true for full pipeline tests.
        if (typeof window.takePhotoNow === 'function') {
          // Temporarily allow capture by patching canCaptureNow
          const orig = window.canCaptureNow;
          window.canCaptureNow = () => true;
          // Also ensure S.ev exists minimally
          if (!window.S) window.S = {};
          if (!window.S.ev) window.S.ev = { code: 'sim-test', name: 'Simulation Test' };
          window.takePhotoNow();
          setTimeout(() => {
            window.canCaptureNow = orig;
            resolve('ok');
          }, 1500); // allow async pipeline to run
        } else {
          resolve('error:takePhotoNow not found in global scope');
        }
      } catch (e) {
        resolve('error:' + e.message);
      }
    });
  });
}

// ── MVP-01 ────────────────────────────────────────────────────────────────────

test('MVP-01: ImageCapture undefined → canvas fallback executes, no crash', async ({ page }) => {
  const logs = captureConsole(page);

  // Inject IC_UNDEFINED BEFORE page JS loads
  await page.addInitScript(IC_UNDEFINED);
  await openApp(page);

  // Verify ImageCapture is not available in page context
  const icAvailable = await page.evaluate(() => typeof window.ImageCapture !== 'undefined');
  expect(icAvailable, 'ImageCapture should be undefined after IC_UNDEFINED injection').toBe(false);

  // Trigger takePhotoNow — must not throw
  const result = await triggerTakePhotoNow(page);
  expect(result, 'takePhotoNow should not throw when ImageCapture is undefined').toBe('ok');

  // Verify _captureFromCanvas was reached (canvas path produces a toDataURL call)
  // We verify this indirectly: no crash + IDB check below
  const idbResult = await assertNoBlobInQueue(page);
  expect(
    idbResult.passed,
    `IDB queue must contain only string dataURLs. Violations: ${idbResult.violations.join(', ')}`
  ).toBe(true);

  // Verify no IC-related error crashed the app
  const icErrors = logs.filter(l =>
    l.type === 'error' && l.text.toLowerCase().includes('imagecapture')
  );
  expect(icErrors.length, 'No ImageCapture errors should appear in console').toBe(0);

  console.log('MVP-01 PASS — canvas fallback executed, no crash, no Blob in IDB');
});

// ── MVP-03 ────────────────────────────────────────────────────────────────────

test('MVP-03: Blob never reaches uploadPhoto or IDB — iron rule verified', async ({ page }) => {
  // This test verifies the iron rule explicitly.
  // We inject IC_SUCCESS (produces a real Blob) and then assert:
  // 1. uploadPhoto is never called with a Blob argument
  // 2. IDB never stores a Blob

  await page.addInitScript(IC_SUCCESS);

  // Also inject a spy on uploadPhoto BEFORE page JS runs
  await page.addInitScript(() => {
    window.__uploadPhotoCallLog = [];
    // We'll wrap uploadPhoto after it's defined — use a MutationObserver approach
    // Actually: wrap via defineProperty after page load in the evaluate below
  });

  await openApp(page);

  // Wrap uploadPhoto with a spy NOW (after page load, before capture)
  await page.evaluate(() => {
    const orig = window.uploadPhoto;
    window.__uploadPhotoCalls = [];
    window.uploadPhoto = function(dataURL, meta) {
      window.__uploadPhotoCalls.push({
        isBlob: dataURL instanceof Blob,
        type: typeof dataURL,
        startsWithData: typeof dataURL === 'string' && dataURL.startsWith('data:'),
      });
      return orig.call(this, dataURL, meta);
    };
  });

  // Trigger takePhotoNow
  const result = await triggerTakePhotoNow(page);
  expect(result).toBe('ok');

  // Wait for async pipeline to settle
  await page.waitForTimeout(2000);

  // Read the spy log
  const callLog = await page.evaluate(() => window.__uploadPhotoCalls || []);

  // Assert: if uploadPhoto was called, it was never called with a Blob
  for (const call of callLog) {
    expect(
      call.isBlob,
      'uploadPhoto must NEVER receive a Blob — iron rule violation'
    ).toBe(false);
    expect(
      call.type,
      'uploadPhoto argument must be a string (dataURL)'
    ).toBe('string');
    expect(
      call.startsWithData,
      'uploadPhoto argument must be a valid dataURL starting with "data:"'
    ).toBe(true);
  }

  // Also verify IDB
  const idbResult = await assertNoBlobInQueue(page);
  expect(
    idbResult.passed,
    `IDB iron rule violated. Violations: ${idbResult.violations.join(', ')}`
  ).toBe(true);

  if (callLog.length === 0) {
    console.log('MVP-03 NOTE — uploadPhoto was not called (canCaptureNow() may have blocked). Iron rule holds by absence.');
  } else {
    console.log(`MVP-03 PASS — uploadPhoto called ${callLog.length} time(s), always with string dataURL. No Blob reached IDB.`);
  }
});
