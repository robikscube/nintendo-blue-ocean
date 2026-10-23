import { defineConfig } from '@playwright/test'

/**
 * Isolated runner for the music-default-on regression spec. It uses port 5199
 * and its own artifact directory so it cannot collide with the UI lead (5173)
 * or QA (5188/4188) suites.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /music-default-on\.spec\.ts/,
  outputDir: './test-results/music-default-on',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'no-preference',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
