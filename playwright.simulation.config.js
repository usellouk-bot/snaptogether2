// playwright.simulation.config.js — MomenPix Simulation Lab (Phase 1)
//
// Runs ONLY tests/simulation/**/*.spec.js
// Does NOT affect playwright.config.js or existing ui.spec.js tests.
//
// Run:
//   npx playwright test -c playwright.simulation.config.js
//
// Flags:
//   --use-fake-device-for-media-stream  fake camera/mic (no real hardware needed)
//   --use-fake-ui-for-media-stream      auto-accepts getUserMedia permission dialogs
//
// Phase 1 scope: MVP-01, MVP-02, MVP-03, MVP-04
// UX-001 scope: SIM-UX-01 through SIM-UX-13
// Phase 2 (Firebase Emulator): MVP-05, MVP-06, MVP-07 — not active yet

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
