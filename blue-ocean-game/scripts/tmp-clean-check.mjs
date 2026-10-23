import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://127.0.0.1:5199/'
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({
  viewport: { width: 1366, height: 768 },
  reducedMotion: 'reduce',
})
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)

const title = await page.evaluate(() => {
  const art = document.querySelector('#title-art')
  const start = document.querySelector('[data-action="start"]')
  return {
    art: art ? { w: art.naturalWidth, h: art.naturalHeight } : null,
    start: start?.textContent?.trim() ?? null,
    visibleStart: start ? start.getBoundingClientRect().width > 0 : false,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }
})

const gearDiag = await page.evaluate(() => {
  const button = document.querySelector('#presenter-button')
  const box = button.getBoundingClientRect()
  const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  const hit = document.elementFromPoint(center.x, center.y)
  const chain = []
  let node = hit
  while (node && chain.length < 6) {
    chain.push({ tag: node.tagName, id: node.id, cls: node.className?.toString?.().slice(0, 80), z: getComputedStyle(node).zIndex, pe: getComputedStyle(node).pointerEvents })
    node = node.parentElement
  }
  return {
    box: { left: box.left, top: box.top, width: box.width, height: box.height },
    hit: { tag: hit?.tagName, id: hit?.id, cls: hit?.className?.toString?.().slice(0, 80), action: hit?.closest?.('[data-action]')?.getAttribute('data-action') ?? null },
    chain,
    titleZ: getComputedStyle(document.querySelector('.title-screen')).zIndex,
    hudZ: getComputedStyle(document.querySelector('.hud')).zIndex,
    viewZ: getComputedStyle(document.querySelector('.view')).zIndex,
  }
})

let domClick = 'ok'
try {
  await page.evaluate(() => document.querySelector('#presenter-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
} catch (error) {
  domClick = String(error)
}
await page.waitForTimeout(200)
const drawerAfterDomClick = await page.evaluate(() => ({
  drawer: Boolean(document.querySelector('.presenter-drawer')),
  presenterOpen: Boolean(document.querySelector('#presenter-layer') && !document.querySelector('#presenter-layer').hidden),
  html: document.querySelector('#presenter-layer')?.innerHTML?.slice(0, 120) ?? '',
}))
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

let pointerClick = 'ok'
try {
  await page.locator('#presenter-button').click({ timeout: 5000 })
} catch (error) {
  pointerClick = String(error).slice(0, 300)
}
await page.waitForTimeout(500)
const drawerAfterPointerClick = await page.evaluate(() => ({
  drawer: Boolean(document.querySelector('.presenter-drawer')),
  presenterOpen: Boolean(document.querySelector('#presenter-layer') && !document.querySelector('#presenter-layer').hidden),
}))
await page.keyboard.press('Escape')

await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'SHOW_FINALE' }))
await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'finale')
await page.waitForTimeout(500)
const finale = await page.evaluate(() => {
  const button = document.querySelector('[data-action="open-archive"]')
  if (!button) return null
  const box = button.getBoundingClientRect()
  const style = getComputedStyle(button)
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
  return {
    box: { left: box.left, top: box.top, width: box.width, height: box.height },
    pointerEvents: style.pointerEvents,
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    hitTag: hit?.tagName,
    hitAction: hit?.closest?.('[data-action]')?.getAttribute('data-action') ?? null,
    phase: window.__GAME_STATE__?.phase,
  }
})
let domArchiveClick = 'ok'
try {
  await page.evaluate(() => document.querySelector('[data-action="open-archive"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
} catch (error) {
  domArchiveClick = String(error)
}
await page.waitForTimeout(300)
const archiveAfterDomClick = await page.evaluate(() => ({
  phase: window.__GAME_STATE__?.phase,
  archiveVisible: Boolean(document.querySelector('.archive-screen')),
}))
let clickResult = 'ok'
let clickMs = 0
if (!archiveAfterDomClick.archiveVisible) {
  const clickStart = Date.now()
  try {
    await page.locator('[data-action="open-archive"]').click({ timeout: 15000 })
  } catch (error) {
    clickResult = String(error).slice(0, 300)
  }
  clickMs = Date.now() - clickStart
}
const archive = await page.evaluate(() => ({
  phase: window.__GAME_STATE__?.phase,
  heading: document.querySelector('.archive-screen h2')?.textContent?.trim() ?? null,
  archiveVisible: Boolean(document.querySelector('.archive-screen')),
  overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}))

console.log(JSON.stringify({ title, gearDiag, domClick, drawerAfterDomClick, pointerClick, drawerAfterPointerClick, finale, domArchiveClick, archiveAfterDomClick, clickMs, clickResult, archive, errors }, null, 2))
await browser.close()
