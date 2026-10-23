import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.env.GAME_URL || 'http://127.0.0.1:5173/'
const outputDir = 'qa-screens'
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

const state = () => page.evaluate(() => window.__GAME_STATE__)
const settle = () => page.waitForTimeout(140)
const shot = async (name) => {
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: false })
  console.log('SHOT', name)
}
const waitPhase = async (phase) => {
  await page.waitForFunction((expected) => window.__GAME_STATE__?.phase === expected, phase, { timeout: 7000 })
  await settle()
}
const press = async (key) => {
  await page.keyboard.press(key)
  await settle()
}
const drainDialogue = async () => {
  let guard = 0
  while (true) {
    const current = await state()
    if (!['opening', 'advisors', 'feedback', 'boss'].includes(current.phase)) break
    await press('Space')
    guard += 1
    if (guard > 30) throw new Error('dialogue drain did not terminate')
  }
}
const choose = async (letter) => {
  const key = letter === 'A' ? '1' : letter === 'B' ? '2' : '3'
  await press(key)
  await press('v')
}

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 10000 })
await page.waitForTimeout(800)
await shot('01-title')
console.log('STATE title', await state())
console.log('SCENE', await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo() ?? null))

await page.getByRole('button', { name: /^Start$/i }).click()
await waitPhase('opening')
await page.waitForTimeout(500)
await shot('02-opening-boardroom')

await drainDialogue()
await waitPhase('briefing')
await shot('03-briefing-2005')

await page.getByRole('button', { name: /Convene the board/i }).click()
await waitPhase('advisors')
await press('Space')
await shot('04-advisors')

await drainDialogue()
await waitPhase('voting')
await shot('05-vote-2005')
await press('2')
await shot('06-vote-selected')
await press('v')
await waitPhase('factory')
await page.waitForTimeout(700)
await shot('07-factory-running')
await press('s')
await page.waitForTimeout(500)
await waitPhase('factory')
await shot('08-factory-reveal')
console.log('FACTORY', await state())

await page.getByRole('button', { name: /^Confirm$/i }).click()
await waitPhase('feedback')
await shot('09-feedback')
await drainDialogue()
await waitPhase('transition')
await shot('10-transition')
await page.getByRole('button', { name: /^Continue$/i }).click()
await waitPhase('briefing')

await page.getByRole('button', { name: /Convene the board/i }).click()
await drainDialogue()
await waitPhase('voting')
await choose('B')
await waitPhase('factory')
await press('s')
await page.getByRole('button', { name: /^Confirm$/i }).click()
await waitPhase('feedback')
await drainDialogue()
await waitPhase('transition')
await page.getByRole('button', { name: /^Continue$/i }).click()
await waitPhase('briefing')

await page.getByRole('button', { name: /Convene the board/i }).click()
await drainDialogue()
await waitPhase('voting')
await choose('C')
await waitPhase('voting')
await shot('11-vote-2016-second')
await choose('B')
await waitPhase('factory')
await page.waitForTimeout(500)
await shot('12-factory-hybrid-running')
await press('s')
await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
await shot('13-factory-hybrid-reveal')
await page.getByRole('button', { name: /^Confirm$/i }).click()
await waitPhase('feedback')
await drainDialogue()
await waitPhase('transition')
await page.getByRole('button', { name: /Open the sealed archive/i }).click()
await waitPhase('finale')
await shot('14-finale-sealed')
await page.getByRole('button', { name: /Break the seal/i }).click()
await page.waitForTimeout(350)
await shot('15-archive')
console.log('BODY', (await page.locator('body').innerText()).slice(0, 1200))
console.log('STATE final', await state())
console.log('ERRORS', errors)
console.log('SCENE final', await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo() ?? null))

await browser.close()
