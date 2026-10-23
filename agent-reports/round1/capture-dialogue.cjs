/* P2 focused dialogue visual checks. Reuses the dev server on 127.0.0.1:5173. */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('../../blue-ocean-game/node_modules/playwright')

const OUT = __dirname
const BASE = 'http://127.0.0.1:5173/'
const ALL_VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
]
const VIEWPORTS = process.env.P2_VIEWPORT
  ? ALL_VIEWPORTS.filter((viewport) => viewport.name === process.env.P2_VIEWPORT)
  : ALL_VIEWPORTS

async function waitComplete(page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('#dialogue-panel')
    return panel instanceof HTMLElement && !panel.hidden && panel.classList.contains('is-complete')
  }, null, { timeout: 5000 })
}

async function waitSpeaker(page, speaker) {
  await page.waitForFunction((expected) => {
    const panel = document.querySelector('#dialogue-panel')
    const name = document.querySelector('#speaker-name')
    return panel instanceof HTMLElement
      && !panel.hidden
      && panel.classList.contains('is-complete')
      && name?.textContent?.trim() === expected
  }, speaker, { timeout: 5000 })
}

async function collect(page, viewport, label) {
  return page.evaluate(({ viewport, label }) => {
    const panel = document.querySelector('#dialogue-panel')
    const copy = document.querySelector('.dialogue-copy')
    const text = document.querySelector('#dialogue-text')
    const nameplate = document.querySelector('.dialogue-nameplate')
    const speaker = document.querySelector('#speaker-name')
    const button = document.querySelector('#dialogue-continue')
    const marker = document.querySelector('.continue-marker')
    const shortcut = document.querySelector('.dialogue-shortcut')
    if (!(panel && copy && text && nameplate && speaker && button && marker && shortcut)) {
      throw new Error('Dialogue contract nodes missing')
    }
    const rect = (node) => {
      const r = node.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
    }
    const panelStyle = getComputedStyle(panel)
    const textStyle = getComputedStyle(text)
    const tagStyle = getComputedStyle(nameplate)
    const markerStyle = getComputedStyle(marker)
    const buttonStyle = getComputedStyle(button)
    const textRect = rect(text)
    const tagRect = rect(nameplate)
    const horizontalTagOverlap = tagRect.left < textRect.right && tagRect.right > textRect.left
    return {
      viewport,
      label,
      classes: panel.className,
      panel: {
        ...rect(panel),
        borderWidth: panelStyle.borderTopWidth,
        borderColor: panelStyle.borderTopColor,
        borderRadius: panelStyle.borderTopLeftRadius,
        backgroundImage: panelStyle.backgroundImage,
        backgroundColor: panelStyle.backgroundColor,
        backdropFilter: panelStyle.backdropFilter,
        opacity: panelStyle.opacity,
      },
      copy: rect(copy),
      text: {
        ...textRect,
        value: text.textContent,
        fontSize: textStyle.fontSize,
        lineHeight: textStyle.lineHeight,
        fontFamily: textStyle.fontFamily,
        fontWeight: textStyle.fontWeight,
        color: textStyle.color,
        clientWidth: text.clientWidth,
        scrollWidth: text.scrollWidth,
        clientHeight: text.clientHeight,
        scrollHeight: text.scrollHeight,
        lineCountEstimate: Math.round(text.getBoundingClientRect().height / parseFloat(textStyle.lineHeight)),
      },
      nameplate: {
        ...tagRect,
        text: speaker.textContent,
        fontSize: tagStyle.fontSize,
        color: tagStyle.color,
        backgroundImage: tagStyle.backgroundImage,
        borderColor: tagStyle.borderTopColor,
        overlapsFirstLine: horizontalTagOverlap && tagRect.bottom > textRect.top,
        gapToTextPx: textRect.top - tagRect.bottom,
        withinPanelLeft: tagRect.left - rect(panel).left,
        withinPanelRight: rect(panel).right - tagRect.right,
      },
      continueButton: {
        ...rect(button),
        focusVisible: button.matches(':focus-visible'),
        outlineWidth: buttonStyle.outlineWidth,
        outlineColor: buttonStyle.outlineColor,
      },
      marker: {
        ...rect(marker),
        opacity: markerStyle.opacity,
        animationName: markerStyle.animationName,
        animationDuration: markerStyle.animationDuration,
        backgroundImage: markerStyle.backgroundImage,
      },
      shortcut: {
        ...rect(shortcut),
        text: shortcut.textContent,
        display: getComputedStyle(shortcut).display,
        opacity: getComputedStyle(shortcut).opacity,
      },
      scroll: {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      },
      speakerVars: {
        color: panel.style.getPropertyValue('--speaker-color'),
        accent: panel.style.getPropertyValue('--speaker-accent'),
      },
    }
  }, { viewport, label })
}

