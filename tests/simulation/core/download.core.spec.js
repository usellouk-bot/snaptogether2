/**
 * MomenPix — Download Simulation Tests — CORE (Blocking CI)
 * tests/simulation/core/download.core.spec.js
 *
 * SIM-DL-CORE-01: fbGetAllPhotos returns all 201 docs — not limited to 200
 * SIM-DL-CORE-02: Firestore failure in fbGetAllPhotos → doDL shows error, saveAs not called
 *
 * Rules:
 * - No Firebase Emulator
 * - No production code changes
 * - Runs against deployed GitHub Pages URL
 * - Mocks db.collection via script injection (same pattern as ux001.experimental.spec.js)
 * - All patches restored in finally blocks
 *
 * Run:
 *   npx playwright test tests/simulation/core/download.core.spec.js -c playwright.simulation.config.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://usellouk-bot.github.io/snaptogether2/';

async function openApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#app', { timeout: 10000 });
}

// ── SIM-DL-CORE-01 ────────────────────────────────────────────────────────────

test('SIM-DL-CORE-01: fbGetAllPhotos returns 201 docs — not limited to 200', async ({ page }) => {
  await openApp(page);

  const result = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      // Build 201 fake docs with unique timestamps
      const fakeDocs = Array.from({ length: 201 }, (_, i) => ({
        url: 'https://res.cloudinary.com/dufzgvkzi/image/upload/sim/photo' + i + '.jpg',
        cloudUrl: 'https://res.cloudinary.com/dufzgvkzi/image/upload/sim/photo' + i + '.jpg',
        type: 'image',
        capturedAt: new Date(Date.now() - i * 1000).toISOString(),
        uploadedAt: Date.now() - i * 1000,
        uploaderName: 'Test'
      }));

      const fakeSnap = {
        docs: fakeDocs.map(d => ({ data: () => d }))
      };

      // Patch db.collection via script injection
      const script = document.createElement('script');
      script.textContent = [
        'window.__origCollection = db.collection.bind(db);',
        'db.collection = function(path) {',
        '  if (path === "events") {',
        '    return {',
        '      doc: function() {',
        '        return {',
        '          collection: function() {',
        '            return {',
        '              get: function() {',
        '                return Promise.resolve(window.__fakeSnap);',
        '              }',
        '            };',
        '          }',
        '        };',
        '      }',
        '    };',
        '  }',
        '  return window.__origCollection(path);',
        '};'
      ].join('\n');
      window.__fakeSnap = fakeSnap;
      document.head.appendChild(script);
      document.head.removeChild(script);

      // Call fbGetAllPhotos directly
      fbGetAllPhotos('sim-test-code')
        .then(photos => {
          // Restore db.collection
          const restore = document.createElement('script');
          restore.textContent = 'db.collection = window.__origCollection;';
          document.head.appendChild(restore);
          document.head.removeChild(restore);

          resolve({
            length: photos.length,
            firstUploadedAt: photos[0] && photos[0].uploadedAt,
            secondUploadedAt: photos[1] && photos[1].uploadedAt
          });
        })
        .catch(err => {
          // Restore on error too
          const restore = document.createElement('script');
          restore.textContent = 'db.collection = window.__origCollection;';
          document.head.appendChild(restore);
          document.head.removeChild(restore);
          reject(err);
        });
    });
  });

  // Assert 201 — not 200
  expect(result.length, 'fbGetAllPhotos must return 201 docs, not 200').toBe(201);
  expect(result.length, 'Must not be limited to 200').not.toBe(200);

  // Assert descending sort (uploadedAt)
  expect(
    result.firstUploadedAt >= result.secondUploadedAt,
    'Sort must be descending by uploadedAt'
  ).toBe(true);
});

// ── SIM-DL-CORE-02 ────────────────────────────────────────────────────────────

test('SIM-DL-CORE-02: Firestore failure → doDL shows error toast, saveAs not called', async ({ page }) => {
  await openApp(page);

  const result = await page.evaluate(() => {
    return new Promise((resolve) => {
      // 1. Inject minimal DOM fixture for doDL UI elements
      const fixture = document.createElement('div');
      fixture.id = '__dl-fixture';
      fixture.innerHTML = [
        '<button id="dl-btn">הורד</button>',
        '<div id="dl-progress" style="display:none"></div>',
        '<div id="dl-progress-txt"></div>',
        '<div id="dl-progress-bar" style="width:0%"></div>'
      ].join('');
      document.body.appendChild(fixture);

      // 2. Set required S state
      const script = document.createElement('script');
      script.textContent = [
        'window.__origCollection = db.collection.bind(db);',
        'window.__origSaveAs = window.saveAs;',
        'window.__origToast = window.toast;',
        'window.__saveAsCalled = false;',
        'window.__lastToast = "";',

        // Spy on saveAs
        'window.saveAs = function() { window.__saveAsCalled = true; };',

        // Spy on toast
        'window.toast = function(msg) { window.__lastToast = msg; window.__origToast && window.__origToast(msg); };',

        // Set S state
        'S.ev = { code: "sim-test", date: "2026-01-01" };',
        'S.dlWhat = "הכל";',
        'S._managerActive = false;',

        // Patch db.collection to reject
        'db.collection = function(path) {',
        '  if (path === "events") {',
        '    return {',
        '      doc: function() {',
        '        return {',
        '          collection: function() {',
        '            return {',
        '              get: function() {',
        '                return Promise.reject(new Error("Firestore simulated failure"));',
        '              }',
        '            };',
        '          }',
        '        };',
        '      }',
        '    };',
        '  }',
        '  return window.__origCollection(path);',
        '};'
      ].join('\n');
      document.head.appendChild(script);
      document.head.removeChild(script);

      // 3. Call doDL and wait for completion (async function — await via .then)
      doDL().then(() => {
        // Collect results
        const btn = document.getElementById('dl-btn');
        const progress = document.getElementById('dl-progress');
        const progressBar = document.getElementById('dl-progress-bar');

        const outcome = {
          saveAsCalled: window.__saveAsCalled,
          lastToast: window.__lastToast,
          btnDisabled: btn ? btn.disabled : null,
          progressHidden: progress ? progress.style.display === 'none' : null,
          progressBarWidth: progressBar ? progressBar.style.width : null
        };

        // Restore everything in finally
        const restore = document.createElement('script');
        restore.textContent = [
          'db.collection = window.__origCollection;',
          'window.saveAs = window.__origSaveAs;',
          'window.toast = window.__origToast;'
        ].join('\n');
        document.head.appendChild(restore);
        document.head.removeChild(restore);

        // Remove fixture
        const fix = document.getElementById('__dl-fixture');
        if (fix) fix.remove();

        resolve(outcome);
      }).catch(err => {
        // Should not reach here — doDL catches internally
        const restore = document.createElement('script');
        restore.textContent = [
          'db.collection = window.__origCollection;',
          'window.saveAs = window.__origSaveAs;',
          'window.toast = window.__origToast;'
        ].join('\n');
        document.head.appendChild(restore);
        document.head.removeChild(restore);
        const fix = document.getElementById('__dl-fixture');
        if (fix) fix.remove();
        resolve({ error: err.message });
      });
    });
  });

  // Assertions
  expect(result.saveAsCalled, 'saveAs must NOT be called when Firestore fails').toBe(false);
  expect(
    result.lastToast.includes('שגיאה') || result.lastToast.includes('⚠'),
    'Toast must show error message'
  ).toBe(true);
  expect(result.btnDisabled, 'dl-btn must be re-enabled by finally block').toBe(false);
  expect(result.progressHidden, 'dl-progress must be hidden by finally block').toBe(true);
  expect(result.progressBarWidth, 'progress bar must reset to 0%').toBe('0%');
});
