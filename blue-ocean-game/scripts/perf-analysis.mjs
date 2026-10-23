import { chromium } from '@playwright/test'
const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-frame-rate-limit','--disable-gpu-vsync']})
const page = await browser.newPage({viewport:{width:1920,height:1080}, reducedMotion:'reduce'})
await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__GAME_READY__)
await page.waitForTimeout(500)
const result = await page.evaluate(async () => {
  const { renderer, scene, camera } = window.__GAME__.scene
  const measure = (label, frames=20) => {
    renderer.render(scene,camera)
    const start=performance.now()
    for(let i=0;i<frames;i++) renderer.render(scene,camera)
    const ms=performance.now()-start
    return {label, msPerFrame:(ms/frames).toFixed(1), fps:(1000/(ms/frames)).toFixed(1), calls:renderer.info.render.calls, tris:renderer.info.render.triangles}
  }
  const out=[]
  out.push(measure('baseline'))
  renderer.shadowMap.enabled=false
  out.push(measure('no shadows'))
  renderer.setPixelRatio(0.75)
  renderer.setSize(window.innerWidth, window.innerHeight)
  out.push(measure('no shadows + 0.75 dpr'))
  renderer.setPixelRatio(0.5)
  renderer.setSize(window.innerWidth, window.innerHeight)
  out.push(measure('no shadows + 0.5 dpr'))
  window.__GAME__.scene.boardroom.group.visible=false
  out.push(measure('empty scene + 0.5 dpr'))
  return out
})
console.log(result)
await browser.close()