async function drive(page, callback) {
  await page.evaluate(callback)
  await page.waitForTimeout(60)
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const all = []
  const typingChecks = []
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
      // Other teammates are editing scene files during this run. Keep the Vite
      // client (it injects CSS) but stub its HMR websocket so no unrelated
      // hot reload destroys the page mid-capture.
      await context.addInitScript(() => {
        const NativeWebSocket = window.WebSocket
        class SilentSocket extends EventTarget {
          constructor() {
            super()
            this.binaryType = 'arraybuffer'
            this.bufferedAmount = 0
            this.extensions = ''
            this.protocol = ''
            this.readyState = 3
            this.url = ''
          }
          close() {}
          send() {}
        }
        window.WebSocket = new Proxy(NativeWebSocket, {
          construct(target, args) {
            const url = String(args[0] ?? '')
            if (url.includes('127.0.0.1:5173') || url.includes('localhost:5173')) {
              return new SilentSocket()
            }
            return Reflect.construct(target, args)
          },
        })
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(String(error)))
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 60000 })
      await page.waitForTimeout(700)

      await drive(page, () => window.__GAME__.store.dispatch({ type: 'START' }))
      await waitComplete(page)
      await page.waitForTimeout(900)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-narrator-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'narrator')), pageErrors: errors })

      // Advance to Shell.
      await drive(page, () => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitComplete(page)
      await page.waitForTimeout(900)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-shell-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'shell')), pageErrors: errors })

      // Catch the next line while it is actually typing, before completion.
      await drive(page, () => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      const typing = await page.evaluate(() => {
        const panel = document.querySelector('#dialogue-panel')
        const marker = document.querySelector('.continue-marker')
        return {
          classes: panel.className,
          isTyping: panel.classList.contains('is-typing'),
          isComplete: panel.classList.contains('is-complete'),
          markerAnimation: getComputedStyle(marker).animationName,
          markerOpacity: getComputedStyle(marker).opacity,
        }
      })
      typingChecks.push({ viewport: viewport.name, line: 'mori-opening', ...typing })
      await waitComplete(page)
      await page.waitForTimeout(900)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-mori-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'mori')), pageErrors: errors })

      // Focus state for keyboard operability (keyboard-modality focus).
      await page.locator('#dialogue-continue').focus()
      const focusVisible = await page.evaluate(() => document.activeElement?.matches(':focus-visible') ?? false)
      if (!focusVisible) await page.keyboard.press('Tab')
      await page.waitForTimeout(80)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-focus-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'focus')), pageErrors: errors, focusVisible })

      // Leave keyboard focus on the game, not on the decorative continue marker,
      // for the remaining presenter-view captures.
      await page.evaluate(() => document.activeElement?.blur())

      // Finish opening, enter chapter 1 advisor dialogue, then capture the
      // current authored order: Pip, Grumble, Bolt (Mori was captured above).
      await page.evaluate(() => {
        const store = window.__GAME__.store
        for (let i = 0; i < 12 && store.state.phase === 'opening'; i += 1) {
          store.dispatch({ type: 'ADVANCE_DIALOGUE' })
        }
        store.dispatch({ type: 'BEGIN_CHAPTER' })
        store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      })
      await waitSpeaker(page, 'Pip')
      await page.waitForTimeout(900)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-pip-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'pip')), pageErrors: errors })

      await drive(page, () => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitSpeaker(page, 'Grumble')
      await page.waitForTimeout(900)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-grumble-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'grumble')), pageErrors: errors })

      await drive(page, () => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
      await waitSpeaker(page, 'Bolt')
      await page.waitForTimeout(900)
      await page.screenshot({ timeout: 90000, path: path.join(OUT, `dialogue-bolt-${viewport.name}.png`) })
      all.push({ ...(await collect(page, viewport, 'bolt')), pageErrors: errors })

      await context.close()
    }
    const output = { generatedAt: new Date().toISOString(), base: BASE, all, typingChecks }
    fs.writeFileSync(path.join(OUT, 'dialogue-metrics.json'), JSON.stringify(output, null, 2))
    console.log(JSON.stringify({ captures: all.length, typingChecks, output: path.join(OUT, 'dialogue-metrics.json') }, null, 2))
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
