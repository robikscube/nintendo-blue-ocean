/* P4 one-off static-camera composition probe. Does not modify application files. */
import { chromium } from 'file:///C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))
mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:5173/'
const POSES = {
  current: { position: [6.4, 6.2, 11.6], look: [0, 2.45, -0.35], fov: 33 },
  p5planned: { position: [5.0, 6.2, 12.8], look: [-0.35, 2.4, -1.1], fov: 34.5 },
}
const SIZES = [
  { width: 1920, height: 1080, tag: '1920x1080' },
  { width: 1366, height: 768, tag: '1366x768' },
]

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: SIZES[0], deviceScaleFactor: 1 })
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 })
await page.evaluate(() => {
  document.getElementById('ui')?.style.setProperty('display', 'none')
})

for (const size of SIZES) {
  await page.setViewportSize({ width: size.width, height: size.height })
  for (const [poseName, pose] of Object.entries(POSES)) {
    const result = await page.evaluate(async ({ pose, width, height }) => {
      const sceneApi = window.__GAME__.scene
      if (!sceneApi) return { error: 'no scene' }
      sceneApi.renderer.setAnimationLoop(null)
      sceneApi.boardroom.group.visible = true
      sceneApi.factory.group.visible = false
      const camera = sceneApi.camera
      camera.position.set(...pose.position)
      camera.fov = pose.fov
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      camera.lookAt(...pose.look)
      camera.updateMatrixWorld(true)
      sceneApi.renderer.setSize(width, height)
      sceneApi.boardroom.update(10, 0.016)
      sceneApi.renderer.render(sceneApi.scene, camera)

      const V = camera.position.constructor
      const toScreen = (vector) => {
        const p = vector.clone().project(camera)
        return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height, ndcX: p.x, ndcY: p.y }
      }
      const sampleObject = (root) => {
        root.updateWorldMatrix(true, true)
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        const world = new V()
        root.traverse((object) => {
          if (!object.visible) return
          if (!object.isMesh || !object.geometry?.attributes?.position) return
          const attr = object.geometry.attributes.position
          for (let index = 0; index < attr.count; index += 1) {
            world.fromBufferAttribute(attr, index).applyMatrix4(object.matrixWorld)
            const p = toScreen(world)
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
          }
        })
        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
      }
      const avatars = []
      for (const [id, avatar] of sceneApi.boardroom.avatars) {
        const bbox = sampleObject(avatar.root)
        const head = toScreen(avatar.headAnchor.getWorldPosition(new V()))
        avatars.push({
          id,
          bbox: { minX: Math.round(bbox.minX), maxX: Math.round(bbox.maxX), minY: Math.round(bbox.minY), maxY: Math.round(bbox.maxY), width: Math.round(bbox.width), height: Math.round(bbox.height) },
          centerX: Math.round((bbox.minX + bbox.maxX) / 2),
          headPx: { x: Math.round(head.x), y: Math.round(head.y) },
        })
      }
      avatars.sort((a, b) => a.centerX - b.centerX)
      const gaps = []
      for (let i = 0; i < avatars.length - 1; i += 1) {
        const left = avatars[i]
        const right = avatars[i + 1]
        const gap = right.bbox.minX - left.bbox.maxX
        const avg = (left.bbox.width + right.bbox.width) / 2
        gaps.push({ pair: `${left.id}-${right.id}`, gapPx: gap, gapInBodyWidths: Number((gap / avg).toFixed(2)), avgBodyWidthPx: Math.round(avg) })
      }
      const info = sceneApi.renderer.info.render
      return {
        width,
        height,
        avatars,
        gaps,
        minFaceY: Math.min(...avatars.map((a) => a.headPx.y)),
        drawCalls: info.calls,
        triangles: info.triangles,
      }
    }, { pose, width: size.width, height: size.height })
    console.log(`\n=== ${size.tag} / ${poseName} (${pose.position}) ===`)
    if (result.error) {
      console.log(result.error)
      continue
    }
    console.log('draw', result.drawCalls, 'tris', result.triangles)
    console.log(result.avatars.map((a) => `${a.id}: x${a.bbox.minX}-${a.bbox.maxX} (${a.bbox.width}w) y${a.bbox.minY}-${a.bbox.maxY} head ${a.headPx.x},${a.headPx.y}`).join('\n'))
    console.log('gaps:', result.gaps.map((g) => `${g.pair} ${g.gapPx}px ${g.gapInBodyWidths}bw`).join(' | '))
    await page.screenshot({ path: join(OUT, `p4-probe-${size.tag}-${poseName}.png`) })
  }
}
console.log('pageErrors', pageErrors)
await browser.close()
