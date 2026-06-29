/**
 * MomenPix — IDB Queue Reader
 * tests/mocks/idb.mock.js
 *
 * Reads the IndexedDB upload queue from inside the browser context.
 * Used by simulation tests to assert queue state without touching production code.
 *
 * Usage in spec:
 *   const { readIDBQueue } = require('../mocks/idb.mock');
 *   const items = await readIDBQueue(page);
 *   expect(items.length).toBe(3);
 *
 * IDB schema (from production code):
 *   DB name: 'MomenPixDB'
 *   Store:   'queue'
 *   keyPath: 'ts' (ISO string)
 *   Values:  { dataURL, ts, uploaderName, uploaderId, deviceId, eventCode, source, capturedAt }
 *
 * Iron rule verified here: values must be strings (dataURL), never Blob objects.
 */

/**
 * readIDBQueue
 * Returns all items currently in the IDB upload queue.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>} queue items
 */
async function readIDBQueue(page) {
  return page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('MomenPixDB');
      req.onerror = () => reject(new Error('IDB open failed'));
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          resolve([]);
          return;
        }
        const tx = db.transaction('queue', 'readonly');
        const store = tx.objectStore('queue');
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => reject(new Error('IDB getAll failed'));
      };
      req.onupgradeneeded = () => resolve([]); // fresh DB = empty queue
    });
  });
}

/**
 * assertNoBlobInQueue
 * Reads the IDB queue and asserts that no item contains a Blob object.
 * The iron rule: dataURL is always a string. Blob must never reach IDB.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{passed: boolean, violations: string[]}>}
 */
async function assertNoBlobInQueue(page) {
  return page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('MomenPixDB');
      req.onerror = () => reject(new Error('IDB open failed'));
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          resolve({ passed: true, violations: [] });
          return;
        }
        const tx = db.transaction('queue', 'readonly');
        const store = tx.objectStore('queue');
        const all = store.getAll();
        all.onsuccess = () => {
          const violations = [];
          for (const item of all.result) {
            if (item.dataURL instanceof Blob) {
              violations.push(`ts=${item.ts}: dataURL is a Blob (violation)`);
            }
            if (typeof item.dataURL !== 'string') {
              violations.push(`ts=${item.ts}: dataURL type=${typeof item.dataURL} (expected string)`);
            }
            if (item.dataURL && !item.dataURL.startsWith('data:')) {
              violations.push(`ts=${item.ts}: dataURL does not start with 'data:' (not a valid dataURL)`);
            }
          }
          resolve({ passed: violations.length === 0, violations });
        };
        all.onerror = () => reject(new Error('IDB getAll failed'));
      };
      req.onupgradeneeded = () => resolve({ passed: true, violations: [] });
    });
  });
}

module.exports = { readIDBQueue, assertNoBlobInQueue };
