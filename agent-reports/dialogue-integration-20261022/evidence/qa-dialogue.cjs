const { chromium } = require('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/playwright')
const fs = require('node:fs')
const path = require('node:path')

const BASE = (process.argv[2] || 'http://127.0.0.1:5173').replace(/\/$/, '')
const OUT = process.argv[3] || 'C:/Users/robwa/Desktop/Nintendo/agent-reports/dialogue-integration-20261022/evidence/screens'
fs.mkdirSync(OUT, { recursive: true })

const SPEAKER_NAMES = {
  narrator: 'Boardroom',
  shell: 'Shelldon',
  mori: 'Hootley',
  pip: 'Slyvester',
  bolt: 'Damian',
  grumble: 'Pawson',
}
const TAGS = {
  narrator: '#6f7480',
  shell: '#9185b8',
  mori: '#6aa87b',
  pip: '#67aeca',
  bolt: '#c58b3f',
  grumble: '#d27ba6',
}

async function open(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

async function snapshot(page) {
  return page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    const art = document.getElementById('dialogue-art')
    const name = document.getElementById('speaker-name')
    const text = document.getElementById('dialogue-text')
    const copy = document.querySelector('.dialogue-copy')
    const button = document.getElementById('dialogue-continue')
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, right: r.right, bottom: r.bottom, left: r.left }
    }
    const p = box(panel)
    const c = box(copy)
    const t = box(text)
    const n = box(name)
    return {
      phase: window.__GAME_STATE__?.phase,
      dialogueIndex: window.__GAME_STATE__?.dialogueIndex,
      speaker: panel?.dataset.speaker,
      name: name?.textContent?.trim(),
      line: text?.textContent ?? '',
      panelHidden: panel?.hidden ?? null,
      panel: p,
      art: box(art),
      copy: c,
      text: t,
      nameBox: n,
      bottomGap: p ? window.innerHeight - p.bottom : null,
      tagFill: panel ? getComputedStyle(panel).getPropertyValue('--name-tag-fill').trim() : null,
      nameColor: name ? getComputedStyle(name).color : null,
      fontSize: text ? getComputedStyle(text).fontSize : null,
      lineHeight: text ? getComputedStyle(text).lineHeight : null,
      nameFontSize: name ? getComputedStyle(name).fontSize : null,
      nameOverflowX: name ? name.scrollWidth - name.clientWidth : null,
      textOverflowX: text ? text.scrollWidth - text.clientWidth : null,
      textInsideCopyY: t && c ? t.top >= c.top - 1 && t.bottom <= c.bottom + 1 : null,
      textInsideCopyX: t && c ? t.left >= c.left - 1 && t.right <= c.right + 1 : null,
      artNatural: art ? { width: art.naturalWidth, height: art.naturalHeight, complete: art.complete, src: art.currentSrc || art.src } : null,
      artRatio: art ? art.getBoundingClientRect().width / art.getBoundingClientRect().height : null,
      continueButton: button ? { tag: button.tagName, aria: button.getAttribute('aria-label'), box: box(button) } : null,
      duplicateArrow: document.querySelectorAll('.continue-marker').length,
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  })
}

async function clickStart(page) {
  await page.getByRole('button', { name: /Enter the boardroom/i }).click()
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
  await page.waitForTimeout(100)
}

