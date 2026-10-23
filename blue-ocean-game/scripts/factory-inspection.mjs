import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('qa-screens', { recursive: true })
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'no-preference',
})
const page = await context.newPage()
page.on('pageerror', (error) => console.log('PAGEERROR', error.message))
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__)
await page.evaluate(() => {
  const store = window.__GAME__.store
  store.dispatch({ type: 'START' })
  for (let guard = 0; guard < 20; guard += 1) {
    const state = store.state
    if (!['opening', 'advisors', 'feedback', 'boss'].includes(state.phase)) break
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }
  store.dispatch({ type: 'BEGIN_CHAPTER' })
  for (let guard = 0; guard < 20; guard += 1) {
    const state = store.state
    if (!['opening', 'advisors', 'feedback', 'boss'].includes(state.phase)) break
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }
  store.dispatch({ type: 'SELECT_CHOICE', choice: 'B' })
  store.dispatch({ type: 'COMMIT_CHOICE' })
})
await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'factory')
await page.waitForTimeout(800)
await page.screenshot({ path: 'qa-screens/factory-0.8s.png' })
await page.waitForTimeout(1400)
await page.screenshot({ path: 'qa-screens/factory-2.2s.png' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'qa-screens/factory-3.7s.png' })
await page.waitForTimeout(1800)
await page.screenshot({ path: 'qa-screens/factory-5.5s.png' })
await page.waitForTimeout(2200)
await page.screenshot({ path: 'qa-screens/factory-final.png' })
console.log(await page.evaluate(() => window.__GAME_STATE__))
console.log(await page.evaluate(() => window.__GAME__.scene.getDebugInfo()))
await browser.close()
