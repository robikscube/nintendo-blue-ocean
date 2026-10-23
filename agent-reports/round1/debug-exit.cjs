const { chromium } = require('../../blue-ocean-game/node_modules/playwright')
;(async () => {
  const browser = await chromium.launch({ headless: true })
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
  console.log('before', await page.evaluate(() => {
    const p = document.querySelector('#dialogue-panel'); const s = getComputedStyle(p)
    return { hidden: p.hidden, display: s.display, visibility: s.visibility, opacity: s.opacity, classes: p.className }
  }))
  await page.evaluate(() => {
    window.__EXIT__ = []
    const p = document.querySelector('#dialogue-panel')
    const snap = (t) => {
      const s = getComputedStyle(p)
      window.__EXIT__.push({ t, hidden: p.hidden, classes: p.className, display: s.display, visibility: s.visibility, opacity: s.opacity, transform: s.transform, transition: s.transition, animation: s.animationName, anims: p.getAnimations().map(a => [a.playState, a.currentTime]) })
    }
    snap('pre')
    window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    snap('sync')
    requestAnimationFrame(() => snap('raf1'))
    setTimeout(() => snap('t50'), 50)
    setTimeout(() => snap('t110'), 110)
    setTimeout(() => snap('t180'), 180)
    setTimeout(() => snap('t260'), 260)
  })
  await page.waitForFunction(() => window.__EXIT__?.length >= 6, null, { timeout: 5000 })
  console.log(await page.evaluate(() => window.__EXIT__))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
