/**
 * P5 targeted camera verification — one-off script (not part of the test suite).
 *
 * Visits all five speakers in a real dialogue run at 1920x1080 and 1366x768,
 * projects the speaking avatar's silhouette / head / shoulders / feet into
 * screen space, and checks the dialogue overlay reserve. Also checks wide
 * returns, same-speaker continuity, rapid changes, reduced motion and the
 * factory camera.
 *
 * Run from anywhere:
 *   node agent-reports/round1/measure-p5.mjs
 * Requires the dev server at http://127.0.0.1:5173.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../blue-ocean-game/node_modules/playwright/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const URL = 'http://127.0.0.1:5173/'
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
]
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

const results = { generatedAt: new Date().toISOString(), url: URL, viewports: {}, checks: {}, pageErrors: [] }

async function settle(page, ms = 950) {
  await page.evaluate((duration) => window.advanceTime(duration), ms)
  // Headless SwiftShader runs far below 60 fps and GSAP's lag smoothing
  // stretches wall-clock time. Wait for the camera tweens to report inactive
  // rather than assuming the authored duration elapsed.
  await page.evaluate(async () => {
    const scene = window.__GAME__?.scene
    if (!scene) return
    const start = performance.now()
    while (performance.now() - start < 25_000) {
      const tweens = scene.cameraTweens ?? []
      if (tweens.every((tween) => !tween.isActive())) break
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })
}

async function settleQuick(page, ms = 60) {
  // Behavioural traversal only. Final-pose evidence is captured separately
  // under reduced motion; this avoids SwiftShader's stretched tween waits.
  await page.evaluate((duration) => window.advanceTime(duration), ms)
}

const ADVISOR_LABELS = ['grumble', 'mori', 'bolt', 'pip', 'bolt-continuation']
function shotLabel(index) {
  return ADVISOR_LABELS[index] ?? String(index)
}

async function snapshot(page, label, capture = true) {
  const shotPath = capture && results.captureEnabled ? join(HERE, `p5-${results.currentViewport}-${label}.png`) : null
  if (shotPath) {
    // Headless SwiftShader spends most of its frame budget in the continuous
    // render loop. Pause it, draw one settled frame, capture, then resume:
    // this is a measurement-only optimisation and does not change app code.
    await page.evaluate(() => {
      const game = window.__GAME__
      if (!game?.scene) return
      game.scene.renderer.setAnimationLoop(null)
      game.scene.renderer.render(game.scene.scene, game.scene.camera)
    })
    try {
      await page.screenshot({ path: shotPath, timeout: 120_000 })
    } finally {
      await page.evaluate(() => {
        const game = window.__GAME__
        if (game?.scene) game.scene.renderer.setAnimationLoop(game.scene.animate)
      })
    }
  }
  const data = await page.evaluate(() => {
    const scene = window.__GAME__?.scene
    if (!scene) return { error: 'no scene' }
    const cam = scene.camera
    const debug = scene.getDebugInfo()
    const speaker = debug.speaker
    const avatar = speaker ? scene.boardroom.avatars.get(speaker) : null
    const panel = document.querySelector('.dialogue-panel')
    const panelVisible = Boolean(panel && !panel.hidden && getComputedStyle(panel).display !== 'none')
    const panelRect = panelVisible ? panel.getBoundingClientRect() : null
    scene.scene.updateMatrixWorld(true)

    const project = (x, y, z) => {
      const v = cam.position.clone()
      v.set(x, y, z).project(cam)
      return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, ndcZ: v.z }
    }

    const projectAvatar = (root) => {
      root.updateWorldMatrix(true, true)
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      let minWorldY = Infinity
      let maxWorldY = -Infinity
      let meshes = 0
      root.traverse((object) => {
        if (!object.isMesh || !object.geometry) return
        meshes += 1
        const geometry = object.geometry
        if (!geometry.boundingBox) geometry.computeBoundingBox()
        const bb = geometry.boundingBox
        for (const x of [bb.min.x, bb.max.x]) {
          for (const y of [bb.min.y, bb.max.y]) {
            for (const z of [bb.min.z, bb.max.z]) {
              const v = cam.position.clone().set(x, y, z).applyMatrix4(object.matrixWorld)
              minWorldY = Math.min(minWorldY, v.y)
              maxWorldY = Math.max(maxWorldY, v.y)
              const p = v.project(cam)
              const sx = (p.x + 1) / 2
              const sy = (1 - p.y) / 2
              minX = Math.min(minX, sx)
              maxX = Math.max(maxX, sx)
              minY = Math.min(minY, sy)
              maxY = Math.max(maxY, sy)
            }
          }
        }
      })
      return { minX, maxX, minY, maxY, minWorldY, maxWorldY, meshes }
    }

    let framing = null
    if (avatar) {
      const rootPos = cam.position.clone()
      avatar.root.getWorldPosition(rootPos)
      const headPos = cam.position.clone()
      avatar.headAnchor.getWorldPosition(headPos)
      const box = projectAvatar(avatar.root)
      const feetWorld = 0
      framing = {
        silhouette: {
          left: box.minX,
          right: box.maxX,
          top: box.minY,
          bottom: box.maxY,
          widthShare: box.maxX - box.minX,
          meshes: box.meshes,
        },
        headTop: project(rootPos.x, box.maxWorldY, rootPos.z),
        headCenter: project(rootPos.x, headPos.y, rootPos.z),
        leftEar: project(rootPos.x - 0.62, headPos.y, rootPos.z),
        rightEar: project(rootPos.x + 0.62, headPos.y, rootPos.z),
        shoulders: project(rootPos.x, headPos.y - 0.8, rootPos.z),
        feet: project(rootPos.x, feetWorld, rootPos.z),
        headWorldY: headPos.y,
        earWorldY: box.maxWorldY,
        worldMinY: box.minWorldY,
        worldMaxY: box.maxWorldY,
        distance: cam.position.distanceTo(headPos),
      }
      // Neighbour occlusion and prominence: a nearer projected avatar covering
      // the face point, or a neighbour that reads nearly as large as the
      // speaker, is a failed medium shot even when the Box3 width is correct.
      const occluders = []
      const neighbours = []
      for (const [id, other] of scene.boardroom.avatars) {
        if (id === speaker) continue
        const otherBox = projectAvatar(other.root)
        const otherPos = cam.position.clone()
        other.root.getWorldPosition(otherPos)
        const otherDistance = cam.position.distanceTo(otherPos)
        const face = framing.headCenter
        const coversFace =
          face.x >= otherBox.minX && face.x <= otherBox.maxX && face.y >= otherBox.minY && face.y <= otherBox.maxY
        if (coversFace && otherDistance < framing.distance) {
          occluders.push({ id, otherDistance: Number(otherDistance.toFixed(2)) })
        }
        const visibleWidth = Math.max(0, Math.min(1, otherBox.maxX) - Math.max(0, otherBox.minX))
        if (visibleWidth > 0.001) {
          neighbours.push({
            id,
            visibleWidthShare: Number(visibleWidth.toFixed(3)),
            clipped:
              (otherBox.minX < -0.005 && otherBox.maxX > 0.005) ||
              (otherBox.maxX > 1.005 && otherBox.minX < 0.995),
            distance: Number(otherDistance.toFixed(2)),
          })
        }
      }
      framing.occluders = occluders
      framing.neighbours = neighbours
      framing.visibleWidthShare = Number(
        (Math.max(0, Math.min(1, framing.silhouette.right) - Math.max(0, framing.silhouette.left))).toFixed(3),
      )
      framing.maxNeighbourProminence = Number(
        (Math.max(0, ...neighbours.map((entry) => entry.visibleWidthShare)) /
          Math.max(framing.visibleWidthShare, 0.001)).toFixed(3),
      )
    }

    return {
      phase: window.__GAME_STATE__?.phase,
      dialogueIndex: window.__GAME_STATE__?.dialogueIndex,
      speaker,
      panelVisible,
      panelTopShare: panelRect ? panelRect.top / window.innerHeight : null,
      panelBottomShare: panelRect ? panelRect.bottom / window.innerHeight : null,
      viewport: { width: window.innerWidth, height: window.innerHeight, aspect: window.innerWidth / window.innerHeight },
      camera: debug.camera,
      look: debug.look,
      fov: Number(cam.fov.toFixed(2)),
      speakerFraming: debug.speakerFraming,
      speakerCueIntensity: debug.speakerCueIntensity,
      reducedMotion: debug.reducedMotion,
      framing,
    }
  })
  return { label, screenshot: shotPath, ...data }
}

async function drive(page, action) {
  return page.evaluate((payload) => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('store unavailable')
    store.dispatch(payload)
    return { phase: store.state.phase, dialogueIndex: store.state.dialogueIndex }
  }, action)
}

async function measureViewport(browser, viewport) {
  results.currentViewport = viewport.name
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await settle(page, 300)

  const shots = []
  const check = (name, pass, detail) => {
    results.checks[`${viewport.name}:${name}`] = { pass, detail }
  }

  // Opening: narrator, shell, mori, shell. Behavioural traversal only; the
  // deterministic settled-frame evidence is captured in captureSettledFrames.
  await drive(page, { type: 'START' })
  await settleQuick(page)
  shots.push(await snapshot(page, '01-narrator-wide'))
  check('narrator returns wide', shots.at(-1).speaker === null)

  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settleQuick(page)
  const shellsSettled = await snapshot(page, '02-shell-opening')
  shots.push(shellsSettled)
  check('shell medium shot active', shellsSettled.speaker === 'shell' && Boolean(shellsSettled.speakerFraming))
  check('shell authored medium width', (shellsSettled.speakerFraming?.visibleWidthShare ?? 0) >= 0.2 && (shellsSettled.speakerFraming?.visibleWidthShare ?? 0) <= 0.35, shellsSettled.speakerFraming?.visibleWidthShare)

  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settleQuick(page)
  const moriShot = await snapshot(page, '03-mori-opening')
  shots.push(moriShot)
  check('mori medium shot active', moriShot.speaker === 'mori' && Boolean(moriShot.speakerFraming))

  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settleQuick(page)
  const shellSecond = await snapshot(page, '04-shell-second', false)
  check(
    'shell target deterministic across visits',
    JSON.stringify(shellSecond.speakerFraming?.position) === JSON.stringify(shellsSettled.speakerFraming?.position),
    { first: shellsSettled.speakerFraming?.position, second: shellSecond.speakerFraming?.position },
  )

  // To briefing then chapter 1 advisors (grumble, mori, bolt, pip, bolt).
  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settleQuick(page, 200)
  const briefingShot = await snapshot(page, '05-briefing-wide', false)
  check('briefing wide', briefingShot.speaker === null)
  await drive(page, { type: 'BEGIN_CHAPTER' })
  await settleQuick(page)
  const speakerShots = []
  for (let index = 0; index < 5; index += 1) {
    if (index > 0) {
      await drive(page, { type: 'ADVANCE_DIALOGUE' })
      await settleQuick(page)
    }
    const shot = await snapshot(page, `06-advisor-${index + 1}-${shotLabel(index)}`, false)
    shots.push(shot)
    speakerShots.push(shot)
  }
  const visited = [
    ...new Set(
      [shellsSettled.speaker, moriShot.speaker, ...speakerShots.map((shot) => shot.speaker)].filter(Boolean),
    ),
  ]
  check('all five speakers visited', ['shell', 'mori', 'pip', 'bolt', 'grumble'].every((id) => visited.includes(id)), visited)
  check('all five speakers have a medium target', speakerShots.every((shot) => Boolean(shot.speakerFraming)), speakerShots.map((shot) => shot.speaker))

  // Same-speaker continuation: dispatch an extra ADVANCE while still in a
  // multi-line advisor run, then compare camera only if the speaker repeats.
  // (The story's boss block is used later for a guaranteed repeat.)

  // Voting wide.
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    // Drain remaining advisor lines into voting.
    for (let guard = 0; guard < 20 && store.state.phase === 'advisors'; guard += 1) {
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
  })
  await settle(page, 800)
  const votingShot = await snapshot(page, '07-voting-wide', false)
  shots.push(votingShot)
  check('voting wide', votingShot.speaker === null && votingShot.phase === 'voting', votingShot.phase)

  // Commit D1 and inspect the factory camera.
  await drive(page, { type: 'SELECT_CHOICE', choice: 'B' })
  await drive(page, { type: 'COMMIT_CHOICE' })
  await settle(page, 1200)
  const factoryShot = await snapshot(page, '08-factory-wide', false)
  shots.push(factoryShot)
  check('factory mode active', factoryShot.phase === 'factory', factoryShot.phase)
  const factoryDebug = await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo())
  check('factory camera preset', factoryDebug?.mode === 'factory' && factoryDebug?.factoryView === 'wide', factoryDebug)
  void factoryShot
  // Skip/let it complete, then leave the factory into feedback -> boss.
  await page.evaluate(() => window.__GAME__?.scene?.skipFactory())
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done', null, { timeout: 15000 })
  await drive(page, { type: 'LEAVE_FACTORY' })
  await settleQuick(page, 200)
  const feedbackShot = await snapshot(page, '09-feedback-speaker', false)
  check('feedback refocuses a speaker', Boolean(feedbackShot.framing), feedbackShot.speaker)

  // Boss block: consecutive Shell lines are a guaranteed same-speaker run.
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    for (let guard = 0; guard < 20 && store.state.phase === 'feedback'; guard += 1) {
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
  })
  await settle(page, 900)
  const bossFirst = await snapshot(page, '10-boss-shell-first', false)
  const bossLines = await page.evaluate(() => {
    const store = window.__GAME__?.store
    return { phase: store.state.phase, dialogueIndex: store.state.dialogueIndex }
  })
  const beforeSame = await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo().camera)
  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settle(page, 60)
  await settle(page, 500)
  const bossSecond = await snapshot(page, '11-boss-shell-second', false)
  void bossFirst
  void bossSecond
  const afterSame = await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo().camera)
  check(
    'same-speaker continuation does not move camera',
    bossLines.phase === 'boss' && JSON.stringify(beforeSame) === JSON.stringify(afterSame),
    { beforeSame, afterSame, bossLines },
  )

  // Rapid speaker changes: rewind to the opening and mash through it.
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    store.dispatch({ type: 'JUMP_CHAPTER', chapterIndex: 0 })
    store.dispatch({ type: 'START' })
  })
  await settle(page, 850)
  // JUMP lands on briefing; START is a no-op outside title, so force opening
  // through a fresh reload is more reliable than fighting the transition.
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await settle(page, 300)
  await drive(page, { type: 'START' })
  await settle(page, 900)
  await page.evaluate(async () => {
    const store = window.__GAME__?.store
    // Line 1 shell -> line 2 mori -> line 3 shell, 55 ms apart.
    for (let index = 0; index < 3; index += 1) {
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      await new Promise((resolve) => setTimeout(resolve, 55))
    }
  })
  await settle(page, 1100)
  const rapidDebug = await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo())
  const finalPose = rapidDebug?.speakerFraming
  const cameraOk =
    finalPose &&
    rapidDebug.camera.every((value, index) => Math.abs(value - finalPose.position[index]) < 0.02)
  check('rapid speaker changes settle on final pose', Boolean(cameraOk), {
    camera: rapidDebug?.camera,
    finalPose,
    speaker: rapidDebug?.speaker,
  })
  check('rapid settle leaves no NaN', !rapidDebug?.camera.some((value) => !Number.isFinite(value)), rapidDebug?.camera)

  // Settle timing for a real speaker change (mori -> shell in the opening).
  const settleTiming = await page.evaluate(async () => {
    const store = window.__GAME__?.store
    const scene = window.__GAME__?.scene
    // Reload state to opening, then walk to line 1 (shell) and line 2 (mori).
    store.dispatch({ type: 'RESET' })
    await new Promise((resolve) => setTimeout(resolve, 80))
    store.dispatch({ type: 'START' })
    await new Promise((resolve) => setTimeout(resolve, 80))
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // shell
    const shellWait = performance.now()
    while (
      (scene.cameraTweens ?? []).some((tween) => tween.isActive()) &&
      performance.now() - shellWait < 25_000
    ) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    const before = scene.camera.position.toArray()
    const start = performance.now()
    store.dispatch({ type: 'ADVANCE_DIALOGUE' }) // mori
    const first = scene.camera.position.toArray()
    const samples = []
    let elapsed = 0
    while (performance.now() - start < 25_000) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const tweens = scene.cameraTweens ?? []
      samples.push({
        t: performance.now() - start,
        active: tweens.filter((tween) => tween.isActive()).length,
      })
      if (tweens.every((tween) => !tween.isActive())) {
        elapsed = performance.now() - start
        break
      }
    }
    const debug = scene.getDebugInfo()
    const target = debug.speakerFraming?.position
    const settledError = target
      ? Math.max(...scene.camera.position.toArray().map((value, index) => Math.abs(value - target[index])))
      : null
    return {
      elapsed: Number(elapsed.toFixed(1)),
      before,
      first,
      final: scene.camera.position.toArray(),
      target,
      settledError,
      speaker: debug.speaker,
      authoredDuration: debug.lastFocusDuration,
      tweenDurations: scene.cameraTweens.map((tween) => Number(tween.duration().toFixed(3))),
      sampleCount: samples.length,
    }
  })
  check(
    'authored speaker move 0.55-0.8 s',
    (settleTiming.authoredDuration ?? 0) >= 0.55 && (settleTiming.authoredDuration ?? 0) <= 0.8,
    settleTiming,
  )
  check('camera settles on target', (settleTiming.settledError ?? 1) < 0.02, settleTiming.settledError)

  const pageErrorList = [...pageErrors]
  check('no page errors', pageErrorList.length === 0, pageErrorList)

  results.viewports[viewport.name] = {
    shots,
    speakerShots,
    settleTiming,
    factoryDebug,
    pageErrors: pageErrorList,
  }
  results.pageErrors.push(...pageErrorList.map((error) => `${viewport.name}: ${error}`))
  await context.close()
}

/**
 * Deterministic settled-frame evidence. `prefers-reduced-motion` makes
 * applyCameraPose snap, so each screenshot is guaranteed to show the authored
 * final pose instead of a SwiftShader-stretched mid-tween frame. Normal-motion
 * behaviour is measured separately in measureViewport().
 */
