/**
 * P1 one-off browser measurement for the rapid dialogue reveal.
 * Not a committed test. Run while the dev server is on 127.0.0.1:5173:
 *   node agent-reports/round1/p1-dialogue-measure.mjs
 *
 * WebGL is disabled so the measurement exercises the real DOM/UI/store/audio
 * code without competing with other teammates' SwiftShader screenshot probes.
 * The app's documented story-mode fallback is the same dialogue implementation.
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'

const require = createRequire('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/package.json')
const { chromium } = require('playwright')

const URL = 'http://127.0.0.1:5173/'
const OUT = 'C:/Users/robwa/Desktop/Nintendo/agent-reports/round1'
mkdirSync(OUT, { recursive: true })

const result = {
  generatedAt: new Date().toISOString(),
  url: URL,
  mode: 'story-mode fallback (WebGL disabled in the measurement browser)',
  viewports: [],
  reducedMotion: null,
  interaction: null,
  pageErrors: [],
  screenshots: [],
  fatal: null,
}

const DIALOGUE_PHASES = new Set(['opening', 'advisors', 'feedback', 'boss'])
const isDialogue = (phase) => DIALOGUE_PHASES.has(phase)

// Teammates are editing source while this runs. Vite's HMR client would
// otherwise full-reload the page on a non-CSS edit and invalidate a sample.
function blockHmrSocket() {
  class NoSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    constructor(url) {
      this.url = String(url)
      this.readyState = 0
      this.binaryType = 'blob'
      this.bufferedAmount = 0
      this.extensions = ''
      this.protocol = ''
      this.onopen = null
      this.onmessage = null
      this.onerror = null
      this.onclose = null
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false }
    send() {}
    close() {}
  }
  window.WebSocket = NoSocket
}

function disableWebGL() {
  const original = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
    return original.call(this, type, ...args)
  }
}

function instrumentAudio() {
  window.__OSC_STARTS__ = 0
  const proto = window.AudioContext && window.AudioContext.prototype
  if (proto && proto.createOscillator && !proto.__p1Patched) {
    const original = proto.createOscillator
    proto.createOscillator = function patchedCreateOscillator(...args) {
      const oscillator = original.apply(this, args)
      const start = oscillator.start.bind(oscillator)
      oscillator.start = (...startArgs) => {
        window.__OSC_STARTS__ += 1
        return start(...startArgs)
      }
      return oscillator
    }
    proto.__p1Patched = true
  }
}

const sleep = (page, ms) => page.waitForTimeout(ms)
const stateOf = (page) => page.evaluate(() => window.__GAME_STATE__)
const oscillatorCount = (page) => page.evaluate(() => window.__OSC_STARTS__ ?? -1)
const blipCount = (page) => page.evaluate(() => window.__BLIP_CALLS__?.count ?? -1)

async function preparePage(browser, viewport, reducedMotion, label) {
  const context = await browser.newContext({ viewport, reducedMotion })
  const page = await context.newPage()
  await page.addInitScript(blockHmrSocket)
  await page.addInitScript(disableWebGL)
  await page.addInitScript(instrumentAudio)
  page.on('pageerror', (error) => result.pageErrors.push(`${label}: ${error.message}`))
  return { context, page }
}

async function startGame(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 })
  await page.evaluate(() => {
    const audio = window.__GAME__.audio
    window.__BLIP_CALLS__ = { count: 0, times: [] }
    const original = audio.blip.bind(audio)
    audio.blip = (speaker) => {
      window.__BLIP_CALLS__.count += 1
      window.__BLIP_CALLS__.times.push(performance.now())
      return original(speaker)
    }
    const store = window.__GAME__.store
    window.__ADVANCES__ = []
    const originalDispatch = store.dispatch.bind(store)
    store.dispatch = (action) => {
      if (action && action.type === 'ADVANCE_DIALOGUE') window.__ADVANCES__.push(performance.now())
      return originalDispatch(action)
    }
    window.__CLICKS__ = []
    document.addEventListener('click', (event) => {
      window.__CLICKS__.push({
        at: performance.now(),
        detail: event.detail,
        target: event.target instanceof Element ? (event.target.id || event.target.className) : '',
      })
    }, true)
  })
  try {
    await page.getByRole('button', { name: /Enter the boardroom/i }).click({ timeout: 15000 })
  } catch (error) {
    console.error(`[p1] start button click failed (${error.message}); dispatching START directly`)
    await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'START' }))
  }
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening', null, { timeout: 10000 })
  await page.waitForSelector('#dialogue-panel:not([hidden])', { timeout: 10000 })
}

async function installRecorder(page) {
  await page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    const text = document.getElementById('dialogue-text')
    const previous = window.__lineMeasure
    if (previous?.observer) previous.observer.disconnect()
    const measure = {
      start: null,
      end: null,
      durationMs: null,
      charsAtEnd: 0,
      fullText: '',
      textMatches: false,
      oscStart: window.__OSC_STARTS__ ?? -1,
      observer: null,
    }
    window.__lineMeasure = measure
    const check = () => {
      const typing = panel.classList.contains('is-typing')
      const complete = panel.classList.contains('is-complete')
      if (measure.start === null && typing) measure.start = performance.now()
      if (measure.start !== null && measure.end === null && complete) {
        measure.end = performance.now()
        measure.durationMs = measure.end - measure.start
        const shown = text.textContent
        measure.charsAtEnd = shown.length
        measure.fullText = document.getElementById('dialogue-accessible').textContent
        measure.textMatches = shown.length > 0 && measure.fullText.endsWith(shown)
      }
    }
    measure.observer = new MutationObserver(check)
    measure.observer.observe(panel, { attributes: true, attributeFilter: ['class', 'aria-busy'] })
    measure.observer.observe(text, { childList: true, characterData: true, subtree: true })
    check()
  })
}

async function recorderResult(page) {
  return page.evaluate(() => {
    const measure = window.__lineMeasure
    return {
      start: measure?.start ?? null,
      end: measure?.end ?? null,
      durationMs: measure?.durationMs ?? null,
      charsAtEnd: measure?.charsAtEnd ?? 0,
      fullText: measure?.fullText ?? '',
      textMatches: measure?.textMatches ?? false,
      oscStart: measure?.oscStart ?? -1,
    }
  })
}

async function panelSnapshot(page) {
  return page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    const text = document.getElementById('dialogue-text')
    const accessible = document.getElementById('dialogue-accessible')
    const after = getComputedStyle(text, '::after')
    return {
      hidden: panel.hidden,
      className: panel.className,
      isTyping: panel.classList.contains('is-typing'),
      isComplete: panel.classList.contains('is-complete'),
      isNarrator: panel.classList.contains('is-narrator'),
      ariaBusy: panel.getAttribute('aria-busy'),
      speaker: document.getElementById('speaker-name')?.textContent ?? '',
      shown: text.textContent ?? '',
      accessible: accessible.textContent ?? '',
      caretContent: after.content,
      caretDisplay: after.display,
      speakerColor: panel.style.getPropertyValue('--speaker-color'),
      speakerAccent: panel.style.getPropertyValue('--speaker-accent'),
    }
  })
}

async function blurActive(page) {
  await page.evaluate(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  })
}

async function pressSpace(page) {
  await blurActive(page)
  await page.keyboard.press('Space')
}

async function waitForCurrentLineComplete(page) {
  await page.waitForFunction(() => {
    const panel = document.getElementById('dialogue-panel')
    return panel && panel.classList.contains('is-complete') && !panel.classList.contains('is-typing')
  }, null, { timeout: 10000 })
}

async function waitForStateChange(page, beforeKey, timeout = 6000) {
  return page.waitForFunction(
    (key) => {
      const state = window.__GAME_STATE__
      if (!state) return false
      if (!['opening', 'advisors', 'feedback', 'boss'].includes(state.phase)) return true
      return `${state.phase}:${state.dialogueIndex}` !== key
    },
    beforeKey,
    { timeout },
  ).then(() => true, () => false)
}

async function driveToNextDialogue(page) {
  for (let guard = 0; guard < 15; guard += 1) {
    const state = await stateOf(page)
    if (isDialogue(state.phase)) return { state, recorderArmed: false }
    if (state.phase === 'briefing') {
      await installRecorder(page)
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'BEGIN_CHAPTER' }))
      await page.waitForFunction(() => {
        const state = window.__GAME_STATE__
        return state && ['opening', 'advisors', 'feedback', 'boss'].includes(state.phase)
      }, null, { timeout: 8000 })
      return { state: await stateOf(page), recorderArmed: true }
    }
    if (state.phase === 'voting') {
      await page.evaluate(() => {
        const store = window.__GAME__.store
        if (store.state.phase !== 'voting') return
        if (!store.state.selectedChoice) store.dispatch({ type: 'SELECT_CHOICE', choice: 'B' })
        store.dispatch({ type: 'COMMIT_CHOICE' })
      })
      continue
    }
    if (state.phase === 'factory') {
      const ready = await page.evaluate(() => {
        const store = window.__GAME__.store
        if (store.state.phase !== 'factory') return false
        if (store.state.factoryProgress === 'idle') store.dispatch({ type: 'FACTORY_STARTED' })
        if (store.state.factoryProgress === 'running') store.dispatch({ type: 'FACTORY_FINISHED' })
        return store.state.factoryProgress === 'done'
      })
      if (!ready) continue
      await installRecorder(page)
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'LEAVE_FACTORY' }))
      await page.waitForFunction(() => {
        const state = window.__GAME_STATE__
        return state && ['opening', 'advisors', 'feedback', 'boss'].includes(state.phase)
      }, null, { timeout: 8000 })
      return { state: await stateOf(page), recorderArmed: true }
    }
    if (state.phase === 'transition') {
      await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'COMPLETE_TRANSITION' }))
      continue
    }
    break
  }
  return { state: await stateOf(page), recorderArmed: false }
}

async function collectCompletedLine(page, panelAtEntry) {
  if (panelAtEntry.isNarrator) {
    const panel = panelAtEntry
    return {
      kind: 'narrator',
      panel,
      immediate: {
        isComplete: panel.isComplete,
        isTyping: panel.isTyping,
        ariaBusy: panel.ariaBusy,
        shownLength: panel.shown.length,
        accessibleLength: panel.accessible.length,
        textMatches: panel.accessible.endsWith(panel.shown),
      },
    }
  }
  await page.waitForFunction(() => window.__lineMeasure?.end !== null, null, { timeout: 10000 })
  const measured = await recorderResult(page)
  const completedState = await stateOf(page)
  const completedPanel = await panelSnapshot(page)
  const oscAtCompletion = await oscillatorCount(page)
  const blipAtCompletion = await blipCount(page)
  await sleep(page, 120)
  const oscHoldStart = await oscillatorCount(page)
  const blipHoldStart = await blipCount(page)
  await sleep(page, 900)
  const oscHoldEnd = await oscillatorCount(page)
  const blipHoldEnd = await blipCount(page)
  const heldState = await stateOf(page)
  const heldPanel = await panelSnapshot(page)
  return {
    kind: 'line',
    state: completedState,
    panel: completedPanel,
    measured,
    hold: {
      held: `${completedState.phase}:${completedState.dialogueIndex}` === `${heldState.phase}:${heldState.dialogueIndex}`
        && heldPanel.shown === completedPanel.shown,
      indexBefore: completedState.dialogueIndex,
      indexAfter: heldState.dialogueIndex,
      phaseBefore: completedState.phase,
      phaseAfter: heldState.phase,
      textStillFull: heldPanel.shown === completedPanel.shown,
      oscAtCompletion,
      oscHoldStart,
      oscHoldEnd,
      oscillatorsDuringHold: oscHoldEnd - oscHoldStart,
      blipAtCompletion,
      blipHoldStart,
      blipHoldEnd,
      blipCallsDuringHold: blipHoldEnd - blipHoldStart,
      caretStopped: heldPanel.caretContent === 'none' || heldPanel.caretContent === 'normal',
      ariaBusy: heldPanel.ariaBusy,
      isComplete: heldPanel.isComplete,
      isTyping: heldPanel.isTyping,
    },
  }
}

async function advanceAndMeasure(page) {
  await waitForCurrentLineComplete(page)
  const before = await stateOf(page)
  const beforeKey = `${before.phase}:${before.dialogueIndex}`
  await installRecorder(page)
  await pressSpace(page)
  let changed = await waitForStateChange(page, beforeKey)
  if (!changed) {
    // A completed line can only advance (never "complete"), so a retry cannot
    // double-advance: if the first press had been received, the state would
    // already have changed and we would not be here.
    console.error(`[p1] no state change after Space at ${beforeKey}; retrying once`)
    await sleep(page, 250)
    await pressSpace(page)
    changed = await waitForStateChange(page, beforeKey)
  }
  if (!changed) {
    const snapshot = await panelSnapshot(page)
    throw new Error(`Dialogue did not advance from ${beforeKey}. Panel: ${JSON.stringify(snapshot)}`)
  }
  const afterState = await stateOf(page)
  if (!isDialogue(afterState.phase)) return { kind: 'phase-change', state: afterState }
  await page.waitForFunction(() => {
    const panel = document.getElementById('dialogue-panel')
    return panel && !panel.classList.contains('is-typing')
  }, null, { timeout: 120 }).catch(() => undefined)
  const panel = await panelSnapshot(page)
  return collectCompletedLine(page, panel)
}

async function measureEnteredLine(page) {
  // Recorder was armed before the dispatch that entered this dialogue phase.
  await waitForCurrentLineComplete(page)
  const panel = await panelSnapshot(page)
  return collectCompletedLine(page, panel)
}

async function runViewport(browser, viewport) {
  const label = `${viewport.width}x${viewport.height}`
  const { context, page } = await preparePage(browser, viewport, 'no-preference', label)
  const run = {
    viewport: label,
    narratorStart: null,
    lines: [],
    output: {},
  }

  await startGame(page)
  // Opening line 0 is narrator: must be complete immediately.
  run.narratorStart = await panelSnapshot(page)
  const firstState = await stateOf(page)
  if (!isDialogue(firstState.phase)) throw new Error(`Expected dialogue after START, got ${firstState.phase}`)

  let measured = 0
  let guard = 0
  while (measured < 10 && guard < 100) {
    guard += 1
    let state = await stateOf(page)
    if (!isDialogue(state.phase)) {
      const driven = await driveToNextDialogue(page)
      state = driven.state
      if (!isDialogue(state.phase)) throw new Error(`Stranded in phase ${state.phase} with ${measured} lines measured`)
      const step = driven.recorderArmed
        ? await measureEnteredLine(page)
        : await advanceAndMeasure(page)
      if (step.kind === 'phase-change') continue
      if (step.kind === 'narrator') {
        console.error(`[p1] ${label} narrator line skipped (immediate)`)
        continue
      }
      measured = recordLine(run, measured, step, label)
      continue
    }
    const step = await advanceAndMeasure(page)
    if (step.kind === 'phase-change') continue
    if (step.kind === 'narrator') {
      console.error(`[p1] ${label} narrator line skipped (immediate)`)
      continue
    }
    measured = recordLine(run, measured, step, label)
  }

  run.output.measuredCount = measured
  run.output.timingsAllUnderOneSecond = run.lines
    .filter((line) => line.chars <= 200)
    .every((line) => line.durationMs <= 1000)
  run.output.maxDurationMs = Math.max(...run.lines.map((line) => line.durationMs))
  run.output.maxCharsPerSecond = Math.max(...run.lines.map((line) => line.charsPerSecond))
  run.output.minCharsPerSecond = Math.min(...run.lines.map((line) => line.charsPerSecond))
  run.output.allHeldWithoutAutoAdvance = run.lines.every((line) => line.hold.held)
  run.output.allCompleteStateClean = run.lines.every((line) =>
    line.hold.isComplete && !line.hold.isTyping && line.hold.ariaBusy === 'false' && line.hold.caretStopped)
  run.output.allOscillatorsStoppedWhileHolding = run.lines.every((line) => line.hold.oscillatorsDuringHold === 0)
  run.output.allBlipRequestsStoppedWhileHolding = run.lines.every((line) => line.hold.blipCallsDuringHold === 0)
  run.output.speakers = [...new Set(run.lines.map((line) => line.speaker))]
  run.output.speakerColorsPresent = run.lines.every((line) => line.speakerColor && line.speakerAccent)
  run.output.narratorStartImmediate = run.narratorStart.isComplete && !run.narratorStart.isTyping
    && run.narratorStart.ariaBusy === 'false' && run.narratorStart.accessible.endsWith(run.narratorStart.shown)

  result.viewports.push(run)
  await context.close()
}

function recordLine(run, measured, step, label) {
  measured += 1
  console.error(
    `[p1] ${label} line ${measured}: ${step.panel.speaker} `
    + `${step.measured.charsAtEnd} chars in ${step.measured.durationMs.toFixed(0)} ms`,
  )
  run.lines.push({
    n: measured,
    speaker: step.panel.speaker,
    phase: step.state.phase,
    index: step.state.dialogueIndex,
    chars: step.measured.charsAtEnd,
    durationMs: Number(step.measured.durationMs.toFixed(2)),
    charsPerSecond: Number((step.measured.charsAtEnd / (step.measured.durationMs / 1000)).toFixed(1)),
    fullTextMatches: step.measured.textMatches,
    oscillatorsDuringReveal: Math.max(0, step.hold.oscAtCompletion - step.measured.oscStart),
    blipCallsDuringHold: step.hold.blipCallsDuringHold,
    speakerColor: step.panel.speakerColor,
    speakerAccent: step.panel.speakerAccent,
    hold: step.hold,
  })
  return measured
}

async function runReducedMotion(browser) {
  const { context, page } = await preparePage(browser, { width: 1920, height: 1080 }, 'reduce', 'reduced-motion')
  await startGame(page)
  const first = await panelSnapshot(page)
  await pressSpace(page)
  await page.waitForFunction(() => {
    const state = window.__GAME_STATE__
    return state && state.phase === 'opening' && state.dialogueIndex === 1
  }, null, { timeout: 3000 })
  const second = await panelSnapshot(page)
  const state = await stateOf(page)
  result.reducedMotion = {
    firstLine: {
      isTyping: first.isTyping,
      isComplete: first.isComplete,
      ariaBusy: first.ariaBusy,
      shownLength: first.shown.length,
      accessibleLength: first.accessible.length,
      textMatches: first.accessible.endsWith(first.shown),
    },
    secondLine: {
      speaker: second.speaker,
      isTyping: second.isTyping,
      isComplete: second.isComplete,
      ariaBusy: second.ariaBusy,
      shownLength: second.shown.length,
      accessibleLength: second.accessible.length,
      textMatches: second.accessible.endsWith(second.shown),
      textNonEmpty: second.shown.length > 0,
    },
    state: { phase: state.phase, index: state.dialogueIndex },
    pass: !second.isTyping && second.isComplete && second.ariaBusy === 'false'
      && second.shown.length > 0 && second.accessible.endsWith(second.shown),
  }
  await context.close()
}

async function runInteraction(browser) {
  const { context, page } = await preparePage(browser, { width: 1920, height: 1080 }, 'no-preference', 'interaction')
  await startGame(page)
  await pressSpace(page)
  await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 1, null, { timeout: 3000 })
  await page.waitForSelector('#dialogue-panel.is-typing', { timeout: 3000 })
  await page.waitForFunction(() => {
    const text = document.getElementById('dialogue-text')
    const accessible = document.getElementById('dialogue-accessible')
    return text && text.textContent.length > 0 && accessible && text.textContent.length < accessible.textContent.length
  }, null, { timeout: 3000 })

  const typingSnapshot = await panelSnapshot(page)
  const beforeSkip = await stateOf(page)
  const blipBeforeSkip = await blipCount(page)

  // Two clicks 40 ms apart, dispatched inside one page task. The first click
  // completes the reveal (no advance); the second is inside the double-trigger
  // guard and must not advance.
  const doubleClick = await page.evaluate(() => new Promise((resolve) => {
    const text = document.getElementById('dialogue-text')
    const panel = document.getElementById('dialogue-panel')
    const advances = () => (window.__ADVANCES__ ?? []).slice()
    const advancesBefore = advances().length
    const snapshot = () => ({
      className: panel.className,
      shown: text.textContent,
      state: { phase: window.__GAME_STATE__.phase, dialogueIndex: window.__GAME_STATE__.dialogueIndex },
      ariaBusy: panel.getAttribute('aria-busy'),
      accessible: document.getElementById('dialogue-accessible').textContent,
      caretContent: getComputedStyle(text, '::after').content,
      advancesDelta: advances().length - advancesBefore,
      at: performance.now(),
    })
    const firstAt = performance.now()
    text.click()
    const first = snapshot()
    const firstDoneAt = performance.now()
    setTimeout(() => {
      const secondAt = performance.now()
      text.click()
      const second = snapshot()
      resolve({
        first,
        second,
        gapMs: Number((secondAt - firstDoneAt).toFixed(2)),
        firstHandlerMs: Number((firstDoneAt - firstAt).toFixed(2)),
        advancesBefore,
        advancesAfter: advances().length,
      })
    }, 40)
  }))
  const afterDoubleClick = {
    state: await stateOf(page),
    panel: await panelSnapshot(page),
    blip: await blipCount(page),
    osc: await oscillatorCount(page),
  }

  // Let any in-flight audio note finish, then prove nothing new starts while
  // the completed line holds. The line must not advance on its own either.
  await page.waitForTimeout(250)
  const blipAfterSkipSettled = await blipCount(page)
  const oscAfterSkipSettled = await oscillatorCount(page)
  await page.waitForTimeout(400)
  const afterSkipHold = await stateOf(page)
  const finalPanel = await panelSnapshot(page)
  const oscAfterSkipHold = await oscillatorCount(page)
  const blipAfterSkipHold = await blipCount(page)

  // Let the guard expire, then a deliberate click must advance exactly once.
  await page.locator('#dialogue-text').click()
  await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 2, null, { timeout: 3000 })
  const afterDeliberateClick = await stateOf(page)
  await page.waitForTimeout(400)
  const afterHold = await stateOf(page)

  const accessibleFull = doubleClick.first.accessible.replace(/^[^:]+:\s*/, '')

  const firstChecks = {
    textFull: doubleClick.first.shown === accessibleFull,
    indexSame: doubleClick.first.state.dialogueIndex === beforeSkip.dialogueIndex,
    phaseSame: doubleClick.first.state.phase === beforeSkip.phase,
    complete: doubleClick.first.className.includes('is-complete'),
    notTyping: !doubleClick.first.className.includes('is-typing'),
    ariaBusyFalse: doubleClick.first.ariaBusy === 'false',
    caretClean: doubleClick.first.caretContent === 'none' || doubleClick.first.caretContent === 'normal',
    noAdvanceDispatched: doubleClick.first.advancesDelta === 0,
  }
  const secondChecks = {
    indexSame: doubleClick.second.state.dialogueIndex === beforeSkip.dialogueIndex,
    phaseSame: doubleClick.second.state.phase === beforeSkip.phase,
    noAdvanceDispatched: doubleClick.second.advancesDelta === 0,
    fullTextStillShown: doubleClick.second.shown === accessibleFull,
  }

  result.interaction = {
    typing: {
      isTyping: typingSnapshot.isTyping,
      shownLength: typingSnapshot.shown.length,
      accessibleLength: typingSnapshot.accessible.length,
    },
    beforeSkip,
    doubleClick,
    firstChecks,
    secondChecks,
    firstClickSkippedWithoutAdvancing:
      doubleClick.first.shown === accessibleFull
      && doubleClick.first.state.dialogueIndex === beforeSkip.dialogueIndex
      && doubleClick.first.state.phase === beforeSkip.phase
      && doubleClick.first.className.includes('is-complete')
      && !doubleClick.first.className.includes('is-typing')
      && doubleClick.first.ariaBusy === 'false'
      && (doubleClick.first.caretContent === 'none' || doubleClick.first.caretContent === 'normal')
      && doubleClick.first.advancesDelta === 0,
    firstClickShown: doubleClick.first.shown,
    quickSecondClickDidNotAdvance:
      doubleClick.second.state.dialogueIndex === beforeSkip.dialogueIndex
      && doubleClick.second.state.phase === beforeSkip.phase
      && doubleClick.second.advancesDelta === 0,
    quickSecondClickIndex: doubleClick.second.state.dialogueIndex,
    deliberateClickAdvancedOne:
      afterDeliberateClick.dialogueIndex === beforeSkip.dialogueIndex + 1
      && afterDeliberateClick.phase === beforeSkip.phase,
    deliberateClickIndex: afterDeliberateClick.dialogueIndex,
    noFurtherAutoAdvance: afterHold.dialogueIndex === afterDeliberateClick.dialogueIndex
      && afterHold.phase === afterDeliberateClick.phase,
    skipHeldWithoutAdvancing:
      afterSkipHold.dialogueIndex === beforeSkip.dialogueIndex
      && afterSkipHold.phase === beforeSkip.phase,
    oscillatorsAtSkip: afterDoubleClick.osc,
    oscillatorsAfterSettle: oscAfterSkipSettled,
    oscillatorsAfterHold: oscAfterSkipHold,
    blipCallsBeforeSkip: blipBeforeSkip,
    blipCallsAtSkip: afterDoubleClick.blip,
    blipCallsAfterSettle: blipAfterSkipSettled,
    blipCallsAfterHold: blipAfterSkipHold,
    blipsStoppedAfterSkip:
      blipAfterSkipHold === blipAfterSkipSettled && oscAfterSkipHold === oscAfterSkipSettled,
    finalPanel: {
      isTyping: finalPanel.isTyping,
      isComplete: finalPanel.isComplete,
      ariaBusy: finalPanel.ariaBusy,
      caretContent: finalPanel.caretContent,
    },
    stateAfterHold: { phase: afterHold.phase, index: afterHold.dialogueIndex },
  }
  await context.close()
}

