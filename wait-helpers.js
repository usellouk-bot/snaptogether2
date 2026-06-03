// tests/smoke/helpers/wait-helpers.js

/**
 * Wait for the MomenPix app shell to load.
 * The app uses opacity transitions — a screen is "active" when it has class "active".
 */
async function waitForScreen(page, screenId, timeout = 10000) {
  await page.waitForFunction(
    (id) => {
      const el = document.getElementById('s-' + id);
      return el && el.classList.contains('active');
    },
    screenId,
    { timeout }
  );
}

/**
 * Collect critical console errors from a page.
 * Returns array of error messages.
 */
function collectCriticalErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known non-critical errors
      const ignore = [
        'favicon',
        '404',
        'cloudusersettings',
        'firebasestorage',
        'hydro-analytics',
        'collector.github.com',
      ];
      if (!ignore.some((pattern) => text.toLowerCase().includes(pattern))) {
        errors.push(text);
      }
    }
  });
  page.on('pageerror', (err) => {
    errors.push('PAGE ERROR: ' + err.message);
  });
  return errors;
}

/**
 * Wait for Firebase to initialize (auth state resolved).
 */
async function waitForFirebase(page, timeout = 8000) {
  await page.waitForFunction(
    () => typeof window.mpAuthReady !== 'undefined' && window.mpAuthReady === true,
    { timeout }
  ).catch(() => {
    // mpAuthReady might not exist in older builds — non-fatal
  });
}

module.exports = { waitForScreen, collectCriticalErrors, waitForFirebase };
