/* P4 one-off boardroom composition measurement (not part of the app/test suite). */
import { chromium } from 'file:///C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))
mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:5173/'
const SIZES = [
  { width: 1920, height: 1080, tag: '1920x1080' },
  { width: 1366, height: 768, tag: '1366x768' },
]

const results = []
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: SIZES[0], deviceScaleFactor: 1 })

for (const size of SIZES) {
  const page = await context.newPage()
  await page.setViewportSize({ width: size.width, height: size.height })
  // P5 has frozen scene-director.ts. Do not block Vite's client: in this dev
  // setup aborting it prevents the module graph from booting.
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 })
  await page.getByRole('button', { name: /Enter the boardroom/i }).click({ force: true })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening', null, { timeout: 15000 })
  await page.waitForTimeout(1400)

  const waitForCameraSettled = async () => {
    let previous = null
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const current = await page.evaluate(() => {
        const info = window.__GAME__?.scene?.getDebugInfo()
        return info ? { camera: info.camera, look: info.look } : null
      })
      if (!current) return false
      const same =
        previous &&
        current.camera.every((value, index) => Math.abs(value - previous.camera[index]) < 0.015) &&
        current.look.every((value, index) => Math.abs(value - previous.look[index]) < 0.015)
      if (same) return true
      previous = current
      await page.waitForTimeout(240)
    }
    return false
  }

  const capture = async (label, note) => {
    await page.screenshot({
      path: join(OUT, `p4-${size.tag}-${label}.png`),
      timeout: 60000,
      animations: 'disabled',
      caret: 'hide',
    })
    const data = await measure(page)
    results.push({ size: size.tag, label, note: note ?? '', ...data })
    console.log(`\n=== ${size.tag} / ${label} ===`)
    console.log(JSON.stringify(data, null, 2))
  }

  const advanceToNextLine = async () => {
    const before = await page.evaluate(() => ({
      index: window.__GAME_STATE__?.dialogueIndex,
      phase: window.__GAME_STATE__?.phase,
      speaker: window.__GAME_STATE__?.phase,
    }))
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.keyboard.press('Space')
      await page.waitForTimeout(320)
      const after = await page.evaluate(() => ({
        index: window.__GAME_STATE__?.dialogueIndex,
        phase: window.__GAME_STATE__?.phase,
      }))
      if (after.index !== before.index || after.phase !== before.phase) return after
    }
    return null
  }

  // Narrator wide frame.
  await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 0, null, { timeout: 10000 })
  await page.waitForTimeout(300)
  await waitForCameraSettled()
  await capture('narrator-wide', 'opening narrator, ensemble wide')

  const seen = new Set()
  const captureSpeaker = async () => {
    const state = await page.evaluate(() => window.__GAME_STATE__)
    const speaker = state?.phase === 'opening' || state?.phase === 'advisors' ? (await page.evaluate(() => window.render_game_to_text ? JSON.parse(window.render_game_to_text()).speaker : null)) : null
    if (speaker && speaker !== 'narrator' && !seen.has(speaker)) {
      seen.add(speaker)
      // Let P5's 0.62-0.78 s reframe and any GSAP fov tween settle before both
      // the screenshot and the measurement, so they describe the same frame.
      await page.waitForTimeout(1500)
      const settled = await waitForCameraSettled()
      await page.waitForTimeout(120)
      await capture(`speaker-${speaker}`, `${state.phase} line, cameraSettled=${settled}`)
    }
  }

  // Opening: shell, mori. Then briefing -> advisors: mori, pip, grumble, bolt.
  for (let i = 0; i < 8; i += 1) {
    await captureSpeaker()
    const phase = await page.evaluate(() => window.__GAME_STATE__?.phase)
    if (phase !== 'opening') break
    const next = await advanceToNextLine()
    if (!next) break
  }

  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'briefing', null, { timeout: 15000 })
  await page.getByRole('button', { name: /Convene the board/i }).click({ force: true })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors', null, { timeout: 15000 })
  await page.waitForTimeout(600)

  for (let i = 0; i < 14; i += 1) {
    await captureSpeaker()
    const phase = await page.evaluate(() => window.__GAME_STATE__?.phase)
    if (phase !== 'advisors') break
    const next = await advanceToNextLine()
    if (!next) break
  }

  // One final ensemble check at the voting screen (narrator/choice wide).
  await page.waitForFunction(() => ['voting', 'briefing'].includes(window.__GAME_STATE__?.phase), null, { timeout: 15000 })
  await page.waitForTimeout(1200)
  await waitForCameraSettled()
  await capture('voting-wide', 'voting/ensemble wide')

  results.push({ size: size.tag, pageErrors, consoleErrors, seenSpeakers: [...seen] })
  await page.close()
}