async function captureSettledFrames(browser, viewport) {
  results.currentViewport = viewport.name
  results.captureEnabled = true
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await settle(page, 200)
  const check = (name, pass, detail) => {
    results.checks[`${viewport.name}:reduced:${name}`] = { pass, detail }
  }

  const shots = []
  await drive(page, { type: 'START' })
  await settle(page, 100)
  const narrator = await snapshot(page, '01-narrator-wide')
  shots.push(narrator)
  check('narrator wide', narrator.speaker === null && narrator.framing === null)

  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settle(page, 100)
  const shell = await snapshot(page, '02-shell-opening')
  shots.push(shell)
  const shellInstant = await page.evaluate(() => {
    const debug = window.__GAME__?.scene?.getDebugInfo()
    const camera = window.__GAME__?.scene?.camera.position.toArray()
    const target = debug?.speakerFraming?.position
    return {
      reducedMotion: debug?.reducedMotion,
      error: target ? Math.max(...camera.map((value, index) => Math.abs(value - target[index]))) : null,
    }
  })
  check('instant pose', shellInstant.reducedMotion === true && (shellInstant.error ?? 1) < 0.001, shellInstant)
  check('shell medium width', shell.framing && shell.framing.visibleWidthShare >= 0.2 && shell.framing.visibleWidthShare <= 0.35, shell.framing?.visibleWidthShare)
  check('shell medium height', shell.framing && shell.framing.silhouette.bottom - shell.framing.silhouette.top <= 0.6, shell.framing && {
    top: shell.framing.silhouette.top,
    bottom: shell.framing.silhouette.bottom,
  })
  check('shell face above overlay', shell.framing && shell.framing.headCenter.y < shell.panelTopShare, {
    face: shell.framing?.headCenter.y,
    panelTop: shell.panelTopShare,
  })

  await drive(page, { type: 'ADVANCE_DIALOGUE' })
  await settle(page, 100)
  const mori = await snapshot(page, '03-mori-opening')
  shots.push(mori)

  // Briefing -> advisors: grumble (0), mori (1), bolt (2), pip (3), bolt (4).
  await drive(page, { type: 'ADVANCE_DIALOGUE' }) // briefing
  await settle(page, 100)
  await drive(page, { type: 'BEGIN_CHAPTER' })
  await settle(page, 100)
  const advisorShots = []
  for (let index = 0; index < 5; index += 1) {
    if (index > 0) {
      await drive(page, { type: 'ADVANCE_DIALOGUE' })
      await settle(page, 100)
    }
    const shot = await snapshot(page, `06-advisor-${index + 1}-${shotLabel(index)}`)
    shots.push(shot)
    advisorShots.push(shot)
  }

  const visited = [
    ...new Set([shell.speaker, mori.speaker, ...advisorShots.map((shot) => shot.speaker)].filter(Boolean)),
  ]
  check('all five speakers photographed', ['shell', 'mori', 'pip', 'bolt', 'grumble'].every((id) => visited.includes(id)), visited)
  for (const shot of [mori, ...advisorShots]) {
    if (!shot.framing) {
      check(`${shot.speaker ?? 'unknown'} framing present`, false, shot)
      continue
    }
    const { left, right } = shot.framing.silhouette
    const visibleWidth = shot.framing.visibleWidthShare
    const height = shot.framing.silhouette.bottom - shot.framing.silhouette.top
    const centerX = (left + right) / 2
    check(`${shot.speaker} visible width 20-35%`, visibleWidth >= 0.2 && visibleWidth <= 0.35, Number(visibleWidth.toFixed(3)))
    check(`${shot.speaker} height 40-60%`, height >= 0.4 && height <= 0.6, Number(height.toFixed(3)))
    check(`${shot.speaker} centred`, Math.abs(centerX - 0.5) <= 0.14, Number(centerX.toFixed(3)))
    check(
      `${shot.speaker} dominates visible neighbours`,
      shot.framing.maxNeighbourProminence <= 0.8,
      { maxNeighbourProminence: shot.framing.maxNeighbourProminence, neighbours: shot.framing.neighbours },
    )
    check(
      `${shot.speaker} no clipped neighbour sliver`,
      !shot.framing.neighbours.some((neighbour) => neighbour.clipped && neighbour.visibleWidthShare > 0.03),
      shot.framing.neighbours,
    )
    check(`${shot.speaker} face+shoulders above overlay`, shot.framing.headCenter.y < shot.panelTopShare && shot.framing.shoulders.y < shot.panelTopShare, {
      face: Number(shot.framing.headCenter.y.toFixed(3)),
      shoulders: Number(shot.framing.shoulders.y.toFixed(3)),
      panelTop: Number(shot.panelTopShare.toFixed(3)),
    })
    check(`${shot.speaker} no occluder`, shot.framing.occluders.length === 0, shot.framing.occluders)
    check(`${shot.speaker} ears not clipped`, shot.framing.silhouette.top > 0 && shot.framing.silhouette.left > 0 && shot.framing.silhouette.right < 1, {
      top: shot.framing.silhouette.top,
      left,
      right,
    })
  }

  check('no page errors', pageErrors.length === 0, pageErrors)
  results.reducedMotion = results.reducedMotion ?? {}
  results.reducedMotion[viewport.name] = { shots, pageErrors }
  results.pageErrors.push(...pageErrors.map((error) => `${viewport.name} reduced: ${error}`))
  await context.close()
}

const browser = await chromium.launch({ headless: true, args: ARGS })
try {
  for (const viewport of VIEWPORTS) {
    results.captureEnabled = false
    await measureViewport(browser, viewport)
  }
  for (const viewport of VIEWPORTS) {
    await captureSettledFrames(browser, viewport)
  }
} finally {
  await browser.close()
}

const checks = Object.entries(results.checks)
const failed = checks.filter(([, value]) => !value.pass)
results.summary = {
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.map(([name, value]) => ({ name, detail: value.detail })),
}
await writeFile(join(HERE, 'p5-measurement.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results.summary, null, 2))
if (failed.length > 0) {
  for (const [name, value] of failed) console.log(`FAIL ${name}:`, JSON.stringify(value.detail))
}
