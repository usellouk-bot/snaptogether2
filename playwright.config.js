// playwright.config.js — MomenPix UI Tests
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/ui-results.json' }]],
  use: {
    baseURL: 'https://usellouk-bot.github.io/snaptogether2/',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
});
