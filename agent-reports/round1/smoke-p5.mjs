import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../blue-ocean-game/node_modules/playwright/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.setDefaultTimeout(120_000)
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__GAME_READY__ === true)
console.log('ready')
await page.evaluate(() => window.advanceTime(300))
await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'START' }))
await page.evaluate(() => window.advanceTime(950))
await page.evaluate(() => window.__GAME__.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
await page.evaluate(() => window.advanceTime(1100))
console.log('debug', JSON.stringify(await page.evaluate(() => window.__GAME__.scene.getDebugInfo()), null, 2))
console.log(
  'bounds',
  JSON.stringify(
    await page.evaluate(() => {
      const scene = window.__GAME__.scene
      const avatar = scene.boardroom.avatars.get('shell')
      scene.scene.updateMatrixWorld(true)
      const cam = scene.camera
      const v = cam.position.clone()
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      let minZ = Infinity
      let maxZ = -Infinity
      const rows = []
      avatar.root.traverse((o) => {
        if (!o.isMesh || !o.geometry) return
        const g = o.geometry
        if (!g.boundingBox) g.computeBoundingBox()
        const bb = g.boundingBox
        for (const x of [bb.min.x, bb.max.x])
          for (const y of [bb.min.y, bb.max.y])
            for (const z of [bb.min.z, bb.max.z]) {
              const p = v.clone().set(x, y, z).applyMatrix4(o.matrixWorld)
              minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
              minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
              minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z)
            }
      })
      return { minX, maxX, minY, maxY, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ, root: avatar.root.position.toArray() }
    }),
    null,
    2,
  ),
)
const t0 = Date.now()
await page.evaluate(() => {
  const s = window.__GAME__.scene
  s.renderer.setAnimationLoop(null)
  s.renderer.render(s.scene, s.camera)
})
await page.screenshot({ path: join(HERE, 'smoke-shell.png'), timeout: 120_000 })
await page.evaluate(() => {
  const s = window.__GAME__.scene
  s.renderer.setAnimationLoop(s.animate)
})
console.log('shot ok', Date.now() - t0, 'ms')
console.log('errors', errors)
await browser.close()
