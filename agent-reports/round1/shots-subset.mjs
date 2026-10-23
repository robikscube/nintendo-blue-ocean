import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../blue-ocean-game/node_modules/playwright/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' })
page.setDefaultTimeout(120_000)
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)
const drive = (action) => page.evaluate((payload) => window.__GAME__.store.dispatch(payload), action)
const shot = async (label) => {
  const debug = await page.evaluate(() => window.__GAME__.scene.getDebugInfo())
  console.log(label, JSON.stringify(debug.speakerFraming))
  await page.evaluate(() => {
    const s = window.__GAME__.scene
    s.renderer.setAnimationLoop(null)
    s.renderer.render(s.scene, s.camera)
  })
  await page.screenshot({ path: join(HERE, `subset-${label}.png`), timeout: 120_000 })
  await page.evaluate(() => {
    const s = window.__GAME__.scene
    s.renderer.setAnimationLoop(s.animate)
  })
}

await drive({ type: 'START' })
await drive({ type: 'ADVANCE_DIALOGUE' })
await drive({ type: 'ADVANCE_DIALOGUE' }) // mori
await shot('mori')
await drive({ type: 'ADVANCE_DIALOGUE' }) // shell
await drive({ type: 'ADVANCE_DIALOGUE' }) // briefing
await drive({ type: 'BEGIN_CHAPTER' })
await shot('chapter-advisor-0')
await drive({ type: 'ADVANCE_DIALOGUE' })
await shot('chapter-advisor-1')
await drive({ type: 'ADVANCE_DIALOGUE' })
await shot('chapter-advisor-2')
await drive({ type: 'ADVANCE_DIALOGUE' })
await shot('chapter-advisor-3')
console.log('errors', errors)
await browser.close()
