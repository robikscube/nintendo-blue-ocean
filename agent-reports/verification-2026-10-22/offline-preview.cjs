// Isolated offline audit for the built production preview.
// Usage: node offline-preview.cjs http://127.0.0.1:4173
const { chromium } = require('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright')

const BASE = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '')
const isLocal = (url) => url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')

async function main() {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const external = []
  const localFailed = []
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const url = request.url()
    if (isLocal(url)) localFailed.push(`${url} ${request.failure()?.errorText ?? ''}`)
  })
  await page.route('**/*', (route) => {
    const url = route.request().url()
    if (isLocal(url)) return route.continue()
    external.push(url)
    return route.abort()
  })

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  const fallbackHidden = await page.locator('#fallback-note').isHidden()

  // Everything after load must work with the network disabled.
  await context.setOffline(true)

  const result = await page.evaluate(() => {
    const store = window.__GAME__.store
    const isDialogue = (phase) => ['opening', 'advisors', 'feedback', 'boss'].includes(phase)
    const drain = () => {
      for (let guard = 0; guard < 40; guard += 1) {
        if (!isDialogue(store.state.phase)) return
        store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      }
    }
    const finishFactory = () => {
      store.dispatch({ type: 'FACTORY_STARTED' })
      store.dispatch({ type: 'FACTORY_FINISHED' })
      store.dispatch({ type: 'LEAVE_FACTORY' })
      drain()
      store.dispatch({ type: 'COMPLETE_TRANSITION' })
    }
    store.dispatch({ type: 'START' })
    drain()
    store.dispatch({ type: 'BEGIN_CHAPTER' })
    drain()
    store.dispatch({ type: 'SELECT_CHOICE', choice: 'B' })
    store.dispatch({ type: 'COMMIT_CHOICE' })
    finishFactory()
    store.dispatch({ type: 'BEGIN_CHAPTER' })
    drain()
    store.dispatch({ type: 'SELECT_CHOICE', choice: 'B' })
    store.dispatch({ type: 'COMMIT_CHOICE' })
    finishFactory()
    store.dispatch({ type: 'BEGIN_CHAPTER' })
    drain()
    store.dispatch({ type: 'SELECT_CHOICE', choice: 'C' })
    store.dispatch({ type: 'COMMIT_CHOICE' })
    store.dispatch({ type: 'SELECT_CHOICE', choice: 'B' })
    store.dispatch({ type: 'COMMIT_CHOICE' })
    finishFactory()
    return { phase: store.state.phase, choices: store.state.choices }
  })
  await page.waitForFunction(() => window.__GAME_STATE__.phase === 'finale')
  await page.evaluate(() => {
    document.querySelector('[data-action="open-archive"]')?.click()
  })
  await page.waitForSelector('.archive-screen')
  const archiveText = await page.locator('.archive-screen').innerText()
  const facts = ['Wii', 'Wii U', 'Original Nintendo Switch', '101.63 million', '13.56 million', '156.59 million', 'As of June 30, 2026']
  const factsPresent = facts.every((fact) => archiveText.includes(fact))

  console.log(
    JSON.stringify(
      {
        base: BASE,
        fallbackHidden,
        phase: result.phase,
        choices: result.choices,
        factsPresent,
        externalRequests: external,
        localRequestFailures: localFailed,
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