async function runThrottledFallback(browser) {
  // Starve requestAnimationFrame (one frame every 500 ms) while leaving
  // setTimeout healthy. The wall-clock deadline must still finish the line.
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  await page.addInitScript(blockHmrSocket)
  await page.addInitScript(disableWebGL)
  await page.addInitScript(instrumentAudio)
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 500)
    window.cancelAnimationFrame = (id) => window.clearTimeout(id)
  })
  page.on('pageerror', (error) => result.pageErrors.push(`throttled-raf: ${error.message}`))
  await startGame(page)
  const narrator = await panelSnapshot(page)
  await installRecorder(page)
  await pressSpace(page)
  await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 1, null, { timeout: 5000 })
  const completed = await page.waitForFunction(
    () => window.__lineMeasure?.end !== null,
    null,
    { timeout: 6000 },
  ).then(() => true, () => false)
  const measured = await recorderResult(page)
  const panel = await panelSnapshot(page)
  result.throttledRaf = {
    narratorImmediate: narrator.isComplete && !narrator.isTyping,
    completed,
    durationMs: measured.durationMs === null ? null : Number(measured.durationMs.toFixed(2)),
    chars: measured.charsAtEnd,
    fullTextMatches: measured.textMatches,
    isComplete: panel.isComplete,
    isTyping: panel.isTyping,
    ariaBusy: panel.ariaBusy,
    underOneSecond: measured.durationMs !== null && measured.durationMs <= 1000,
    pass: completed && measured.textMatches && panel.isComplete && !panel.isTyping
      && measured.durationMs !== null && measured.durationMs <= 1000,
  }
  await context.close()
}

