/* P2 metrics-only pass for the two projector sizes (no screenshots). */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('../../blue-ocean-game/node_modules/playwright')

const OUT = __dirname
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
]

async function waitComplete(page, speaker) {
  await page.waitForFunction((expected) => {
    const panel = document.querySelector('#dialogue-panel')
    const name = document.querySelector('#speaker-name')
    return panel instanceof HTMLElement && !panel.hidden
      && panel.classList.contains('is-complete')
      && (!expected || name?.textContent?.trim() === expected)
  }, speaker ?? null, { timeout: 15000 })
}

async function measure(page, viewport, label) {
  return page.evaluate(({ viewport, label }) => {
    const panel = document.querySelector('#dialogue-panel')
    const text = document.querySelector('#dialogue-text')
    const tag = document.querySelector('.dialogue-nameplate')
    const speaker = document.querySelector('#speaker-name')
    const button = document.querySelector('#dialogue-continue')
    const marker = document.querySelector('.continue-marker')
    const ps = getComputedStyle(panel)
    const ts = getComputedStyle(text)
    const ns = getComputedStyle(tag)
    const r = (node) => { const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height, bottom: b.bottom, right: b.right } }
    const pr = r(panel), tr = r(text), nr = r(tag)
    return {
      viewport,
      label,
      classes: panel.className,
      panel: { ...pr, borderWidth: ps.borderTopWidth, borderColor: ps.borderTopColor, borderRadius: ps.borderTopLeftRadius, backgroundImage: ps.backgroundImage, backdropFilter: ps.backdropFilter },
      text: { ...tr, fontSize: ts.fontSize, lineHeight: ts.lineHeight, fontFamily: ts.fontFamily, fontWeight: ts.fontWeight, color: ts.color, lines: Math.round(tr.height / parseFloat(ts.lineHeight)), scrollWidth: text.scrollWidth, clientWidth: text.clientWidth },
      nameplate: { ...nr, text: speaker.textContent, fontSize: ns.fontSize, color: ns.color, backgroundImage: ns.backgroundImage, gapToTextPx: tr.top - nr.bottom, overlapsFirstLine: nr.bottom > tr.top && nr.left < tr.right && nr.right > tr.left },
      button: { ...r(button) },
      marker: { ...r(marker), animationName: getComputedStyle(marker).animationName, opacity: getComputedStyle(marker).opacity },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      speakerVars: { color: panel.style.getPropertyValue('--speaker-color'), accent: panel.style.getPropertyValue('--speaker-accent') },
    }
  }, { viewport, label })
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const all = []
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
      await context.addInitScript(() => {
        const NativeWebSocket = window.WebSocket
        class SilentSocket extends EventTarget {
          constructor() { super(); this.readyState = 3; this.url = ''; this.protocol = ''; this.extensions = ''; this.binaryType = 'arraybuffer'; this.bufferedAmount = 0 }
          close() {} send() {}
        }
        window.WebSocket = new Proxy(NativeWebSocket, { construct(t, a) { const u = String(a[0] ?? ''); return u.includes('127.0.0.1:5173') ? new SilentSocket() : Reflect.construct(t, a) } })
      })
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', (error) => pageErrors.push(String(error)))
      await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 60000 })
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'START' }))
      await waitComplete(page, 'Boardroom')
      all.push({ ...(await measure(page, viewport, 'narrator')), pageErrors })
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitComplete(page, 'Chair Shell')
      all.push({ ...(await measure(page, viewport, 'shell')), pageErrors })
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitComplete(page, 'Mori')
      all.push({ ...(await measure(page, viewport, 'mori')), pageErrors })
      await page.evaluate(() => {
        const store = window.__GAME__.store
        while (store.state.phase === 'opening') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
        store.dispatch({ type: 'BEGIN_CHAPTER' })
        store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      })
      await waitComplete(page, 'Pip')
      all.push({ ...(await measure(page, viewport, 'pip')), pageErrors })
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitComplete(page, 'Grumble')
      all.push({ ...(await measure(page, viewport, 'grumble')), pageErrors })
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitComplete(page, 'Bolt')
      all.push({ ...(await measure(page, viewport, 'bolt')), pageErrors })
      await context.close()
    }
    fs.writeFileSync(path.join(OUT, 'dialogue-metrics-projector.json'), JSON.stringify({ generatedAt: new Date().toISOString(), all }, null, 2))
    console.log(JSON.stringify({ captures: all.length, output: path.join(OUT, 'dialogue-metrics-projector.json') }, null, 2))
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
