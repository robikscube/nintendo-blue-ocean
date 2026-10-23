import { chromium } from 'playwright'

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)
await page.getByRole('button', { name: /^Start$/i }).click()
await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')

const results = await page.evaluate(async () => {
  const store = window.__GAME__.store
  const panel = document.getElementById('dialogue-panel')
  store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  const lines = []
  for (let step = 0; step < 4; step += 1) {
    if (step > 0) store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    const startDeadline = performance.now() + 2000
    while (!panel.classList.contains('is-typing') && performance.now() < startDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    const started = performance.now()
    while (!panel.classList.contains('is-complete') && performance.now() - started < 25000) {
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    const accessible = document.getElementById('dialogue-accessible')?.textContent ?? ''
    const text = document.getElementById('dialogue-text')?.textContent ?? ''
    lines.push({
      speaker: accessible.split(':')[0] ?? '?',
      index: store.state.dialogueIndex,
      chars: text.length,
      ms: Math.round(performance.now() - started),
      complete: panel.classList.contains('is-complete'),
    })
  }
  return lines
})

console.log(JSON.stringify(results, null, 2))
await browser.close()
