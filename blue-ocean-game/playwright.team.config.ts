import { defineConfig } from '@playwright/test'

/**
 * Durable runner for the independent team-authored classroom specs.
 * The default `playwright.config.ts` intentionally keeps `tests/e2e` fast;
 * this config adds the deeper branch/presenter/factory/WebGL sweep.
 *
 *   npm run test:e2e:team
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/team-*.spec.ts',
  // Keep artifacts isolated from the default and preview suites. Playwright
  // clears its outputDir at startup; a shared directory lets concurrent runs
  // delete each other's in-progress traces (browserContext.close ENOENT).
  outputDir: './test-results/team',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
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
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
