/**
 * Round 1 lead acceptance capture.
 *
 * Drives the real game through narrator + all five speaking characters at
 * 1920x1080 and 1366x768, saves settled screenshots, and records:
 * - dialogue bubble geometry / type / name tag / marker state
 * - projected avatar silhouettes, face anchors, wide-shot gaps
 * - camera pose and P5 framing debug
 *
 * Run from blue-ocean-game after the dev server or preview is up:
 *   node scripts/round1-acceptance.mjs http://127.0.0.1:5173/
 */
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173/'
const OUT = 'qa-screens/round1'
const REPORT = '../agent-reports/round1/lead-final-verification.json'
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
]
const SPEAKER_NAME_TO_ID = {
  'Boardroom': 'narrator',
  'Shelldon': 'shell',
  'Hootley': 'mori',
  'Slyvester': 'pip',
  'Pawson': 'grumble',
  'Damian': 'bolt',
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

const report = { base: BASE, capturedAt: new Date().toISOString(), viewports: [] }

async function open(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30_000 })
}

async function start(page) {
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('Game store unavailable')
    if (store.state.phase === 'title') store.dispatch({ type: 'START' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening', null, { timeout: 10_000 })
  await page.waitForTimeout(500)
}

async function advance(page) {
  const before = await page.evaluate(() => ({
    phase: window.__GAME_STATE__?.phase,
    index: window.__GAME_STATE__?.dialogueIndex,
  }))
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('Game store unavailable')
    store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  })
  await page.waitForTimeout(120)
  const after = await page.evaluate(() => ({
    phase: window.__GAME_STATE__?.phase,
    index: window.__GAME_STATE__?.dialogueIndex,
  }))
  return { before, after }
}

async function beginChapter(page) {
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('Game store unavailable')
    const isDialogue = (phase) => ['opening', 'advisors', 'feedback', 'boss'].includes(phase)
    for (let guard = 0; guard < 40 && isDialogue(store.state.phase); guard += 1) {
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
    if (store.state.phase === 'briefing') store.dispatch({ type: 'BEGIN_CHAPTER' })
  })
  await page.waitForTimeout(250)
}

