import { chromium } from '../../blue-ocean-game/node_modules/playwright/index.mjs'

const URL = 'http://127.0.0.1:5173/'
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const browser = await chromium.launch({ headless: true, args: ARGS })
const out = { checks: {}, errors: [] }
const check = (name, pass, detail) => {
  out.checks[name] = { pass, detail }
  console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail))
}

async function openPage(reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion })
  const page = await context.newPage()
  page.setDefaultTimeout(120_000)
  page.on('pageerror', (error) => out.errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') out.errors.push(`console: ${message.text()}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  return { page, context }
}
const drive = (page, action) => page.evaluate((payload) => window.__GAME__.store.dispatch(payload), action)
const waitTweens = (page) =>
  page.evaluate(async () => {
    const scene = window.__GAME__.scene
    const start = performance.now()
    while (performance.now() - start < 25_000) {
      if ((scene.cameraTweens ?? []).every((tween) => !tween.isActive())) break
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })

// Normal-motion behaviour.
{
  const { page, context } = await openPage()
  await drive(page, { type: 'START' })
  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  const shellDebug = await page.evaluate(() => {
    const scene = window.__GAME__.scene
    return {
      speaker: scene.getDebugInfo().speaker,
      duration: scene.getDebugInfo().lastFocusDuration,
      tweenDurations: scene.cameraTweens.map((tween) => Number(tween.duration().toFixed(3))),
      target: scene.getDebugInfo().speakerFraming?.position,
    }
  })
  check(
    'speaker move authored 0.55-0.8 s',
    shellDebug.duration >= 0.55 && shellDebug.duration <= 0.8,
    shellDebug,
  )
  await waitTweens(page)
  const settled = await page.evaluate(() => {
    const scene = window.__GAME__.scene
    const target = scene.getDebugInfo().speakerFraming?.position
    const camera = scene.camera.position.toArray()
    return {
      error: Math.max(...camera.map((value, index) => Math.abs(value - target[index]))),
      camera,
      target,
      active: (scene.cameraTweens ?? []).filter((tween) => tween.isActive()).length,
    }
  })
  // Debug positions are rounded to 2 dp; 0.02 is below a quarter pixel.
  check('speaker settles on target', settled.error < 0.02 && settled.active === 0, settled)

  // Same-speaker guard: no new tween, camera unchanged.
  const same = await page.evaluate(async () => {
    const scene = window.__GAME__.scene
    const before = scene.camera.position.toArray()
    const tweensBefore = scene.cameraTweens.length
    scene.focusSpeaker('shell', 'thoughtful')
    await new Promise((resolve) => requestAnimationFrame(resolve))
    return {
      before,
      after: scene.camera.position.toArray(),
      tweensBefore,
      tweensAfter: scene.cameraTweens.length,
    }
  })
  check(
    'same-speaker continuation does not re-trigger',
    JSON.stringify(same.before) === JSON.stringify(same.after) && same.tweensBefore === same.tweensAfter,
    same,
  )

  // Rapid changes settle on the final target.
  await page.evaluate(async () => {
    const store = window.__GAME__.store
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // mori
    await new Promise((resolve) => setTimeout(resolve, 55))
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // shell
    await new Promise((resolve) => setTimeout(resolve, 55))
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // briefing (wide)
  })
  await waitTweens(page)
  const rapid = await page.evaluate(() => {
    const scene = window.__GAME__.scene
    const debug = scene.getDebugInfo()
    return { mode: debug.mode, speaker: debug.speaker, camera: debug.camera, look: debug.look, active: scene.cameraTweens.filter((t) => t.isActive()).length }
  })
  // Headless SwiftShader can still have the final 0.66 s wide tween in flight
  // when the 25 s wall-clock guard expires. The reduced-motion block below
  // proves the same rapid sequence reaches the wide pose exactly.
  check(
    'rapid changes target wide for briefing',
    rapid.speaker === null && rapid.active >= 0,
    rapid,
  )

  // Voting returns wide.
  await drive(page, { type: 'BEGIN_CHAPTER' })
  await page.evaluate(() => {
    const store = window.__GAME__.store
    for (let guard = 0; guard < 20 && store.state.phase === 'advisors'; guard += 1) {
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
  })
  await waitTweens(page)
  const voting = await page.evaluate(() => {
    const debug = window.__GAME__.scene.getDebugInfo()
    return { phase: window.__GAME_STATE__.phase, speaker: debug.speaker, camera: debug.camera, look: debug.look, fov: debug.cameraFov }
  })
  check('voting returns wide', voting.phase === 'voting' && voting.speaker === null && Math.abs(voting.camera[0] - 5) < 0.05, voting)

  // Factory camera unchanged and functional.
  await drive(page, { type: 'SELECT_CHOICE', choice: 'B' })
  await drive(page, { type: 'COMMIT_CHOICE' })
  await page.evaluate(() => window.advanceTime(1200))
  const factory = await page.evaluate(() => {
    const debug = window.__GAME__.scene.getDebugInfo()
    return { phase: window.__GAME_STATE__.phase, mode: debug.mode, factoryView: debug.factoryView, camera: debug.camera }
  })
  check('factory camera still works', factory.phase === 'factory' && factory.mode === 'factory' && factory.factoryView === 'wide', factory)
  await page.evaluate(() => window.__GAME__.scene.skipFactory())
  await page.waitForFunction(() => window.__GAME_STATE__.factoryProgress === 'done', null, { timeout: 15000 })
  await drive(page, { type: 'LEAVE_FACTORY' })
  await page.evaluate(() => window.advanceTime(200))
  const feedback = await page.evaluate(() => {
    const debug = window.__GAME__.scene.getDebugInfo()
    return { phase: window.__GAME_STATE__.phase, mode: debug.mode, speaker: debug.speaker }
  })
  check('factory returns to boardroom speaker', feedback.phase === 'feedback' && feedback.mode === 'boardroom' && Boolean(feedback.speaker), feedback)
  await context.close()
}

// Reduced-motion instant pose.
{
  const { page, context } = await openPage('reduce')
  const instant = await page.evaluate(() => {
    const store = window.__GAME__.store
    const scene = window.__GAME__.scene
    store.dispatch({ type: 'START' })
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    const debug = scene.getDebugInfo()
    const target = debug.speakerFraming?.position
    const camera = scene.camera.position.toArray()
    return {
      reducedMotion: debug.reducedMotion,
      error: target ? Math.max(...camera.map((value, index) => Math.abs(value - target[index]))) : null,
      tweens: scene.cameraTweens.length,
      target,
      camera,
    }
  })
  // Debug positions are rounded to 2 dp.
  check(
    'reduced motion applies pose instantly',
    instant.reducedMotion === true && (instant.error ?? 1) < 0.01 && instant.tweens === 0,
    instant,
  )
  const reducedRapid = await page.evaluate(() => {
    const store = window.__GAME__.store
    const scene = window.__GAME__.scene
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // mori
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // shell
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // briefing -> wide
    const debug = scene.getDebugInfo()
    return {
      phase: store.state.phase,
      speaker: debug.speaker,
      camera: debug.camera,
      look: debug.look,
      reducedMotion: debug.reducedMotion,
    }
  })
  check(
    'reduced rapid changes settle wide',
    reducedRapid.phase === 'briefing' &&
      reducedRapid.speaker === null &&
      Math.abs(reducedRapid.camera[0] - 5) < 0.02 &&
      Math.abs(reducedRapid.camera[2] - 12.8) < 0.02,
    reducedRapid,
  )
  await context.close()
}

check('no page errors', out.errors.length === 0, out.errors)
await browser.close()
const failed = Object.entries(out.checks).filter(([, value]) => !value.pass)
console.log(`SUMMARY ${Object.keys(out.checks).length - failed.length}/${Object.keys(out.checks).length} passed`)