async function runHiddenTab(browser) {
  const { context, page } = await preparePage(browser, { width: 1920, height: 1080 }, 'no-preference', 'hidden-tab')
  await startGame(page)
  await pressSpace(page)
  await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 1, null, { timeout: 3000 })
  await page.waitForSelector('#dialogue-panel.is-typing', { timeout: 3000 })
  await page.waitForFunction(() => {
    const text = document.getElementById('dialogue-text')
    const accessible = document.getElementById('dialogue-accessible')
    return text && text.textContent.length > 0 && accessible && text.textContent.length < accessible.textContent.length
  }, null, { timeout: 3000 })
  const before = await panelSnapshot(page)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const after = await panelSnapshot(page)
  const stateAfter = await stateOf(page)
  await page.waitForTimeout(300)
  const held = await panelSnapshot(page)
  const stateHeld = await stateOf(page)
  result.hiddenTab = {
    wasTypingPartially: before.isTyping && before.shown.length < before.accessible.length,
    completedImmediately: after.isComplete && !after.isTyping && after.ariaBusy === 'false'
      && after.accessible.endsWith(after.shown) && after.shown.length > 0,
    shownLength: after.shown.length,
    accessibleLength: after.accessible.length,
    indexAfter: stateAfter.dialogueIndex,
    heldWithoutAdvancing: held.shown === after.shown
      && stateHeld.dialogueIndex === stateAfter.dialogueIndex
      && stateHeld.phase === stateAfter.phase,
    pass: after.isComplete && !after.isTyping && after.ariaBusy === 'false'
      && after.accessible.endsWith(after.shown) && after.shown.length > 0
      && stateHeld.dialogueIndex === stateAfter.dialogueIndex,
  }
  await context.close()
}

