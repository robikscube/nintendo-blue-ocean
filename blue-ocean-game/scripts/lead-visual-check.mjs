import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173/'
await mkdir('qa-screens', { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

async function seedToVoting(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await page.evaluate(() => {
    const store = window.__GAME__.store
    if (store.state.phase === 'title') store.dispatch({ type: 'START' })
    const dialoguePhases = new Set(['opening', 'advisors', 'feedback', 'boss'])
    for (let guard = 0; guard < 40; guard += 1) {
      if (!dialoguePhases.has(store.state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
    if (store.state.phase === 'briefing') store.dispatch({ type: 'BEGIN_CHAPTER' })
    for (let guard = 0; guard < 40; guard += 1) {
      if (!dialoguePhases.has(store.state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'voting')
}

for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await seedToVoting(page)
  await page.waitForTimeout(250)
  const vote = await page.evaluate(() => {
    const detail = document.querySelector('.choice-detail')
    const tradeoff = document.querySelector('.choice-tradeoff > span')
    const button = document.querySelector('[data-action="commit-choice"]')
    const screen = document.querySelector('.voting-screen')
    const lastCard = document.querySelectorAll('.choice-card')[2]
    return {
      detail: detail ? getComputedStyle(detail).fontSize : null,
      tradeoff: tradeoff ? getComputedStyle(tradeoff).fontSize : null,
      buttonBottom: button ? Math.round(button.getBoundingClientRect().bottom) : null,
      cardBottom: lastCard ? Math.round(lastCard.getBoundingClientRect().bottom) : null,
      screenScroll: screen ? { scrollHeight: screen.scrollHeight, clientHeight: screen.clientHeight } : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })
  await page.screenshot({ path: `qa-screens/lead-vote-${width}x${height}.png` })

  await page.evaluate(() => {
    const store = window.__GAME__.store
    store.dispatch({ type: 'SELECT_CHOICE', choice: 'B' })
    store.dispatch({ type: 'COMMIT_CHOICE' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
  await page.waitForTimeout(350)
  const factory = await page.evaluate(() => {
    const card = document.querySelector('.factory-card')
    const label = document.querySelector('.factory-truth')
    const stamp = document.querySelector('.factory-truth')
    const scene = window.__GAME__.scene
    const mount = scene?.factory?.prototypeMount
    let prototypeBox = null
    if (mount) {
      const camera = scene.camera
      const vec = camera.position.clone()
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      mount.traverse((object) => {
        if (!object.isMesh) return
        object.getWorldPosition(vec)
        const projected = vec.clone().project(camera)
        const px = (projected.x * 0.5 + 0.5) * window.innerWidth
        const py = (-projected.y * 0.5 + 0.5) * window.innerHeight
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      })
      prototypeBox = { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) }
    }
    const cardRect = card?.getBoundingClientRect()
    return {
      card: cardRect ? { left: Math.round(cardRect.left), width: Math.round(cardRect.width), top: Math.round(cardRect.top), bottom: Math.round(cardRect.bottom), scrollHeight: card.scrollHeight, clientHeight: card.clientHeight } : null,
      labelFont: label ? getComputedStyle(label).fontSize : null,
      stampFont: stamp ? getComputedStyle(stamp).fontSize : null,
      prototypeBox,
      overlapPx: prototypeBox && cardRect ? Math.round(Math.max(0, prototypeBox.maxX - cardRect.left)) : null,
      buttonVisible: (() => {
        const button = document.querySelector('[data-action="leave-factory"]')
        if (!button) return false
        const r = button.getBoundingClientRect()
        return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth
      })(),
    }
  })
  await page.screenshot({ path: `qa-screens/lead-factory-${width}x${height}.png` })

  await page.evaluate(() => {
    const store = window.__GAME__.store
    store.dispatch({ type: 'SHOW_FINALE' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'finale')
  await page.waitForTimeout(250)
  await page.locator('[data-action="open-archive"]').click()
  await page.waitForTimeout(250)
  const archive = await page.evaluate(() => {
    const screen = document.querySelector('.archive-screen')
    const sourceDate = document.querySelector('.source-date')
    const pathNote = document.querySelector('.path-note')
    const caution = document.querySelector('.history-caution')
    return {
      scroll: screen ? { scrollHeight: screen.scrollHeight, clientHeight: screen.clientHeight } : null,
      sourceDateFont: sourceDate ? getComputedStyle(sourceDate).fontSize : null,
      pathNoteFont: pathNote ? getComputedStyle(pathNote).fontSize : null,
      cautionFont: caution ? getComputedStyle(caution).fontSize : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })
  await page.screenshot({ path: `qa-screens/lead-archive-${width}x${height}.png` })
  console.log(JSON.stringify({ viewport: `${width}x${height}`, vote, factory, archive, errors }, null, 2))
  await page.close()
}
await browser.close()
