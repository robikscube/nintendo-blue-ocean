import { chromium } from 'file:///C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright/index.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errors = []
const consoleErrors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
await page.route('**/@vite/client*', (route) => route.abort())
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
console.log(JSON.stringify({
  ready: await page.evaluate(() => window.__GAME_READY__ === true),
  hasGame: await page.evaluate(() => Boolean(window.__GAME__)),
  title: await page.title(),
  errors,
  consoleErrors,
}, null, 2))
await browser.close()
