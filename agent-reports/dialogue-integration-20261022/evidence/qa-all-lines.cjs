// Sweep every authored spoken string through the live bubble layout at each
// target viewport. This verifies more than the single longest line.
const fs = require('node:fs')
const { chromium } = require('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright')

const BASE = (process.argv[2] || 'http://127.0.0.1:5173').replace(/\/$/, '')
const storyPath = 'C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/src/core/story.ts'
const source = fs.readFileSync(storyPath, 'utf8')
const strings = new Set()
for (const pattern of [/text:\s*'([^']*)'/g, /boss:\s*'([^']*)'/g]) {
  let match
  while ((match = pattern.exec(source))) strings.add(match[1])
}
const lines = [...strings].filter((line) => line.length > 0)
if (lines.length < 60) throw new Error(`Only found ${lines.length} authored strings`)

async function main() {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
  ]
  const results = []
  const failures = []
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)
    await page.getByRole('button', { name: /Enter the boardroom/i }).click()
    await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
    await page.evaluate(() => {
      const store = window.__GAME__?.store
      while (store.state.phase === 'opening') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      store.dispatch({ type: 'BEGIN_CHAPTER' })
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    })
    await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors')

    const measurements = await page.evaluate((authored) => {
      const text = document.getElementById('dialogue-text')
      const copy = document.querySelector('.dialogue-copy')
      const data = []
      for (const line of authored) {
        text.textContent = line
        const t = text.getBoundingClientRect()
        const c = copy.getBoundingClientRect()
        data.push({
          length: line.length,
          line,
          overflowX: text.scrollWidth - text.clientWidth,
          overflowY: text.scrollHeight - text.clientHeight,
          insideY: t.top >= c.top - 1 && t.bottom <= c.bottom + 1,
          insideX: t.left >= c.left - 1 && t.right <= c.right + 1,
          width: t.width,
          height: t.height,
        })
      }
      return data
    }, lines)

    const baseline = await page.evaluate(() => {
      const text = document.getElementById('dialogue-text')
      return { overflowX: text.scrollWidth - text.clientWidth, height: text.getBoundingClientRect().height }
    })
    const viewportFailures = measurements.filter(
      (item) => item.overflowX > 1 || item.overflowY > 1 || !item.insideY || !item.insideX,
    )
    for (const item of viewportFailures) {
      failures.push(`${viewport.width}x${viewport.height}: ${item.length} chars overflow ${item.overflowX}/${item.overflowY} inside ${item.insideX}/${item.insideY}: ${item.line.slice(0, 60)}`)
    }
    if (pageErrors.length) failures.push(`${viewport.width}x${viewport.height} page errors: ${pageErrors.join('; ')}`)
    results.push({
      viewport,
      lineCount: measurements.length,
      maxLength: Math.max(...measurements.map((item) => item.length)),
      maxHeight: Math.max(...measurements.map((item) => item.height)),
      maxOverflowX: Math.max(...measurements.map((item) => item.overflowX)),
      maxOverflowY: Math.max(...measurements.map((item) => item.overflowY)),
      baseline,
      failures: viewportFailures.length,
      pageErrors,
    })
    await context.close()
  }
  await browser.close()
  const report = { base: BASE, authoredStrings: lines.length, results, failures }
  fs.writeFileSync(
    'C:/Users/robwa/Desktop/Nintendo/agent-reports/dialogue-integration-20261022/evidence/all-lines-fit.json',
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
