import { chromium } from '@playwright/test'

const url = process.argv[2]
if (!url) throw new Error('Usage: node scripts/subpath-smoke.mjs <base-url>')
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })
const origin = new URL(url).origin
const external = []
const failed = []
const consoleErrors = []
const localAssetPaths = []
page.on('request', (request) => {
  const requestUrl = request.url()
  if (!requestUrl.startsWith(origin) && !requestUrl.startsWith('data:') && !requestUrl.startsWith('blob:')) {
    external.push(requestUrl)
  }
  if (requestUrl.startsWith(origin) && /\/assets\//.test(requestUrl)) localAssetPaths.push(new URL(requestUrl).pathname)
})
page.on('requestfailed', (request) => failed.push(`${request.url()} :: ${request.failure()?.errorText}`))
page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR ${error.message}`))
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)
await page.getByRole('button', { name: /^Start$/i }).click()
await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
const info = await page.evaluate(() => ({
  ready: window.__GAME_READY__,
  phase: window.__GAME_STATE__?.phase,
  title: document.title,
  scene: window.__GAME__?.scene?.getDebugInfo() ?? null,
  avatars: window.__GAME__?.scene ? Array.from(window.__GAME__.scene.boardroom.avatars.values()).map((a) => ({ root: a.root.name, source: a.source })) : [],
}))
console.log(JSON.stringify({ url, info, external, failed, consoleErrors, glbPaths: localAssetPaths.filter((path) => path.endsWith('.glb')), bundlePaths: localAssetPaths.filter((path) => !path.endsWith('.glb')).slice(0, 6) }, null, 2))
await browser.close()