async function runExitFade(browser) {
  const { context, page } = await preparePage(browser, { width: 1920, height: 1080 }, 'no-preference', 'exit-fade')
  await startGame(page)
  // Walk to the last opening line, then advance into briefing to start the fade.
  for (let index = 1; index <= 3; index += 1) {
    await waitForCurrentLineComplete(page)
    await pressSpace(page)
    await page.waitForFunction(
      (expected) => window.__GAME_STATE__?.dialogueIndex === expected,
      index,
      { timeout: 3000 },
    )
  }
  await waitForCurrentLineComplete(page)
  await pressSpace(page)
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'briefing', null, { timeout: 3000 })
  const leaving = await page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    return {
      hidden: panel.hidden,
      leaving: panel.classList.contains('is-leaving'),
      pointerEvents: panel.style.pointerEvents,
      ariaBusy: panel.getAttribute('aria-busy'),
      isTyping: panel.classList.contains('is-typing'),
      isComplete: panel.classList.contains('is-complete'),
    }
  })

  // Re-entering dialogue inside the 210 ms window must cancel the fade.
  await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'BEGIN_CHAPTER' }))
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors', null, { timeout: 3000 })
  const reentered = await page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    return {
      hidden: panel.hidden,
      leaving: panel.classList.contains('is-leaving'),
      typing: panel.classList.contains('is-typing'),
      pointerEvents: panel.style.pointerEvents,
    }
  })

  // Drive the rest of the chapter's dialogue from the state machine to reach
  // voting, which starts a second fade. Then let it finish.
  await page.evaluate(() => {
    const store = window.__GAME__.store
    for (let guard = 0; guard < 30; guard += 1) {
      if (!['opening', 'advisors', 'feedback', 'boss'].includes(store.state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'voting', null, { timeout: 3000 })
  const leavingAgain = await page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    return {
      hidden: panel.hidden,
      leaving: panel.classList.contains('is-leaving'),
      pointerEvents: panel.style.pointerEvents,
    }
  })
  await page.waitForTimeout(350)
  const finished = await page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    return {
      hidden: panel.hidden,
      leaving: panel.classList.contains('is-leaving'),
      pointerEvents: panel.style.pointerEvents,
    }
  })

  result.exitFade = {
    leaving,
    cancelledByNewLine: reentered,
    leavingAgain,
    finished,
    pass: leaving.leaving && !leaving.hidden && leaving.pointerEvents === 'none'
      && leaving.ariaBusy === 'false' && !leaving.isTyping && !leaving.isComplete
      && reentered.leaving === false && reentered.hidden === false
      && leavingAgain.leaving && !leavingAgain.hidden
      && finished.hidden && !finished.leaving && finished.pointerEvents === '',
  }
  await context.close()
}

