const { chromium } = require('../../blue-ocean-game/node_modules/playwright')
const BASE = 'http://127.0.0.1:5173/'
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  await context.addInitScript(() => {
    const NativeWebSocket = window.WebSocket
    class SilentSocket extends EventTarget {
      constructor() { super(); this.readyState = 3; this.url = ''; this.protocol = ''; this.extensions = ''; this.binaryType = 'arraybuffer'; this.bufferedAmount = 0 }
      close() {} send() {}
    }
    window.WebSocket = new Proxy(NativeWebSocket, {
      construct(target, args) {
        const url = String(args[0] ?? '')
        if (url.includes('127.0.0.1:5173')) return new SilentSocket()
        return Reflect.construct(target, args)
      },
    })
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 60000 })
  await page.evaluate(() => {
    window.__EVENTS__ = []
    window.__GAME__.store.subscribe((s, p) => {
      window.__EVENTS__.push({ type: 'state', phase: s.phase, index: s.dialogueIndex, prev: p.dialogueIndex })
    })
    document.addEventListener('keydown', (e) => window.__EVENTS__.push({ type: 'keydown', key: e.key, target: e.target?.id || e.target?.tagName }), true)
    document.addEventListener('keyup', (e) => window.__EVENTS__.push({ type: 'keyup', key: e.key, target: e.target?.id || e.target?.tagName }), true)
    document.addEventListener('click', (e) => window.__EVENTS__.push({ type: 'click', target: e.target?.id || e.target?.className || e.target?.tagName }), true)
  })
  await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'START' }))
  await page.waitForFunction(() => document.querySelector('#dialogue-panel').classList.contains('is-complete'))
  await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
  await page.waitForTimeout(80)
  console.log('before', await page.evaluate(() => ({
    state: window.__GAME_STATE__,
    active: document.activeElement?.id || document.activeElement?.tagName,
    classes: document.querySelector('#dialogue-panel').className,
  })))
  await page.locator('#dialogue-continue').focus()
  console.log('focused', await page.evaluate(() => ({
    active: document.activeElement?.id || document.activeElement?.tagName,
    focusVisible: document.querySelector('#dialogue-continue').matches(':focus-visible'),
  })))
  await page.keyboard.press('Space')
  await page.waitForTimeout(100)
  console.log('after100', await page.evaluate(() => ({
    state: window.__GAME_STATE__,
    active: document.activeElement?.id || document.activeElement?.tagName,
    classes: document.querySelector('#dialogue-panel').className,
    events: window.__EVENTS__,
  })))
  await page.waitForTimeout(100)
  console.log('after200', await page.evaluate(() => ({
    state: window.__GAME_STATE__,
    classes: document.querySelector('#dialogue-panel').className,
    events: window.__EVENTS__,
  })))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
