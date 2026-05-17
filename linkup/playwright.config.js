// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * LinkUp - Playwright End-to-End Test Configuration
 *
 * Runs against the locally-running Next.js dev server (npm run dev).
 * Set BASE_URL env to target a different host (e.g. staging).
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 90_000,          // 90s per test (gives Next.js plenty of time to compile on initial run)
  expect: { timeout: 20_000 },

  // Run tests sequentially so they don't fight over the same room
  workers: 1,
  fullyParallel: false,

  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Grant camera/microphone permissions so PreJoinScreen can access hardware
    permissions: ['camera', 'microphone'],

    // Fake media (no real camera needed in CI/headless)
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
      ],
    },

    // Keep browser visible when requested, but default to headless for reliable/fast programmatic runs
    headless: true,

    // Record a video of every test for review
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start the Next.js dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
