import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/tests/e2e',
  // Isolated from the dev and team suites (see playwright.team.config.ts).
  outputDir: './test-results/preview',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