async function snapshot(page, label) {
  return page.evaluate((captureLabel) => {
    const store = window.__GAME__?.store
    const scene = window.__GAME__?.scene
    if (!store || !scene) throw new Error('Game or scene unavailable')
    const state = store.state
    const panel = document.getElementById('dialogue-panel')
    const text = document.getElementById('dialogue-text')
    const nameplate = document.getElementById('dialogue-nameplate')
    const marker = document.querySelector('.continue-marker')
    const button = document.getElementById('dialogue-continue')
    const panelRect = panel?.getBoundingClientRect()
    const nameplateRect = nameplate?.getBoundingClientRect()
    const textRect = text?.getBoundingClientRect()
    const markerStyle = marker ? getComputedStyle(marker) : null
    const textStyle = text ? getComputedStyle(text) : null
    const nameplateStyle = nameplate ? getComputedStyle(nameplate) : null
    const panelStyle = panel ? getComputedStyle(panel) : null
    const buttonStyle = button ? getComputedStyle(button) : null

    const camera = scene.camera
    const vectorConstructor = scene.boardroom.avatars.values().next().value.headAnchor.position.constructor
    const all = []
    for (const [id, avatar] of scene.boardroom.avatars) {
      avatar.root.updateWorldMatrix(true, true)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      avatar.root.traverse((object) => {
        if (!object.isMesh || !object.geometry) return
        object.geometry.computeBoundingBox()
        const bb = object.geometry.boundingBox
        if (!bb) return
        for (let ix = 0; ix < 2; ix += 1) {
          for (let iy = 0; iy < 2; iy += 1) {
            for (let iz = 0; iz < 2; iz += 1) {
              const point = new vectorConstructor(
                ix ? bb.max.x : bb.min.x,
                iy ? bb.max.y : bb.min.y,
                iz ? bb.max.z : bb.min.z,
              )
              point.applyMatrix4(object.matrixWorld)
              point.project(camera)
              const px = (point.x * 0.5 + 0.5) * window.innerWidth
              const py = (-point.y * 0.5 + 0.5) * window.innerHeight
              if (px < minX) minX = px
              if (px > maxX) maxX = px
              if (py < minY) minY = py
              if (py > maxY) maxY = py
            }
          }
        }
      })
      const head = avatar.headAnchor.getWorldPosition(new vectorConstructor())
      head.project(camera)
      all.push({
        id,
        inFrame: maxX > 0 && minX < window.innerWidth && maxY > 0 && minY < window.innerHeight,
        bbox: { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) },
        width: Math.round(maxX - minX),
        height: Math.round(maxY - minY),
        centerX: Math.round((minX + maxX) / 2),
        head: { x: Math.round((head.x * 0.5 + 0.5) * window.innerWidth), y: Math.round((-head.y * 0.5 + 0.5) * window.innerHeight) },
      })
    }
    all.sort((a, b) => a.centerX - b.centerX)
    const gaps = []
    for (let index = 1; index < all.length; index += 1) {
      const left = all[index - 1]
      const right = all[index]
      if (!left.inFrame || !right.inFrame) continue
      gaps.push({
        pair: `${left.id}-${right.id}`,
        gapPx: Math.round(right.bbox.minX - left.bbox.maxX),
        leftWidth: left.width,
        rightWidth: right.width,
        gapInAvgBodyWidths: Number(((right.bbox.minX - left.bbox.maxX) / ((left.width + right.width) / 2)).toFixed(2)),
      })
    }
    const speakerName = document.getElementById('speaker-name')?.textContent?.trim() ?? ''
    const speakerId = {
      'Boardroom': 'narrator',
      'Shelldon': 'shell',
      'Hootley': 'mori',
      'Slyvester': 'pip',
      'Pawson': 'grumble',
      'Damian': 'bolt',
    }[speakerName]
    const speaker = all.find((avatar) => avatar.id === speakerId) ?? null
    return {
      label: captureLabel,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      state: { phase: state.phase, dialogueIndex: state.dialogueIndex, speakerName, speakerId },
      camera: scene.getDebugInfo(),
      panel: panelRect ? {
        top: Math.round(panelRect.top),
        bottom: Math.round(panelRect.bottom),
        left: Math.round(panelRect.left),
        right: Math.round(panelRect.right),
        width: Math.round(panelRect.width),
        height: Math.round(panelRect.height),
        classes: panel.className,
        borderWidth: panelStyle?.borderWidth,
        borderRadius: panelStyle?.borderRadius,
        backgroundImage: panelStyle?.backgroundImage,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      } : null,
      text: textRect ? {
        top: Math.round(textRect.top),
        bottom: Math.round(textRect.bottom),
        left: Math.round(textRect.left),
        right: Math.round(textRect.right),
        fontSize: textStyle?.fontSize,
        lineHeight: textStyle?.lineHeight,
        fontFamily: textStyle?.fontFamily,
        color: textStyle?.color,
        lineCountEstimate: textStyle ? Math.round(textRect.height / Number.parseFloat(textStyle.lineHeight)) : null,
      } : null,
      nameplate: nameplateRect ? {
        text: nameplate?.textContent?.trim(),
        top: Math.round(nameplateRect.top),
        bottom: Math.round(nameplateRect.bottom),
        left: Math.round(nameplateRect.left),
        right: Math.round(nameplateRect.right),
        backgroundImage: nameplateStyle?.backgroundImage,
        fontSize: nameplateStyle?.fontSize,
      } : null,
      continueButton: buttonStyle ? {
        width: Math.round(button.getBoundingClientRect().width),
        height: Math.round(button.getBoundingClientRect().height),
        markerAnimation: markerStyle?.animationName,
        markerOpacity: markerStyle?.opacity,
      } : null,
      speaker,
      speakerVisibleWidthSharePct: speaker ? Number((speaker.width / window.innerWidth * 100).toFixed(1)) : null,
      avatars: all,
      gaps,
      pageErrors: window.__ROUND1_PAGE_ERRORS__ ?? [],
    }
  }, label)
}

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => {
    window.__ROUND1_PAGE_ERRORS__ = []
    window.addEventListener('error', (event) => window.__ROUND1_PAGE_ERRORS__.push(event.message))
  })
  await open(page)
  await start(page)

  const captures = []
  const capture = async (label) => {
    await page.waitForTimeout(500)
    const data = await snapshot(page, label)
    data.pageErrors = pageErrors
    const file = `${OUT}/${viewport.name}-${label}.png`
    await page.screenshot({ path: file, timeout: 60_000 })
    data.screenshot = file
    captures.push(data)
    return data
  }

  // Narrator ensemble wide.
  await capture('01-narrator-wide')

  // Opening line 1: Shelldon, medium shot.
  await advance(page)
  await capture('02-shelldon')

  // Opening line 2: Hootley.
  await advance(page)
  await capture('03-hootley')

  // Chapter 1 advisor briefing: Hootley, Slyvester, Pawson, Damian.
  await beginChapter(page)
  await capture('04-advisor-hootley')
  await advance(page)
  await capture('05-advisor-slyvester')
  await advance(page)
  await capture('06-advisor-pawson')
  // Chapter 1 now has a second Slyvester/Pawson exchange before Damian.
  await advance(page)
  await advance(page)
  await advance(page)
  await capture('07-advisor-damian')

  report.viewports.push({ viewport: viewport.name, captures, pageErrors })
  await context.close()
}

await writeFile(REPORT, JSON.stringify(report, null, 2))
await browser.close()

for (const viewport of report.viewports) {
  for (const capture of viewport.captures) {
    console.log(
      `${viewport.viewport} ${capture.label}: speaker=${capture.state.speakerId} ` +
      `widthShare=${capture.speakerVisibleWidthSharePct}% ` +
      `font=${capture.text?.fontSize} panel=${capture.panel?.width}x${capture.panel?.height} ` +
      `gaps=${capture.gaps.map((gap) => `${gap.pair}:${gap.gapInAvgBodyWidths}`).join(',') || '-'} ` +
      `marker=${capture.continueButton?.markerAnimation}`,
    )
  }
}
console.log(`wrote ${REPORT}`)
