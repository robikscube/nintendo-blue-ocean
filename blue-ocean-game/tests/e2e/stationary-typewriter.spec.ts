import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { CHAPTERS, OPENING_LINES, getFeedbackLines, getBossLines } from '../../src/core/story'
import { buildSpeechTimeline } from '../../src/audio/speech-timeline'
import { getVoiceProfile } from '../../src/audio/voice-profiles'
import type { DialogueLine } from '../../src/core/types'

const lines = [...OPENING_LINES, ...CHAPTERS.flatMap(c => c.advisorLines)]
for (let chapter = 0; chapter < 3; chapter++) {
  for (const a of ['A', 'B', 'C'] as const) for (const b of ['A', 'B', 'C'] as const) {
    const choices = { d1: a, d2: a, d3: a, d4: b }
    lines.push(...getFeedbackLines(chapter, choices), ...getBossLines(chapter, choices))
  }
  lines.push(...getBossLines(chapter, {}))
}
const corpus = [...new Map(lines.map(line => [line.text, line])).values()]
const firstTypedIndex = OPENING_LINES.findIndex(line => line.speaker !== 'narrator')

async function open(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__)
  await page.getByRole('button', { name: /^Start$/ }).click()
  await page.evaluate(() => document.fonts.ready)
}

for (const viewport of [
  { width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1024, height: 768 },
]) test.describe(`${viewport.width}x${viewport.height} stationary dialogue`, () => {
  test.use({ viewport, reducedMotion: 'no-preference' })

  test('every revealed glyph retains its final position at every timeline step', async ({ page }) => {
    await open(page)
    const samples = [...new Set(corpus.map(l => l.speaker))].map(speaker =>
      corpus.filter(l => l.speaker === speaker).sort((a,b) => b.text.length-a.text.length)[0]!)
    const plans = samples.map(line => ({ line, times: buildSpeechTimeline(line.text,
      getVoiceProfile(line.speaker), { baseIntervalMs: 31 }).revealAtMs }))
    const failures = await page.evaluate((plans) => {
      const ui = window.__GAME__!.ui as unknown as { startLine(line: DialogueLine): void }
      const text = document.getElementById('dialogue-text')!
      const panel = document.getElementById('dialogue-panel')!
      const accessible = document.getElementById('dialogue-accessible')!
      const raf = window.requestAnimationFrame
      const caf = window.cancelAnimationFrame
      const now = performance.now.bind(performance)
      let pending: FrameRequestCallback | undefined
      window.requestAnimationFrame = cb => { pending = cb; return 999999 }
      window.cancelAnimationFrame = () => { pending = undefined }
      performance.now = () => 0
      const failures: string[] = []
      const boxes = () => {
        const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT)
        const result: number[][] = []
        let node: Node | null
        while ((node = walker.nextNode())) for (let i=0; i<(node.textContent?.length ?? 0); i++) {
          const range = document.createRange()
          range.setStart(node, i); range.setEnd(node, i+1)
          const r = range.getBoundingClientRect()
          result.push([r.x, r.y, r.width, r.height])
        }
        return result
      }
      try {
        for (const { line, times } of plans) {
          ui.startLine(line)
          const initial = boxes()
          if (text.textContent !== line.text) failures.push(`${line.speaker}: full layout absent on first frame`)
          if (line.speaker === 'narrator') continue
          const nodes = [...text.childNodes]
          for (const time of [...times, times[times.length-1]! + 1000]) {
            const tick = pending; pending = undefined; tick?.(time)
            const current = boxes()
            if (JSON.stringify(current) !== JSON.stringify(initial)) {
              failures.push(`${line.speaker}: glyph moved at ${time}ms`); break
            }
            if (nodes.some((n,i) => text.childNodes[i] !== n)) {
              failures.push(`${line.speaker}: layout nodes replaced at ${time}ms`); break
            }
            const visible = line.text.slice(0, Number(text.dataset.revealedCharacters))
            if (accessible.textContent !== `${line.speaker === 'shell' ? 'Shelldon' :
              line.speaker === 'mori' ? 'Hootley' : line.speaker === 'pip' ? 'Slyvester' :
              line.speaker === 'bolt' ? 'Damian' : 'Pawson'}: ${visible}`) {
              failures.push(`${line.speaker}: accessible prefix differs`); break
            }
          }
          if (!panel.classList.contains('is-complete')) failures.push(`${line.speaker}: never completed`)
        }
      } finally { window.requestAnimationFrame = raf; window.cancelAnimationFrame = caf; performance.now = now }
      return failures
    }, plans)
    expect(failures).toEqual([])
  })

  test('all authored branches fit with uniform typography and native full-text wrapping', async ({ page }, info) => {
    test.setTimeout(150_000)
    await open(page)
    const report = await page.evaluate((corpus) => {
      const ui = window.__GAME__!.ui as unknown as { startLine(line: DialogueLine): void; completeLine(interrupt?: boolean): void }
      const text = document.getElementById('dialogue-text')!
      const copy = document.querySelector<HTMLElement>('.dialogue-copy')!
      const panel = document.getElementById('dialogue-panel')!
      const original = text.style.fontSize
      const failures: string[] = []
      const fonts = new Set<string>()
      let minClearance = Infinity
      let longest = ''
      const rects = () => {
        const range = document.createRange(); range.selectNodeContents(text)
        return [...range.getClientRects()].filter(r => r.width > 0)
      }
      const fits = () => {
        const c = copy.getBoundingClientRect()
        const t = text.getBoundingClientRect()
        // pre-wrap retains hanging spaces at line ends; they paint no glyphs.
        const ink: DOMRect[] = []
        const range = document.createRange()
        for (let i=0;i<text.textContent!.length;i++) if (/\S/u.test(text.textContent![i]!)) {
          range.setStart(text.firstChild!,i); range.setEnd(text.firstChild!,i+1)
          ink.push(range.getBoundingClientRect())
        }
        return t.bottom <= c.bottom+.1 && ink.every(r => r.left >= c.left-.1 && r.right <= c.right+.1 && r.top >= c.top-.1 && r.bottom <= c.bottom+.1)
      }
      for (const line of corpus) {
        ui.startLine(line); ui.completeLine(true)
        const style = getComputedStyle(text)
        fonts.add([style.fontFamily, style.fontSize, style.lineHeight].join('|'))
        if (!fits()) failures.push(`does not fit: ${line.text}`)
        const rs = rects()
        minClearance = Math.min(minClearance, copy.getBoundingClientRect().bottom-Math.max(...rs.map(r=>r.bottom)))
        if (line.text.length > longest.length) longest = line.text
        // Compare the actual layout to a plain full-text paragraph, including line breaks.
        const clone = text.cloneNode(false) as HTMLElement
        clone.removeAttribute('id'); clone.textContent = line.text
        clone.style.position = 'absolute'; clone.style.top = '0'; clone.style.left = '0'; clone.style.visibility = 'hidden'
        copy.append(clone)
        const bottoms = [...new Set(rs.map(r=>r.bottom.toFixed(3)))]
        const range = document.createRange(); range.selectNodeContents(clone)
        const native = [...new Set([...range.getClientRects()].filter(r=>r.width>0).map(r=>r.bottom.toFixed(3)))]
        if (JSON.stringify(bottoms) !== JSON.stringify(native)) failures.push(`native wrapping differs: ${line.text}`)
        const actualRange = document.createRange()
        for (let offset=0; offset<line.text.length; offset++) {
          range.setStart(clone.firstChild!, offset); range.setEnd(clone.firstChild!, offset+1)
          actualRange.setStart(text.firstChild!,offset); actualRange.setEnd(text.firstChild!,offset+1)
          const a = actualRange.getBoundingClientRect(); const b = range.getBoundingClientRect()
          if (Math.abs(a.x-b.x) > .05 || Math.abs(a.y-b.y) > .05 || Math.abs(a.width-b.width) > .05) {
            failures.push(`native glyph layout differs: ${line.text} at ${offset}`); break
          }
        }
        clone.remove()
      }
      // Monotonic quarter-pixel search, same size for every authored line.
      let low = 24 * 4
      let high = 64 * 4
      let firstFailing = ''
      while (low < high) {
        const middle = Math.ceil((low+high)/2)
        const size = middle/4
        text.style.fontSize = `${size}px`
        let bad = ''
        for (const line of corpus) {
          ui.startLine(line); ui.completeLine(true)
          if (!fits()) { bad = line.text; break }
        }
        if (bad) { firstFailing = bad; high = middle-1 }
        else low = middle
      }
      const maximum = low/4
      text.style.fontSize = original
      ui.startLine({ speaker: 'shell', text: longest, mood: 'neutral' }); ui.completeLine(true)
      panel.dataset.speaker = 'shell'
      document.getElementById('speaker-name')!.textContent = 'Shelldon'
      const c = copy.getBoundingClientRect()
      const p = panel.getBoundingClientRect()
      return { failures, fonts: [...fonts], count: corpus.length, maximum, firstFailing,
        minClearance, longest, copy: {width:c.width,height:c.height}, panel: {width:p.width,height:p.height} }
    }, corpus)
    await info.attach('typography-measurements', { body: JSON.stringify(report,null,2), contentType: 'application/json' })
    await writeFile(info.outputPath('typography-measurements.json'), JSON.stringify(report,null,2))
    console.log(`${viewport.width}x${viewport.height} typography: ${JSON.stringify(report)}`)
    expect(report.failures).toEqual([])
    expect(report.fonts).toHaveLength(1)
    await page.screenshot({ path: info.outputPath('longest-line.png') })
  })
})

