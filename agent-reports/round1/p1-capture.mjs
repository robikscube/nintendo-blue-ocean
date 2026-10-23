/** P1 one-off screenshot capture against the dev server with P2's landed CSS. */
import { createRequire } from 'node:module'
const require = createRequire('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/package.json')
const { chromium } = require('playwright')

const OUT = 'C:/Users/robwa/Desktop/Nintendo/agent-reports/round1'
function blockHmrSocket() {
  class NoSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    constructor(url) { this.url = String(url); this.readyState = 0 }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false }
    send() {}
    close() {}
  }
  window.WebSocket = NoSocket
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const results = []
try {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    await page.addInitScript(blockHmrSocket)
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 })
    await page.getByRole('button', { name: /Enter the boardroom/i }).click({ timeout: 30000 })
    await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening', null, { timeout: 10000 })
    await page.keyboard.press('Space')
    await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 1, null, { timeout: 5000 })
    await page.waitForFunction(() => {
      const panel = document.getElementById('dialogue-panel')
      return panel && panel.classList.contains('is-complete')
    }, null, { timeout: 5000 })
    const file = `${OUT}/p1-dialogue-${viewport.width}x${viewport.height}.png`
    await page.screenshot({ path: file, timeout: 120000, animations: 'disabled' })
    const info = await page.evaluate(() => ({
      speaker: document.getElementById('speaker-name')?.textContent,
      line: document.getElementById('dialogue-text')?.textContent,
      className: document.getElementById('dialogue-panel')?.className,
      width: window.innerWidth,
      height: window.innerHeight,
    }))
    results.push({ file, ...info })
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(results, null, 2))
