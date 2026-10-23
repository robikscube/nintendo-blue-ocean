// Isolated GitHub Pages subpath audit for a subpath-built static preview.
// Usage: node subpath-preview.cjs http://127.0.0.1:4174 /nintendo-next-blue-ocean/
const { chromium } = require('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright')

const BASE = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '')
const BASE_PATH = process.argv[3] || '/nintendo-next-blue-ocean/'
const SUBPATH = `${BASE}${BASE_PATH}`

async function main() {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
  })
  const pageErrors = []
  const failedLocal = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const url = request.url()
    if (url.startsWith(BASE)) failedLocal.push(`${url} ${request.failure()?.errorText ?? ''}`)
  })

  await page.goto(SUBPATH, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('data:') && !name.startsWith('blob:')),
  )
  const outsideSubpath = resources.filter((url) => !url.startsWith(SUBPATH))
  const fallbackHidden = await page.locator('#fallback-note').isHidden()

  await page.evaluate(() => {
    window.__GAME__?.store.dispatch({ type: 'START' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
  await page.evaluate(() => {
    window.__GAME__?.store.dispatch({ type: 'SHOW_FINALE' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'finale')
  await page.evaluate(() => {
    document.querySelector('[data-action="open-archive"]')?.click()
  })
  await page.waitForSelector('.archive-screen')
  const factsPresent = (await page.locator('.archive-screen').innerText()).includes('156.59 million')

  console.log(
    JSON.stringify(
      {
        subpath: SUBPATH,
        ready: true,
        fallbackHidden,
        factsPresent,
        resourceCount: resources.length,
        outsideSubpath,
        failedLocal,
        pageErrors,
      },
      null,
      2,
    ),
  )
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
