import { defineConfig } from '@playwright/test'

/**
 * Focused woodland-briefing geometry suite.
 *
 * Runs on its own port and output directory so it cannot attach to, restart,
 * or erase a lead/QA Playwright run that is using 5173 and test-results/*.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/woodland-briefing.spec.ts',
  outputDir: './test-results/woodland-briefing',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5183',
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
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
    command: 'npx vite --host 127.0.0.1 --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
