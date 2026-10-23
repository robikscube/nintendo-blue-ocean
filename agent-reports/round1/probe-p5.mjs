import { chromium } from '../../blue-ocean-game/node_modules/playwright/index.mjs'

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const width = Number(process.env.P5_W ?? 1920)
const height = Number(process.env.P5_H ?? 1080)
const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
page.setDefaultTimeout(120_000)
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)

const dump = async (label) => {
  const data = await page.evaluate(() => {
    const debug = window.__GAME__.scene.getDebugInfo()
    return { speaker: debug.speaker, camera: debug.camera, framing: debug.speakerFraming }
  })
  console.log(label, JSON.stringify(data))
}
const drive = (action) =>
  page.evaluate((payload) => window.__GAME__.store.dispatch(payload), action)

await drive({ type: 'START' })
await drive({ type: 'ADVANCE_DIALOGUE' })
await dump('shell')
await drive({ type: 'ADVANCE_DIALOGUE' })
await dump('mori')
await drive({ type: 'ADVANCE_DIALOGUE' })
await drive({ type: 'ADVANCE_DIALOGUE' })
await drive({ type: 'BEGIN_CHAPTER' })
for (let index = 0; index < 5; index += 1) {
  if (index > 0) await drive({ type: 'ADVANCE_DIALOGUE' })
  await dump(`advisor-${index}`)
}
console.log('errors', errors)
await browser.close()