async function advance(page, delay = 70) {
  await page.evaluate(() => window.__GAME__?.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
  await page.waitForTimeout(delay)
}

async function toAdvisorLine(page, index = 0) {
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('store missing')
    if (store.state.phase === 'opening') {
      for (let i = 0; i < 12 && store.state.phase === 'opening'; i += 1) {
        store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      }
    }
    if (store.state.phase === 'briefing') store.dispatch({ type: 'BEGIN_CHAPTER' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors')
  await page.evaluate((target) => {
    const store = window.__GAME__?.store
    while (store.state.dialogueIndex < target) store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }, index)
  await page.waitForTimeout(100)
}

async function captureViewport(browser, width, height, fullSpeakers) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const pageErrors = []
  const failed = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`))
  await open(page)
  await clickStart(page)

  const records = []
  const seen = new Set()
  const size = `${width}x${height}`

  for (let index = 0; index < 5; index += 1) {
    if (index > 0) await advance(page)
    const snap = await snapshot(page)
    snap.label = `opening-${index}`
    records.push(snap)
    if (!seen.has(snap.speaker)) {
      seen.add(snap.speaker)
      await page.screenshot({ path: path.join(OUT, `dialogue-${size}-opening-${snap.speaker}.png`) })
    }
    if (!fullSpeakers && index === 0) break
  }

  await page.evaluate(() => {
    const store = window.__GAME__?.store
    while (store.state.phase === 'opening') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  })
  await page.evaluate(() => window.__GAME__?.store.dispatch({ type: 'BEGIN_CHAPTER' }))
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors')
  const advisorCount = await page.evaluate(() => 7)
  for (let index = 0; index < advisorCount; index += 1) {
    if (index > 0) await advance(page)
    const snap = await snapshot(page)
    snap.label = `advisors-${index}`
    records.push(snap)
    if (index === 1) {
      await page.screenshot({ path: path.join(OUT, `dialogue-${size}-longest-line-${snap.speaker}.png`) })
    }
    if (!seen.has(snap.speaker)) {
      seen.add(snap.speaker)
      await page.screenshot({ path: path.join(OUT, `dialogue-${size}-advisors-${snap.speaker}.png`) })
    }
  }

  if (!fullSpeakers) {
    // One deliberately long 154-character Slyvester line at the smallest size.
    await page.evaluate(() => {
      const store = window.__GAME__?.store
      while (store.state.phase === 'opening') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    })
  }

  await context.close()
  return { size, records, pageErrors, failed, seen: [...seen] }
}

async function main() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const results = []
  results.push(await captureViewport(browser, 1920, 1080, true))
  results.push(await captureViewport(browser, 1366, 768, true))
  results.push(await captureViewport(browser, 1024, 768, true))
  await browser.close()

  const all = results.flatMap((r) => r.records.map((record) => ({ ...record, viewportResult: r.size })))
  const speakers = [...new Set(all.map((r) => r.speaker))]
  const failures = []
  const expectedSpeakers = ['narrator', 'mori', 'pip', 'bolt', 'grumble', 'shell']
  for (const speaker of expectedSpeakers) {
    if (!speakers.includes(speaker)) failures.push(`missing speaker ${speaker}`)
  }
  for (const record of all) {
    if (record.speaker !== 'narrator' && !record.line) continue
    if (record.name !== SPEAKER_NAMES[record.speaker]) failures.push(`wrong display name ${record.speaker}: ${record.name}`)
    if (record.nameColor !== 'rgb(255, 255, 255)') failures.push(`name not white ${record.speaker}: ${record.nameColor}`)
    if (record.tagFill.toLowerCase() !== TAGS[record.speaker]) failures.push(`wrong tag ${record.speaker}: ${record.tagFill}`)
    if (record.bottomGap < 10 || record.bottomGap > 26) failures.push(`bottom gap ${record.bottomGap} ${record.viewportResult} ${record.label}`)
    if (record.nameOverflowX > 1) failures.push(`name overflow ${record.nameOverflowX} ${record.speaker}`)
    if (record.textOverflowX > 1) failures.push(`text overflow ${record.textOverflowX} ${record.speaker}`)
    if (record.textInsideCopyY === false) failures.push(`text outside copy Y ${record.speaker} ${record.viewportResult}`)
    if (record.duplicateArrow !== 0) failures.push(`duplicate arrow count ${record.duplicateArrow}`)
    if (record.horizontalOverflow > 1) failures.push(`horizontal overflow ${record.horizontalOverflow}`)
    if (record.artNatural?.width !== 3872 || record.artNatural?.height !== 1552) failures.push(`art dimensions ${JSON.stringify(record.artNatural)}`)
    if (Math.abs(record.artRatio - 3872 / 1552) > 0.005) failures.push(`art ratio ${record.artRatio}`)
    if (!record.continueButton || record.continueButton.tag !== 'BUTTON' || !record.continueButton.aria) failures.push('continue button semantics')
  }
  for (const result of results) {
    if (result.pageErrors.length) failures.push(`page errors ${result.size}: ${result.pageErrors.join('; ')}`)
    if (result.failed.length) failures.push(`failed requests ${result.size}: ${result.failed.join('; ')}`)
  }

  const report = {
    base: BASE,
    viewports: results.map((r) => ({ size: r.size, seen: r.seen, pageErrors: r.pageErrors, failed: r.failed, records: r.records })),
    speakers,
    failures,
  }
  fs.writeFileSync(
    'C:/Users/robwa/Desktop/Nintendo/agent-reports/dialogue-integration-20261022/evidence/dialogue-measure.json',
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify({ speakers, failures, counts: results.map((r) => [r.size, r.records.length]) }, null, 2))
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
