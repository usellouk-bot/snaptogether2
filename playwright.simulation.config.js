// playwright.simulation.config.js — MomenPix Simulation Lab
//
// Runs ALL tests/simulation/**/*.spec.js (core + experimental)
// Does NOT affect playwright.config.js or existing ui.spec.js tests.
//
// Run all:
//   npx playwright test -c playwright.simulation.config.js
//
// Run core only:
//   npx playwright test tests/simulation/core/ -c playwright.simulation.config.js
//
// Run experimental only:
//   npx playwright test tests/simulation/experimental/ -c playwright.simulation.config.js

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/simulation',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  retries: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/simulation-results.json' }],
  ],
  use: {
    baseURL: 'https://usellouk-bot.github.io/snaptogether2/',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 60000,
    actionTimeout: 15000,
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  },
  projects: [
    {
      name: 'simulation-chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--disable-cache',
          ],
        },
      },
    },
  ],
});
