// Focused subpath check for the approved dialogue artwork and name tag.
const { chromium } = require('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright')

const ORIGIN = 'http://127.0.0.1:4174'
const BASE_PATH = '/nintendo-next-blue-ocean/'
const URL = `${ORIGIN}${BASE_PATH}`

async function main() {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const pageErrors = []
  const failedRequests = []
  const responses = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`))
  page.on('response', (response) => {
    if (response.url().includes('dialogue-bubble.png')) {
      responses.push({ url: response.url(), status: response.status() })
    }
  })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await page.getByRole('button', { name: /Enter the boardroom/i }).click()
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
  await page.waitForFunction(() => {
    const art = document.getElementById('dialogue-art')
    return Boolean(art && art.complete && art.naturalWidth > 0)
  })

  const result = await page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    const art = document.getElementById('dialogue-art')
    const name = document.getElementById('speaker-name')
    const resources = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('dialogue-bubble.png'))
    const rect = panel.getBoundingClientRect()
    return {
      speaker: panel.dataset.speaker,
      name: name.textContent.trim(),
      nameColor: getComputedStyle(name).color,
      tagFill: getComputedStyle(panel).getPropertyValue('--name-tag-fill').trim(),
      artSrc: art.currentSrc || art.src,
      naturalWidth: art.naturalWidth,
      naturalHeight: art.naturalHeight,
      imageResources: resources,
      bottomGap: window.innerHeight - rect.bottom,
      path: window.location.pathname,
    }
  })

  const imageIsSubpath = result.artSrc.startsWith(`${ORIGIN}${BASE_PATH}`)
  const tagPath = await page.locator('.name-tag-tint path').getAttribute('d')
  const report = {
    url: URL,
    ...result,
    imageIsSubpath,
    tagPathLength: tagPath.length,
    responses,
    pageErrors,
    failedRequests,
  }
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (
    !imageIsSubpath ||
    result.naturalWidth !== 3872 ||
    result.naturalHeight !== 1552 ||
    result.imageResources.length === 0 ||
    pageErrors.length ||
    failedRequests.length ||
    responses.some((response) => response.status !== 200)
  ) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
