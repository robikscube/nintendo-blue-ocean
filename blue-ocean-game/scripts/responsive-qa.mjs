import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('qa-screens', { recursive: true })
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'reduce',
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__)
await page.waitForTimeout(500)
await page.locator('#presenter-button').click()
await page.waitForTimeout(250)
await page.screenshot({ path: 'qa-screens/16-presenter-drawer.png' })
await page.keyboard.press('Escape')

await page.evaluate(() => {
  const store = window.__GAME__.store
  store.dispatch({ type: 'START' })
  const dialoguePhases = new Set(['opening', 'advisors', 'feedback', 'boss'])
  for (let guard = 0; guard < 30; guard += 1) {
    if (!dialoguePhases.has(store.state.phase)) break
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }
  store.dispatch({ type: 'BEGIN_CHAPTER' })
  for (let guard = 0; guard < 30; guard += 1) {
    if (!dialoguePhases.has(store.state.phase)) break
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }
})
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-screens/17-vote-1920.png' })

async function measureFps(label) {
  const result = await page.evaluate(async () => {
    let frames = 0
    const start = performance.now()
    await new Promise((resolve) => {
      const frame = () => {
        frames += 1
        if (performance.now() - start >= 2500) resolve()
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    return {
      frames,
      seconds: (performance.now() - start) / 1000,
      info: window.__GAME__.scene?.getDebugInfo() ?? null,
    }
  })
  console.log(label, {
    fps: (result.frames / result.seconds).toFixed(1),
    ...result.info,
  })
}
await measureFps('boardroom')

await page.setViewportSize({ width: 1366, height: 768 })
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-screens/18-vote-1366.png' })
await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'JUMP_CHAPTER', chapterIndex: 0 }))
await page.waitForTimeout(250)
await page.screenshot({ path: 'qa-screens/19-briefing-1366.png' })
await page.locator('#presenter-button').click()
await page.waitForTimeout(250)
await page.screenshot({ path: 'qa-screens/20-presenter-1366.png' })
await page.keyboard.press('Escape')
await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'RESET' }))
await page.waitForTimeout(200)
await page.screenshot({ path: 'qa-screens/21-title-1366.png' })

await page.setViewportSize({ width: 1920, height: 1080 })
await page.waitForTimeout(200)
await page.evaluate(() => {
  const store = window.__GAME__.store
  store.dispatch({ type: 'START' })
  const dialoguePhases = new Set(['opening', 'advisors', 'feedback', 'boss'])
  for (let guard = 0; guard < 30; guard += 1) {
    if (!dialoguePhases.has(store.state.phase)) break
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }
  store.dispatch({ type: 'BEGIN_CHAPTER' })
  for (let guard = 0; guard < 30; guard += 1) {
    if (!dialoguePhases.has(store.state.phase)) break
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }
  store.dispatch({ type: 'SELECT_CHOICE', choice: 'A' })
  store.dispatch({ type: 'COMMIT_CHOICE' })
})
await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'factory')
await page.waitForTimeout(3500)
console.log('factory state', await page.evaluate(() => window.__GAME_STATE__))
await measureFps('factory')
await page.screenshot({ path: 'qa-screens/22-factory-1920.png' })
console.log('errors', errors)
await browser.close()