async function runDeliberate180(browser) {
  const { context, page } = await preparePage(browser, { width: 1920, height: 1080 }, 'no-preference', 'deliberate-180ms')
  await startGame(page)
  await pressSpace(page)
  await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 1, null, { timeout: 3000 })
  await page.waitForSelector('#dialogue-panel.is-typing', { timeout: 3000 })
  const typing = await panelSnapshot(page)
  const before = await stateOf(page)
  await page.locator('#dialogue-text').click()
  const afterSkip = await panelSnapshot(page)
  await page.waitForTimeout(180)
  await page.locator('#dialogue-text').click()
  const advanced = await page.waitForFunction(
    () => window.__GAME_STATE__?.dialogueIndex === 2,
    null,
    { timeout: 3000 },
  ).then(() => true, () => false)
  const after = await stateOf(page)
  const clicks = await page.evaluate(() => window.__CLICKS__.slice(-3))
  result.deliberate180 = {
    typingAtSample: typing.isTyping,
    skipLeftIndexAt: before.dialogueIndex,
    skipPanelComplete: afterSkip.isComplete && !afterSkip.isTyping,
    advancedAfter180ms: advanced,
    indexAfter: after.dialogueIndex,
    clickGapMs: clicks.length >= 2
      ? Number((clicks[clicks.length - 1].at - clicks[clicks.length - 2].at).toFixed(2))
      : null,
    clicks,
    pass: afterSkip.isComplete && !afterSkip.isTyping && advanced && after.dialogueIndex === 2,
  }
  await context.close()
}

const browser = await chromium.launch({ headless: true })

try {
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
  ]) {
    await runViewport(browser, viewport)
  }
  await runReducedMotion(browser)
  await runInteraction(browser)
  await runDeliberate180(browser)
  await runThrottledFallback(browser)
  await runHiddenTab(browser)
  await runExitFade(browser)
} catch (error) {
  result.fatal = error?.stack ?? String(error)
} finally {
  await browser.close()
  writeFileSync(`${OUT}/p1-dialogue-measure.json`, `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
}
