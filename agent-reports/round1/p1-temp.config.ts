import { defineConfig } from 'C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/@playwright/test/index.mjs'

// Temporary P1 evidence config for the adjusted interaction spec only.
// The real config and committed tests are untouched.
export default defineConfig({
  testDir: 'C:/Users/robwa/Desktop/Nintendo/agent-reports/round1',
  testMatch: 'p1-interactions-adjusted.spec.ts',
  outputDir: 'C:/Users/robwa/Desktop/Nintendo/agent-reports/round1/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