test.describe('stationary playback', () => {
  test.use({ reducedMotion: 'no-preference' })
  test('keyboard completion, visibility pause, reload, replay and reset preserve the line', async ({ page }) => {
    await open(page)
    // Dispatch in one browser task so a slow GPU cannot finish typing between calls.
    await page.evaluate((index) => {
      for (let i=0;i<index;i++) window.__GAME__!.store.dispatch({type:'ADVANCE_DIALOGUE'})
      window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}))
    }, firstTypedIndex)
    await expect(page.locator('#dialogue-panel')).toHaveClass(/is-complete/)
    expect(await page.evaluate(() => window.__GAME_STATE__!.dialogueIndex)).toBe(firstTypedIndex)
    await page.waitForTimeout(180)
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => window.__GAME_STATE__!.dialogueIndex)).toBe(firstTypedIndex+1)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true,get:()=>true})
      document.dispatchEvent(new Event('visibilitychange'))
      delete (document as unknown as {hidden?:boolean}).hidden
    })
    await expect(page.locator('#dialogue-panel')).toHaveClass(/is-complete/)
    await expect.poll(() => page.evaluate(() => window.__GAME__!.audio.getSpeechDebug()?.running ?? false)).toBe(false)
    await page.reload({waitUntil:'networkidle'})
    await page.waitForFunction(()=>window.__GAME_READY__)
    expect(await page.evaluate(() => window.__GAME_STATE__!.dialogueIndex)).toBe(firstTypedIndex+1)
    await page.evaluate(()=>{
      const panel=document.getElementById('dialogue-panel')!
      if (panel.classList.contains('is-typing')) panel.click()
    })
    await expect(page.locator('#dialogue-panel')).toHaveClass(/is-complete/)
    await page.waitForTimeout(180)
    await page.keyboard.press('Space')
    expect(await page.evaluate(() => window.__GAME_STATE__!.dialogueIndex)).toBe(firstTypedIndex+2)
    page.once('dialog', d=>d.accept())
    await page.keyboard.press('Shift+R')
    await expect(page.locator('#dialogue-panel')).toBeHidden()
    await page.getByRole('button',{name:/^Start$/}).click()
    expect(await page.evaluate(()=>window.__GAME_STATE__!.dialogueIndex)).toBe(0)
  })
})

