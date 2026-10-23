import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://127.0.0.1:5199/'
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)

await page.evaluate(() => {
  window.__clicks = []
  window.__mutations = []
  document.addEventListener('click', (event) => {
    const target = event.target
    window.__clicks.push({
      tag: target?.tagName,
      id: target?.id,
      action: target?.closest?.('[data-action]')?.getAttribute('data-action') ?? null,
      phase: window.__GAME_STATE__?.phase,
      layerHidden: document.querySelector('#presenter-layer')?.hidden,
      hasDrawer: Boolean(document.querySelector('.presenter-drawer')),
    })
  }, true)
  const layer = document.querySelector('#presenter-layer')
  new MutationObserver(() => {
    window.__mutations.push({
      hidden: layer.hidden,
      hasDrawer: Boolean(document.querySelector('.presenter-drawer')),
      at: performance.now(),
    })
  }).observe(layer, { attributes: true, childList: true, subtree: true })
})

await page.locator('#presenter-button').click()
await page.waitForTimeout(800)
const result = await page.evaluate(() => ({
  clicks: window.__clicks,
  mutations: window.__mutations,
  layerHidden: document.querySelector('#presenter-layer')?.hidden,
  hasDrawer: Boolean(document.querySelector('.presenter-drawer')),
  active: document.activeElement?.id || document.activeElement?.className,
}))
console.log(JSON.stringify(result, null, 2))
await browser.close()
