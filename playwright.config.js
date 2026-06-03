// tests/smoke/playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://usellouk-bot.github.io/snaptogether2',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14 viewport
    ignoreHTTPSErrors: true,
    // Collect console messages
    bypassCSP: true,
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/smoke/report' }]],
});
