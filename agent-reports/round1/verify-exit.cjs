/* P2 exit verification. The headless renderer on this machine is frame-starved
   (2-3 rAF ticks / 500 ms), so this test slows only the transition and the
   test-owned hide timer to observe intermediate fade frames. Product CSS stays
   at 210 ms; the script records the unmodified computed duration too. */
const path = require('node:path')
const { chromium } = require('../../blue-ocean-game/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  await context.addInitScript(() => {
    const NativeWebSocket = window.WebSocket
    class SilentSocket extends EventTarget {
      constructor() { super(); this.readyState = 3; this.url = ''; this.protocol = ''; this.extensions = ''; this.binaryType = 'arraybuffer'; this.bufferedAmount = 0 }
      close() {} send() {}
    }
    window.WebSocket = new Proxy(NativeWebSocket, { construct(t, a) { const u = String(a[0] ?? ''); return u.includes('127.0.0.1:5173') ? new SilentSocket() : Reflect.construct(t, a) } })
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 60000 })
  await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'START' }))
  await page.waitForFunction(() => document.querySelector('#dialogue-panel').classList.contains('is-complete'))
  await page.evaluate(() => {
    const store = window.__GAME__.store
    while (store.state.phase === 'opening' && store.state.dialogueIndex < 3) {
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
  })
  await page.waitForFunction(() => document.querySelector('#dialogue-panel').classList.contains('is-complete'))
  await page.waitForTimeout(300)

  const actual = await page.evaluate(() => {
    const panel = document.querySelector('#dialogue-panel')
    panel.classList.add('is-leaving')
    const duration = getComputedStyle(panel).transitionDuration
    panel.classList.remove('is-leaving')
    return duration
  })

  await page.addStyleTag({ content: '.dialogue-panel.is-leaving { transition-duration: 12000ms !important; }' })
  await page.evaluate(() => {
    const original = window.setTimeout
    window.setTimeout = (callback, delay, ...args) => original(callback, delay === 210 ? 30000 : delay, ...args)
  })

  const outputDir = __dirname
  await page.screenshot({ path: path.join(outputDir, 'dialogue-exit-before.png') })
  await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(outputDir, 'dialogue-exit-mid.png') })
  const mid = await page.evaluate(() => {
    const panel = document.querySelector('#dialogue-panel')
    const style = getComputedStyle(panel)
    return { hidden: panel.hidden, classes: panel.className, opacity: style.opacity, transform: style.transform, transitionDuration: style.transitionDuration }
  })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: path.join(outputDir, 'dialogue-exit-mid2.png') })
  const mid2 = await page.evaluate(() => {
    const panel = document.querySelector('#dialogue-panel')
    const style = getComputedStyle(panel)
    return { hidden: panel.hidden, classes: panel.className, opacity: style.opacity, transform: style.transform }
  })
  await page.waitForTimeout(5000)
  await page.screenshot({ path: path.join(outputDir, 'dialogue-exit-end.png') })
  const end = await page.evaluate(() => {
    const panel = document.querySelector('#dialogue-panel')
    const style = getComputedStyle(panel)
    return { hidden: panel.hidden, classes: panel.className, opacity: style.opacity, transform: style.transform }
  })
  console.log(JSON.stringify({ actualComputedTransitionDuration: actual, slowedForFrameStarvedHeadless: '12000ms', mid, mid2, end }, null, 2))
  await browser.close()
})().catch((error) => { console.error(error); process.exit(1) })