writeFileSync(join(OUT, 'p4-measure-results.json'), JSON.stringify(results, null, 2))
await browser.close()

async function measure(page) {
  return page.evaluate(() => {
    const sceneApi = window.__GAME__?.scene
    if (!sceneApi) return { error: 'no scene' }
    const boardroom = sceneApi.boardroom
    const camera = sceneApi.camera
    const width = window.innerWidth
    const height = window.innerHeight
    camera.updateMatrixWorld(true)

    const V = camera.position.constructor
    const toScreen = (vector) => {
      const projected = vector.clone().project(camera)
      return {
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        ndcX: projected.x,
        ndcY: projected.y,
        ndcZ: projected.z,
      }
    }

    const sampleObject = (root) => {
      root.updateWorldMatrix(true, true)
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      let vertices = 0
      const world = new V()
      const worldPoints = []
      root.traverse((object) => {
        if (!object.visible) return
        const mesh = object
        if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return
        const attr = mesh.geometry.attributes.position
        for (let index = 0; index < attr.count; index += 1) {
          world.fromBufferAttribute(attr, index).applyMatrix4(mesh.matrixWorld)
          worldPoints.push({ x: world.x, y: world.y, z: world.z })
          const p = toScreen(world)
          if (p.x < minX) minX = p.x
          if (p.x > maxX) maxX = p.x
          if (p.y < minY) minY = p.y
          if (p.y > maxY) maxY = p.y
          vertices += 1
        }
      })
      const xs = worldPoints.map((p) => p.x)
      const ys = worldPoints.map((p) => p.y)
      const zs = worldPoints.map((p) => p.z)
      return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        vertices,
        worldPoints,
        worldBox: {
          min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
          max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)],
        },
      }
    }

    const table = { cx: 0, cz: 0.55, rx: 4.4, rz: 2.75, topMin: 1.45, topMax: 1.9 }
    const insideTable = (x, z, y) =>
      y >= table.topMin &&
      y <= table.topMax &&
      (x * x) / (table.rx * table.rx) + ((z - table.cz) * (z - table.cz)) / (table.rz * table.rz) <= 1

    const avatars = []
    for (const [id, avatar] of boardroom.avatars) {
      const sample = sampleObject(avatar.root)
      avatar.root.updateWorldMatrix(true, true)
      const headWorld = avatar.headAnchor.getWorldPosition(new V())
      const head = toScreen(headWorld)
      const floor = new V()
      avatar.root.getWorldPosition(floor)
      const tableIntersections = sample.worldPoints.filter((p) => insideTable(p.x, p.z, p.y)).length
      const rootEllipseX = (floor.x * floor.x) / (table.rx * table.rx)
      const tableFarEdge = rootEllipseX <= 1 ? table.cz - table.rz * Math.sqrt(1 - rootEllipseX) : null
      avatars.push({
        id,
        root: [Number(floor.x.toFixed(2)), 0, Number(floor.z.toFixed(2))],
        facing: Number(avatar.root.rotation.y.toFixed(2)),
        bbox: {
          minX: Math.round(sample.minX),
          maxX: Math.round(sample.maxX),
          minY: Math.round(sample.minY),
          maxY: Math.round(sample.maxY),
          width: Math.round(sample.width),
          height: Math.round(sample.height),
        },
        centerX: Math.round((sample.minX + sample.maxX) / 2),
        headPx: { x: Math.round(head.x), y: Math.round(head.y), ndcZ: Number(head.ndcZ.toFixed(3)) },
        headWorld: [Number(headWorld.x.toFixed(2)), Number(headWorld.y.toFixed(3)), Number(headWorld.z.toFixed(2))],
        inFrame:
          sample.minX >= 0 && sample.maxX <= width && sample.minY >= 0 && sample.maxY <= height,
        tableIntersections,
        tableFarEdgeAtRoot: tableFarEdge === null ? null : Number(tableFarEdge.toFixed(2)),
        frontMostZ: Number(Math.min(...sample.worldPoints.map((p) => p.z)).toFixed(2)),
        worldBox: sample.worldBox,
      })
    }
    avatars.sort((a, b) => a.centerX - b.centerX)
    const gaps = []
    for (let i = 0; i < avatars.length - 1; i += 1) {
      const left = avatars[i]
      const right = avatars[i + 1]
      const gap = right.bbox.minX - left.bbox.maxX
      const avgWidth = (left.bbox.width + right.bbox.width) / 2
      gaps.push({
        pair: `${left.id}-${right.id}`,
        gapPx: gap,
        leftWidthPx: left.bbox.width,
        rightWidthPx: right.bbox.width,
        avgBodyWidthPx: Math.round(avgWidth),
        gapInBodyWidths: Number((gap / avgWidth).toFixed(2)),
      })
    }

    const dialogueCandidates = [...document.querySelectorAll('.dialogue-panel, .dialogue-shell, [class*="dialogue"]')]
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 300 && rect.height > 70 && rect.top < window.innerHeight)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)
    const overlay = dialogueCandidates[0]?.rect ?? null
    const overlayTop = overlay ? Math.round(overlay.top) : null
    const faces = avatars.map((a) => ({
      id: a.id,
      headY: a.headPx.y,
      headX: a.headPx.x,
      aboveOverlay: overlayTop === null ? null : a.headPx.y < overlayTop - 12,
      insideFrame: a.headPx.x > 0 && a.headPx.x < width && a.headPx.y > 0 && a.headPx.y < height,
    }))

    // Table props (mugs/papers/pocket screen) vs avatar world bounds.
    const propNames = [
      'mug-0',
      'mug-1',
      'mug-2',
      'mug-3',
      'mug-4',
      'pocket-screen-prop',
      ...Array.from({ length: 7 }, (_, index) => `board-paper-${index}`),
    ]
    const propOverlaps = []
    for (const name of propNames) {
      const prop = boardroom.group.getObjectByName(name)
      if (!prop) continue
      const sample = sampleObject(prop)
      for (const avatar of avatars) {
        const a = avatar.worldBox
        const b = sample.worldBox
        const overlaps =
          a.min[0] < b.max[0] && a.max[0] > b.min[0] &&
          a.min[1] < b.max[1] && a.max[1] > b.min[1] &&
          a.min[2] < b.max[2] && a.max[2] > b.min[2]
        if (overlaps) propOverlaps.push({ prop: name, avatar: avatar.id })
      }
    }

    // Chair/table intersection from named chair groups.
    const chairs = []
    for (const [id, avatar] of boardroom.avatars) {
      const chair = boardroom.group.getObjectByName(`chair-${id}`)
      if (!chair) continue
      const sample = sampleObject(chair)
      const intersections = sample.worldPoints.filter((p) => insideTable(p.x, p.z, p.y)).length
      chairs.push({ id, tableIntersections: intersections, minY: Math.round(sample.minY), maxY: Math.round(sample.maxY), bboxWidth: Math.round(sample.width) })
    }

    const debug = sceneApi.getDebugInfo()
    return {
      viewport: { width, height },
      camera: debug.camera,
      look: debug.look,
      cameraFov: Number(camera.fov.toFixed(2)),
      overlayTop,
      overlay: overlay ? { left: Math.round(overlay.left), top: Math.round(overlay.top), width: Math.round(overlay.width), height: Math.round(overlay.height) } : null,
      avatars,
      gaps,
      faces,
      propOverlaps,
      chairs,
      drawCalls: debug.drawCalls,
      triangles: debug.triangles,
    }
  })
}