test('reduced motion and Boardroom narration show complete accessible text immediately', async ({page})=>{
  await open(page)
  for (let i=0;i<OPENING_LINES.length;i++) {
    const line = OPENING_LINES[i]!
    await expect(page.locator('#dialogue-panel')).toHaveClass(/is-complete/)
    await expect(page.locator('#dialogue-accessible')).toContainText(line.text)
    await expect(page.locator('#dialogue-text')).toHaveAttribute('aria-hidden','true')
    await page.evaluate(()=>window.__GAME__!.store.dispatch({type:'ADVANCE_DIALOGUE'}))
  }
})

test.describe('suffix paint and font readiness', () => {
  test.use({ reducedMotion: 'no-preference' })
  test('leaving dialogue fades without moving its glyphs', async ({page}) => {
    await open(page)
    const stable = await page.evaluate(()=>{
      const panel=document.getElementById('dialogue-panel')!
      panel.style.transition='none'
      const before=panel.getBoundingClientRect()
      const ui=window.__GAME__!.ui as unknown as {hideDialogue():void}
      ui.hideDialogue()
      const after=panel.getBoundingClientRect()
      return before.x===after.x && before.y===after.y && before.width===after.width && before.height===after.height
    })
    expect(stable).toBe(true)
  })
  test('unrevealed text and its shadows paint exactly like an empty region', async ({page}, info) => {
    test.setTimeout(150_000)
    await open(page)
    await page.addStyleTag({content:'#scene { display:none } .dialogue-copy { background:rgb(38,24,9) } .continue-pulse { opacity:0!important; animation:none!important }'})
    await page.evaluate(()=>{
      const ui = window.__GAME__!.ui as unknown as {startLine(line:DialogueLine):void; clearRevealTimers():void}
      ui.startLine({speaker:'shell',text:'Future words must stay invisible, including their shadows.',mood:'neutral'})
      ui.clearRevealTimers()
    })
    const copy = page.locator('.dialogue-copy')
    const hidden = await copy.screenshot({path:info.outputPath('hidden.png')})
    await expect(page.locator('#dialogue-text')).toHaveAttribute('data-revealed-characters','0')
    await page.locator('#dialogue-text').evaluate(e=>e.style.visibility='hidden')
    const blank = await copy.screenshot({path:info.outputPath('blank.png')})
    expect(hidden.equals(blank)).toBe(true)
    await page.locator('#dialogue-text').evaluate(e=>e.style.visibility='')
    await page.evaluate(()=>{
      const ui=window.__GAME__!.ui as unknown as {completeLine(interrupt?:boolean):void}
      ui.completeLine(true)
    })
    const complete = await copy.screenshot({path:info.outputPath('complete.png')})
    expect(complete.equals(blank)).toBe(false)
    await page.evaluate(()=>{
      CSS.highlights.delete('dialogue-revealed')
      CSS.highlights.delete('dialogue-unrevealed')
      document.getElementById('dialogue-text')!.classList.remove('has-stationary-highlight')
    })
    const native = await copy.screenshot({path:info.outputPath('native.png')})
    expect(complete.equals(native)).toBe(true)
  })

  test('a slow initial font cannot swap after the first glyph appears', async ({page})=>{
    await page.route('**/Itim-Regular.ttf', async route=>{
      await new Promise(r=>setTimeout(r,800))
      await route.continue()
    })
    await open(page)
    expect(await page.evaluate(()=>document.fonts.check('400 30px Itim'))).toBe(true)
    expect(await page.locator('#dialogue-text').evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Itim')
  })

  test('older browsers without highlights receive a complete stationary line', async ({page})=>{
    await page.addInitScript(()=>Object.defineProperty(window,'Highlight',{value:undefined,configurable:true}))
    await open(page)
    await page.evaluate(index=>{
      for(let i=0;i<index;i++) window.__GAME__!.store.dispatch({type:'ADVANCE_DIALOGUE'})
    },firstTypedIndex)
    await expect(page.locator('#dialogue-panel')).toHaveClass(/is-complete/)
    await expect(page.locator('#dialogue-accessible')).toContainText(OPENING_LINES[firstTypedIndex]!.text)
  })
})
