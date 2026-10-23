/* P2 interaction assertions for the redesigned dialogue bubble. Read-only app checks. */
const { chromium } = require('../../blue-ocean-game/node_modules/playwright')

const BASE = 'http://127.0.0.1:5173/'

async function setupPage(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...options })
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
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 60000 })
  return { context, page, pageErrors }
}

const dispatch = (type) => window.__GAME__.store.dispatch({ type })
const isComplete = () => {
  const panel = document.querySelector('#dialogue-panel')
  return panel && !panel.hidden && panel.classList.contains('is-complete')
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const results = {}
  try {
    {
      const { context, page, pageErrors } = await setupPage(browser)
      await page.evaluate(dispatch, 'START')
      await page.waitForFunction(isComplete, null, { timeout: 5000 })
      results.initial = await page.evaluate(() => {
        const panel = document.querySelector('#dialogue-panel')
        const style = getComputedStyle(panel)
        const legacy = document.querySelectorAll([
          '.dialogue-speaker',
          '.speaker-ring',
          '.speaker-species',
          '.dialogue-heading',
          '.speaker-role',
          '.dialogue-phase-label',
          '.dialogue-progress',
        ].join(','))
        return {
          hidden: panel.hidden,
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          legacyHudNodes: legacy.length,
          accessible: document.querySelector('#dialogue-accessible').textContent,
          markerAnimation: getComputedStyle(document.querySelector('.continue-marker')).animationName,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        }
      })

      // Button focus ring is visible and the hit target meets 44 px.
      await page.locator('#dialogue-continue').focus()
      const focusState = await page.evaluate(() => {
        const button = document.querySelector('#dialogue-continue')
        const style = getComputedStyle(button)
        const rect = button.getBoundingClientRect()
        return {
          activeElement: document.activeElement?.id,
          focusVisible: button.matches(':focus-visible'),
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          width: rect.width,
          height: rect.height,
        }
      })

      // Keyboard: complete-while-typing must not skip a speaker, and a second
      // deliberate press must advance exactly one line. The button is focused
      // before the line starts so focus latency cannot eat the reveal window.
      const beforeAdvance = Date.now()
      await page.evaluate(dispatch, 'ADVANCE_DIALOGUE')
      await page.waitForTimeout(25)
      const typingBeforeKey = await page.evaluate(() => {
        const panel = document.querySelector('#dialogue-panel')
        const marker = document.querySelector('.continue-marker')
        return {
          speaker: document.querySelector('#speaker-name').textContent,
          typing: panel.classList.contains('is-typing'),
          complete: panel.classList.contains('is-complete'),
          markerAnimation: getComputedStyle(marker).animationName,
          markerOpacity: getComputedStyle(marker).opacity,
        }
      })
      const pressStartedAt = Date.now()
      await page.keyboard.press('Space')
      const pressReturnedAt = Date.now()
      await page.waitForTimeout(100)
      const afterFirstSpace = await page.evaluate(() => ({
        speaker: document.querySelector('#speaker-name').textContent,
        typing: document.querySelector('#dialogue-panel').classList.contains('is-typing'),
        complete: document.querySelector('#dialogue-panel').classList.contains('is-complete'),
        dialogueIndex: window.__GAME_STATE__.dialogueIndex,
        phase: window.__GAME_STATE__.phase,
      }))
      await page.waitForTimeout(160)
      await page.keyboard.press('Space')
      await page.waitForTimeout(180)
      const afterSecondSpace = await page.evaluate(() => ({
        speaker: document.querySelector('#speaker-name').textContent,
        dialogueIndex: window.__GAME_STATE__.dialogueIndex,
        phase: window.__GAME_STATE__.phase,
      }))

      // Full bubble click still advances (delegated handler), not just the marker.
      await page.waitForFunction(isComplete, null, { timeout: 5000 })
      await page.waitForTimeout(180)
      await page.locator('#dialogue-panel').click({ position: { x: 80, y: 40 } })
      await page.waitForTimeout(180)
      const afterBubbleClick = await page.evaluate(() => ({
        speaker: document.querySelector('#speaker-name').textContent,
        dialogueIndex: window.__GAME_STATE__.dialogueIndex,
        phase: window.__GAME_STATE__.phase,
      }))

      // Drive to the end of the opening; hiding the panel should leave a short
      // fade-out before visibility flips, without pointer interaction.
      await page.evaluate(() => {
        const store = window.__GAME__.store
        for (let i = 0; i < 12 && store.state.phase === 'opening'; i += 1) {
          store.dispatch({ type: 'ADVANCE_DIALOGUE' })
        }
      })
      const exitImmediate = await page.evaluate(() => {
        const panel = document.querySelector('#dialogue-panel')
        const style = getComputedStyle(panel)
        return {
          hiddenAttribute: panel.hidden,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          transitionDuration: style.transitionDuration,
          pointerEvents: style.pointerEvents,
          phase: window.__GAME_STATE__.phase,
        }
      })
      await page.waitForTimeout(100)
      const exitMid = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('#dialogue-panel'))
        return { visibility: style.visibility, opacity: style.opacity }
      })
      await page.waitForTimeout(260)
      const exitEnd = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('#dialogue-panel'))
        return { visibility: style.visibility, opacity: style.opacity }
      })

      results.keyboard = {
        timing: {
          dispatchToTypingSnapshotMs: pressStartedAt - beforeAdvance,
          spacePressMs: pressReturnedAt - pressStartedAt,
        },
        typingBeforeKey,
        afterFirstSpace,
        afterSecondSpace,
        afterBubbleClick,
      }
      results.focusState = focusState
      results.exit = { exitImmediate, exitMid, exitEnd }
      results.pageErrors = pageErrors
      await context.close()
    }

    {
      // Reduced motion: no long reveal and no visible pulse animation.
      const { context, page, pageErrors } = await setupPage(browser, { reducedMotion: 'reduce' })
      await page.evaluate(dispatch, 'START')
      await page.waitForFunction(isComplete, null, { timeout: 1500 })
      await page.evaluate(dispatch, 'ADVANCE_DIALOGUE')
      await page.waitForTimeout(80)
      results.reducedMotion = await page.evaluate(() => ({
        typing: document.querySelector('#dialogue-panel').classList.contains('is-typing'),
        complete: document.querySelector('#dialogue-panel').classList.contains('is-complete'),
        markerAnimationName: getComputedStyle(document.querySelector('.continue-marker')).animationName,
        markerAnimationDuration: getComputedStyle(document.querySelector('.continue-marker')).animationDuration,
        text: document.querySelector('#dialogue-text').textContent,
        accessible: document.querySelector('#dialogue-accessible').textContent,
      }))
      results.reducedMotion.pageErrors = pageErrors
      await context.close()
    }

    console.log(JSON.stringify(results, null, 2))
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
