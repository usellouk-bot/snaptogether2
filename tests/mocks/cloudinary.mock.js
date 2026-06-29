/**
 * MomenPix — Cloudinary Fetch Mock
 * tests/mocks/cloudinary.mock.js
 *
 * Used with Playwright page.route() to intercept calls to Cloudinary.
 * Does NOT mock Firebase — Firebase is not touched in Phase 1.
 *
 * Usage in spec:
 *   const { mockCloudinaryOK, mockCloudinaryFail } = require('../mocks/cloudinary.mock');
 *   await mockCloudinaryOK(page);   // all uploads succeed
 *   await mockCloudinaryFail(page); // all uploads return 500
 *
 * The route intercept pattern matches the Cloudinary upload endpoint.
 * CLOUD_NAME in production: dufzgvkzi
 */

const CLOUDINARY_URL_PATTERN = '**/upload/**';

/**
 * mockCloudinaryOK
 * Intercepts Cloudinary upload fetch — returns 200 with a fake secure_url.
 * Confirms: item removed from queue after successful upload.
 */
async function mockCloudinaryOK(page) {
  await page.route(CLOUDINARY_URL_PATTERN, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        secure_url: 'https://res.cloudinary.com/dufzgvkzi/image/upload/fake/sim-test.jpg',
        public_id: 'sim-test',
        format: 'jpg',
        width: 2560,
        height: 1920,
      }),
    });
  });
}

/**
 * mockCloudinaryFail
 * Intercepts Cloudinary upload fetch — returns 500 server error.
 * Confirms: item stays in IDB queue (not lost on failure).
 */
async function mockCloudinaryFail(page) {
  await page.route(CLOUDINARY_URL_PATTERN, route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Simulated server error' } }),
    });
  });
}

module.exports = { mockCloudinaryOK, mockCloudinaryFail };
