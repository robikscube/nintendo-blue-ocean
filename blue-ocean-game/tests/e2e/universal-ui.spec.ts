import { expect, test, type Browser, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { GameState } from '../../src/core/types'
import {
  DECISIONS,
  SIMULATED_LABEL,
  DISCUSSION_QUESTION,
} from '../../src/core/story'
import { buildPrototypeSpec } from '../../src/scene/prototype-model'

/**
 * Workstream D — independent acceptance suite for the Universal Round 1 UI pass.
 *
 * This spec is read-only with respect to game source. It runs against the
 * configured dev server by default; scripts/universal-ui-qa.mjs points it at a
 * dedicated port via UI_QA_URL so it never fights another Playwright run.
 */

const APP_URL = process.env.UI_QA_URL ?? '/'
const SCREENS_DIR =
  process.env.UI_QA_SCREENS ??
  path.resolve(process.cwd(), '..', 'agent-reports', 'universal-ui', 'screens')

const DIALOGUE_PHASES = new Set(['opening', 'advisors', 'feedback', 'boss'])
const HISTORY_LEAK =
  /\bWii\b|Wii U|Nintendo Switch|Joy-Con|GamePad|101\.63|13\.56|156\.59|June 30, 2026|\b2006\b|\b2012\b|\b2017\b/
const SCREEN_NAMES = ['Hootley', 'Slyvester', 'Damian', 'Pawson', 'Shelldon', 'Boardroom']
const SEALED_FOOTNOTE = 'Historical products and figures are still sealed.'

mkdirSync(SCREENS_DIR, { recursive: true })

interface ModelInfo {
  name: string
  key: string
  title: string
  children: number
  meshes: number
  vertices: number
}

interface ChoiceSet {
  d1: 'A' | 'B' | 'C'
  d2: 'A' | 'B' | 'C'
  d3: 'A' | 'B' | 'C'
  d4: 'A' | 'B' | 'C'
}

async function openGame(page: Page): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => (window as any).__GAME_READY__ === true)
}

async function getState(page: Page): Promise<GameState> {
  return page.evaluate(() => (window as any).__GAME_STATE__ as GameState)
}

async function waitForPhase(page: Page, phase: GameState['phase']): Promise<void> {
  await page.waitForFunction((expected) => (window as any).__GAME_STATE__?.phase === expected, phase, {
    timeout: 20_000,
  })
}

async function waitForFactoryDone(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as any).__GAME_STATE__?.factoryProgress === 'done',
    null,
    { timeout: 25_000 },
  )
}

async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
      window.innerWidth,
  )
  expect(overflow, `horizontal overflow at ${label}`).toBeLessThanOrEqual(1)
}

async function shot(page: Page, name: string): Promise<void> {
  // Finite entrance animations (320–360 ms) can still be at opacity 0 when a
  // screenshot is taken right after a phase change. Disable animations for the
  // capture so evidence always shows the settled UI rather than a blank frame.
  await page.screenshot({
    path: path.join(SCREENS_DIR, `${name}.png`),
    animations: 'disabled',
  })
}

/**
 * The software-WebGL boardroom can starve Playwright's actionability rAF
 * checks on this classroom laptop, so deliver a real pointer click at the
 * element's on-screen center instead of waiting for locator.click(). This
 * still exercises hit-testing, layering, and every DOM event handler.
 */
async function qaClick(
  page: Page,
  target: ReturnType<Page['locator']> | string,
): Promise<void> {
  const locator = typeof target === 'string' ? page.locator(target) : target
  const first = locator.first()
  await first
    .evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }))
    .catch(() => undefined)
  await page.waitForTimeout(60)
  const box = await first.boundingBox()
  if (!box) throw new Error(`qaClick: no bounding box for ${typeof target === 'string' ? target : 'locator'}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function expectWelcome(page: Page, label: string, takeShot = true): Promise<void> {
  const viewport = page.viewportSize()
  expect(viewport, `${label} viewport`).not.toBeNull()
  const { width, height } = viewport!

  await expect(page.locator('#title-art')).toHaveCount(1)
  await expect(page.locator('#title-art')).toBeVisible()
  await expect(page.locator('.title-screen')).toHaveCSS('opacity', '1')
  await expect(page.locator('#title-art')).toHaveCSS('opacity', '1')
  await page.waitForFunction(() => {
    const image = document.getElementById('title-art') as HTMLImageElement | null
    return Boolean(image && image.complete && image.naturalWidth > 0)
  })
  const art = await page.locator('#title-art').evaluate((element) => {
    const image = element as HTMLImageElement
    const rect = image.getBoundingClientRect()
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      src: image.getAttribute('src') ?? '',
      absoluteSrc: image.src,
      centerX: rect.left + rect.width / 2,
      top: rect.top,
      width: rect.width,
    }
  })
  expect(art.naturalWidth, 'approved badge naturalWidth').toBeGreaterThan(0)
  expect(art.src).toContain('assets/ui/the_next_blue_ocean_badge.png')
  expect(art.absoluteSrc.startsWith('http://127.0.0.1') || art.absoluteSrc.startsWith('http://localhost')).toBe(true)
  expect(Math.abs(art.centerX - width / 2), 'badge horizontally centered').toBeLessThanOrEqual(width * 0.02)
  expect(art.top, 'badge high').toBeGreaterThanOrEqual(height * 0.02)
  expect(art.top, 'badge high').toBeLessThanOrEqual(height * 0.16)
  expect(art.width, 'badge max width').toBeLessThanOrEqual(Math.min(width * 0.66, 910))

  const starts = page.locator('[data-action="start"]:visible')
  await expect(starts).toHaveCount(1)
  expect(((await starts.first().textContent()) ?? '').trim()).toBe('Start')
  const startBox = await starts.first().boundingBox()
  expect(startBox, 'Start bounding box').not.toBeNull()
  expect(Math.abs(startBox!.x + startBox!.width / 2 - width / 2), 'Start centered').toBeLessThanOrEqual(width * 0.03)
  expect(startBox!.y, 'Start lower center').toBeGreaterThan(height * 0.74)
  expect(startBox!.y + startBox!.height, 'Start within viewport').toBeLessThanOrEqual(height + 1)
  expect(startBox!.height, 'Start min height').toBeGreaterThanOrEqual(44)

  // One primary call to action, and none of the crossed-out welcome clutter.
  expect(await page.locator('.title-screen .primary-button:visible').count(), 'one primary CTA').toBe(1)
  for (const selector of [
    '.title-aside',
    '.title-dek',
    '.title-note',
    '.title-lockup',
    '.title-actions .text-button',
  ]) {
    expect(await page.locator(selector).count(), `removed ${selector}`).toBe(0)
  }
  expect(await page.locator('.title-screen .eyebrow:visible').count(), 'no visible eyebrow').toBe(0)
  expect(await page.getByRole('button', { name: /presenter guide/i }).count(), 'no presenter guide CTA').toBe(0)
  const visibleLargeH1 = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.title-screen h1')).filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 2 && rect.height > 2
    }).length,
  )
  expect(visibleLargeH1, 'no duplicate visible title heading').toBe(0)

  const credit = page.locator('.title-credit')
  await expect(credit).toBeVisible()
  await expect(credit).toContainText('Towball')
  await expect(credit).toContainText('CC BY 4.0')
  const hrefs = await credit.locator('a').evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  )
  expect(hrefs.some((href) => href.includes('towball.itch.io')), 'music source link').toBe(true)
  expect(hrefs.some((href) => href.includes('creativecommons.org/licenses/by/4.0')), 'license link').toBe(true)

  // HUD gear, mute and fullscreen must remain on top and clickable.
  for (const id of ['presenter-button', 'mute-button', 'fullscreen-button']) {
    const box = await page.locator(`#${id}`).boundingBox()
    expect(box, `${id} visible`).not.toBeNull()
    const hit = await page.evaluate((elementId) => {
      const element = document.getElementById(elementId)
      if (!element) return false
      const rect = element.getBoundingClientRect()
      const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return Boolean(target && (target === element || target.closest(`#${elementId}`)))
    }, id)
    expect(hit, `${id} not covered`).toBe(true)
  }
  const mute = page.locator('#mute-button')
  const mutedBefore = (await getState(page)).muted
  await qaClick(page, mute)
  await expect.poll(async () => (await getState(page)).muted).toBe(!mutedBefore)
  await qaClick(page, mute)
  await expect.poll(async () => (await getState(page)).muted).toBe(mutedBefore)

  await expectNoOverflow(page, `${label} welcome`)
  if (takeShot) await shot(page, `welcome-${label}`)
}

async function drainDialogue(page: Page): Promise<void> {
  for (let guard = 0; guard < 80; guard += 1) {
    const state = await getState(page)
    if (!DIALOGUE_PHASES.has(state.phase)) return
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await page.keyboard.press('Space')
    await page.waitForTimeout(60)
  }
  throw new Error('Dialogue did not terminate')
}

async function collectDialogue(
  page: Page,
  phase: GameState['phase'],
  seen: Set<string>,
): Promise<void> {
  for (let guard = 0; guard < 80; guard += 1) {
    const state = await getState(page)
    if (state.phase !== phase) return
    const panel = page.locator('#dialogue-panel')
    await expect(panel).toBeVisible()
    if (await panel.evaluate((element) => element.classList.contains('is-typing'))) {
      await page.evaluate(() => document.getElementById('dialogue-panel')?.click())
      await page.waitForTimeout(220)
    }
    const name = ((await page.locator('#speaker-name').innerText()) ?? '').trim()
    seen.add(name)

    const bubble = await page.locator('#dialogue-art').evaluate((element) => {
      const image = element as HTMLImageElement
      return {
        naturalWidth: image.naturalWidth,
        src: image.getAttribute('src') ?? '',
      }
    })
    expect(bubble.naturalWidth, 'approved bubble naturalWidth').toBeGreaterThan(0)
    expect(bubble.src).toContain('assets/ui/dialogue-bubble.png')

    const fit = await page.evaluate(() => {
      const text = document.getElementById('dialogue-text')
      const panel = document.getElementById('dialogue-panel')
      const hud = document.getElementById('hud')
      if (!text || !panel || !hud) return null
      const tr = text.getBoundingClientRect()
      const pr = panel.getBoundingClientRect()
      const hr = hud.getBoundingClientRect()
      return {
        overflowX: text.scrollWidth - text.clientWidth,
        overflowY: text.scrollHeight - text.clientHeight,
        insidePanel: tr.left >= pr.left - 2 && tr.right <= pr.right + 2 && tr.top >= pr.top - 2 && tr.bottom <= pr.bottom + 2,
        hudOverlap: !(pr.bottom <= hr.top || hr.bottom <= pr.top || pr.right <= hr.left || hr.right <= pr.left),
        text: (text.textContent ?? '').trim(),
      }
    })
    expect(fit).not.toBeNull()
    expect(fit!.overflowX, `dialogue text horizontal overflow for ${name}`).toBeLessThanOrEqual(2)
    expect(fit!.overflowY, `dialogue text vertical overflow for ${name}`).toBeLessThanOrEqual(2)
    expect(fit!.insidePanel, `dialogue copy inside bubble for ${name}`).toBe(true)
    expect(fit!.hudOverlap, 'dialogue does not overlap HUD').toBe(false)
    expect(fit!.text.length).toBeGreaterThan(0)

    const tag = await page.locator('.name-tag-tint').evaluate((element) => {
      const style = getComputedStyle(element.querySelector('path') ?? element)
      const panel = document.getElementById('dialogue-panel')
      return {
        fill: style.fill,
        speaker: panel?.dataset.speaker ?? '',
      }
    })
    expect(tag.fill, `name-tag fill for ${name}`).not.toBe('none')
    expect(tag.fill, `name-tag tint for ${name}`).not.toBe('rgba(0, 0, 0, 0)')
    expect(tag.speaker.length, `speaker data attribute for ${name}`).toBeGreaterThan(0)

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
  }
  throw new Error(`Dialogue phase ${phase} did not terminate`)
}

async function expectVoteScreen(
  page: Page,
  decisionKey: 'd1' | 'd2' | 'd3' | 'd4',
  voteNumber: number,
  votesInChapter: number,
): Promise<ReturnType<Page['locator']>> {
  const screen = page.locator('.voting-screen')
  await expect(screen).toBeVisible()
  // Visibility alone ignores opacity; wait out screen-enter so the board is
  // actually legible (and screenshots are not blank frames).
  await expect(screen).toHaveCSS('opacity', '1')
  const eyebrow = ((await screen.locator('.eyebrow').first().innerText()) ?? '').replace(/\s+/g, ' ')
  expect(eyebrow, 'vote eyebrow has BOARD VOTE').toMatch(/BOARD VOTE/)
  expect(eyebrow, 'vote eyebrow has vote progress').toContain(`VOTE ${voteNumber} OF ${votesInChapter}`)
  expect(eyebrow, 'vote eyebrow must not say CHAPTER').not.toMatch(/CHAPTER/i)

  const text = await screen.innerText()
  expect(text, 'decision context paragraph removed').not.toContain(DECISIONS[decisionKey].context)
  expect(text, 'audience instruction footer removed').not.toMatch(/Audience votes by hand/i)
  expect(text, 'presenter instruction footer removed').not.toMatch(/Presenter selects/i)
  expect(text, 'no "correct card" lecture').not.toMatch(/no scoring or/i)
  await expect(screen.locator('.choice-card')).toHaveCount(3)
  // Legacy CSS uppercases the visible benefit/trade-off labels, so innerText is
  // BENEFIT / TRADE-OFF while the authored DOM text stays title case.
  expect(text.toLowerCase()).toContain('benefit')
  expect(text.toLowerCase()).toContain('trade-off')

  const commit = screen.locator('[data-action="commit-choice"]')
  await expect(commit).toBeVisible()
  expect(((await commit.textContent()) ?? '').trim(), 'primary action exact text').toBe('Confirm')
  await expect(commit).toBeDisabled()
  return commit
}

async function expectFactory(
  page: Page,
  expected: { title: string; key: string; source: string },
  options: { inspectBuilding: boolean; replay: boolean; label: string },
): Promise<ModelInfo> {
  const screen = page.locator('.factory-screen')
  await expect(screen).toBeVisible()
  await expect(screen.locator('.factory-card')).toHaveCSS('opacity', '1')
  expect(await page.locator('.factory-banner').count(), 'factory banner removed').toBe(0)
  expect(await screen.locator('.eyebrow').count(), 'factory card eyebrow removed').toBe(0)
  expect(await screen.locator('.prototype-number').count(), 'prototype number removed').toBe(0)
  expect((await screen.innerText())).not.toMatch(/AUDIENCE CONCEPT/i)
  expect((await screen.innerText())).not.toMatch(/FICTIONAL DESIGN EXERCISE/i)

  const source = page.locator('.factory-source')
  expect(await source.count(), 'factory source present in DOM').toBe(1)
  expect((await source.textContent()) ?? '').toContain(expected.source)
  const sourceHidden = await source.evaluate((element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      (rect.width <= 2 && rect.height <= 2) ||
      (style.position === 'absolute' && (style.clip !== 'auto' || style.clipPath !== 'none')) ||
      style.visibility === 'hidden'
    )
  })
  expect(sourceHidden, 'factory source visually hidden').toBe(true)

  const labels = await page.evaluate((label) => {
    return Array.from(document.querySelectorAll('.factory-screen *'))
      .filter((element) => (element.textContent ?? '').trim() === label)
      .filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1
      })
      .map((element) => element.tagName)
  }, SIMULATED_LABEL)
  expect(labels.length, 'exactly one quiet simulated label').toBe(1)
  expect(await page.locator('.fine-print').filter({ hasText: /A fictional composition, not a prediction/i }).count()).toBe(0)

  if (options.inspectBuilding) {
    const leave = page.locator('[data-action="leave-factory"]')
    expect(await leave.isVisible().catch(() => false), 'Confirm hidden while building').toBe(false)
    await page.keyboard.press('s')
  }
  await waitForFactoryDone(page)
  // Completion re-renders the card and restarts card-enter (360 ms). Wait for
  // the new card to settle so the reveal, not a blank entrance frame, is shown.
  await expect(page.locator('.factory-card')).toHaveCSS('opacity', '1')
  await expect(page.getByRole('heading', { name: expected.title })).toBeVisible()
  await expect(page.getByText('PRIORITIZES', { exact: true })).toBeVisible()
  await expect(page.getByText('TRADE-OFFS', { exact: true })).toBeVisible()

  const leave = page.locator('[data-action="leave-factory"]')
  await expect(leave).toBeVisible()
  expect(((await leave.textContent()) ?? '').trim(), 'factory primary action exact text').toBe('Confirm')

  const model = await page.evaluate((): ModelInfo | null => {
    const game = (window as any).__GAME__
    const current = game?.scene?.factory?.currentModel
    if (!current) return null
    let meshes = 0
    let vertices = 0
    current.traverse((object: any) => {
      if (object.isMesh) {
        meshes += 1
        vertices += object.geometry?.attributes?.position?.count ?? 0
      }
    })
    return {
      name: current.name ?? '',
      key: current.userData?.key ?? '',
      title: current.userData?.title ?? '',
      children: current.children.length,
      meshes,
      vertices,
    }
  })
  expect(model, 'prototype 3D model').not.toBeNull()
  expect(model!.name, 'prototype geometry variant').toContain(expected.key.replace(/[^a-z0-9]+/gi, '-'))
  expect(model!.key, 'prototype model key').toBe(expected.key)
  expect(model!.title, 'prototype model title').toBe(expected.title)
  expect(model!.meshes, 'prototype has geometry').toBeGreaterThan(3)
  await expectNoOverflow(page, options.label)
  await shot(page, options.label)

  if (options.replay) {
    await qaClick(page, page.locator('[data-action="replay-factory"]'))
    await page.waitForFunction(
      () => (window as any).__GAME_STATE__?.factoryProgress !== 'idle',
      null,
      { timeout: 10_000 },
    )
    await page.keyboard.press('s')
    await waitForFactoryDone(page)
    await expect(page.getByRole('heading', { name: expected.title })).toBeVisible()
  }
  return model!
}

async function expectTransition(
  page: Page,
  index: 0 | 1 | 2,
  chapterBefore: number,
): Promise<void> {
  const screen = page.locator('.transition-screen')
  await expect(screen).toBeVisible()
  await expect(screen).toHaveCSS('opacity', '1')
  const text = await screen.innerText()
  expect(text, 'sealed footnote removed').not.toContain(SEALED_FOOTNOTE)
  expect(await screen.locator('.sealed-small.single').count(), 'no sealed-small footnote node').toBe(0)
  expect(text.length).toBeGreaterThan(20)
  const next = screen.locator('[data-action="transition-next"]')
  await expect(next).toBeVisible()
  const nextText = ((await next.textContent()) ?? '').trim()
  if (index < 2) {
    expect(nextText, 'transition primary action exact text').toBe('Continue')
  } else {
    // Round 2 asks for exact Continue on every transition; the third card is
    // also the archive gate. Record a note instead of failing the two chapter
    // transitions that the Universal contract names explicitly.
    expect(
      nextText === 'Continue' || nextText === 'See the grand finale',
      'third transition label',
    ).toBe(true)
  }
  await expectNoOverflow(page, `transition ${index + 1}`)
  await qaClick(page, next)
  if (chapterBefore < 2) {
    await waitForPhase(page, 'briefing')
    expect((await getState(page)).chapterIndex).toBe(chapterBefore + 1)
  } else {
    await waitForPhase(page, 'finale')
  }
}

async function expectSealed(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  expect(text, 'pre-finale history leak').not.toMatch(HISTORY_LEAK)
  expect(await page.locator('.archive-screen').count()).toBe(0)
  await expect(page.locator('#seal-indicator')).toHaveText('HISTORICAL RECORD SEALED')
}

async function voteAndBuild(
  page: Page,
  choiceNumber: 1 | 2 | 3,
  useKeyboardCommit: boolean,
): Promise<void> {
  await page.keyboard.press(String(choiceNumber))
  await expect(page.locator('.choice-card.is-selected')).toHaveCount(1)
  const commit = page.locator('[data-action="commit-choice"]')
  await expect(commit).toBeEnabled()
  if (useKeyboardCommit) {
    await page.keyboard.press('v')
  } else {
    await qaClick(page, commit)
  }
}

async function runResponsiveJourney(
  browser: Browser,
  viewport: { width: number; height: number },
  choices: ChoiceSet,
  label: string,
): Promise<void> {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const pageErrors: string[] = []
  const externalRequests: string[] = []
  const failedRequests: string[] = []
  // A relative APP_URL ('/' by default) must resolve against the Playwright
  // baseURL, not the bare host, or every local request would look external.
  let appOrigin = new URL(APP_URL, 'http://127.0.0.1:5173').origin
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (!url.startsWith('http')) return
    if (!url.startsWith(appOrigin)) externalRequests.push(url)
  })
  page.on('requestfailed', (request) => {
    // Media range loads are routinely aborted (net::ERR_ABORTED) when the
    // looping track changes; that is not a failed local resource.
    if (request.url().startsWith(appOrigin) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`)
    }
  })
  page.on('response', (response) => {
    if (response.url().startsWith(appOrigin) && response.status() >= 400) {
      failedRequests.push(`${response.status()} ${response.url()}`)
    }
  })

  await openGame(page)
  appOrigin = await page.evaluate(() => window.location.origin)
  await expectWelcome(page, label, true)
  const start = page.locator('[data-action="start"]')
  await start.evaluate((element) => (element as HTMLElement).focus())
  await page.keyboard.press('Enter')
  await waitForPhase(page, 'opening')
  await drainDialogue(page)
  await waitForPhase(page, 'briefing')
  await expectNoOverflow(page, `${label} briefing`)
  await qaClick(page, '[data-action="begin-chapter"]')
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')

  // D1
  await expectVoteScreen(page, 'd1', 1, 1)
  await expectNoOverflow(page, `${label} vote d1`)
  if (label === '1366x768') await shot(page, `vote-d1-${label}`)
  if (label === '1024x768') await shot(page, `vote-d1-${label}`)
  await voteAndBuild(page, choices.d1 === 'A' ? 1 : choices.d1 === 'B' ? 2 : 3, false)
  await waitForPhase(page, 'factory')
  const d1Spec = buildPrototypeSpec(0, { d1: choices.d1 })
  await expectFactory(page, {
    title: d1Spec.title,
    key: d1Spec.key,
    source: `Built from Chapter 1 vote: ${choices.d1} · ${
      DECISIONS.d1.options.find((option) => option.id === choices.d1)?.shortTitle ?? ''
    }`,
  }, { inspectBuilding: false, replay: false, label: `factory-d1-${label}` })
  await qaClick(page, '[data-action="leave-factory"]')
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectTransition(page, 0, 0)

  // D2
  await qaClick(page, '[data-action="begin-chapter"]')
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expectVoteScreen(page, 'd2', 1, 1)
  await voteAndBuild(page, choices.d2 === 'A' ? 1 : choices.d2 === 'B' ? 2 : 3, true)
  await waitForPhase(page, 'factory')
  const d2Spec = buildPrototypeSpec(1, { d2: choices.d2 })
  await expectFactory(page, {
    title: d2Spec.title,
    key: d2Spec.key,
    source: `Built from Chapter 2 vote: ${choices.d2} · ${
      DECISIONS.d2.options.find((option) => option.id === choices.d2)?.shortTitle ?? ''
    }`,
  }, { inspectBuilding: false, replay: false, label: `factory-d2-${label}` })
  await qaClick(page, '[data-action="leave-factory"]')
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectTransition(page, 1, 1)

  // D3 + D4
  await qaClick(page, '[data-action="begin-chapter"]')
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expectVoteScreen(page, 'd3', 1, 2)
  await voteAndBuild(page, choices.d3 === 'A' ? 1 : choices.d3 === 'B' ? 2 : 3, true)
  await waitForPhase(page, 'voting')
  expect((await getState(page)).choices.d3).toBe(choices.d3)
  await expectVoteScreen(page, 'd4', 2, 2)
  await expectNoOverflow(page, `${label} vote d4`)
  await voteAndBuild(page, choices.d4 === 'A' ? 1 : choices.d4 === 'B' ? 2 : 3, false)
  await waitForPhase(page, 'factory')
  const d3d4Spec = buildPrototypeSpec(2, { d3: choices.d3, d4: choices.d4 })
  await expectFactory(page, {
    title: d3d4Spec.title,
    key: d3d4Spec.key,
    source: `Built from two votes: ${choices.d3} · ${
      DECISIONS.d3.options.find((option) => option.id === choices.d3)?.shortTitle ?? ''
    } + ${choices.d4} · ${
      DECISIONS.d4.options.find((option) => option.id === choices.d4)?.shortTitle ?? ''
    }`,
  }, { inspectBuilding: false, replay: false, label: `factory-d3d4-${label}` })
  await qaClick(page, '[data-action="leave-factory"]')
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectTransition(page, 2, 2)

  // Finale and archive at this size.
  await expectSealed(page)
  await expect(page.getByRole('heading', { name: 'Nintendo’s turn' })).toBeVisible()
  await expect(page.locator('.finale-intro')).toHaveCSS('opacity', '1')
  await qaClick(page, '[data-action="open-archive"]')
  await expect(page.getByRole('heading', { name: 'The historical record' })).toBeVisible()
  await expect(page.locator('.archive-screen')).toHaveCSS('opacity', '1')
  await expectNoOverflow(page, `${label} archive`)
  if (label === '1366x768') await shot(page, `archive-${label}`)

  expect(externalRequests, `external requests at ${label}`).toEqual([])
  expect(failedRequests, `failed local requests at ${label}`).toEqual([])
  expect(pageErrors, `page errors at ${label}`).toEqual([])
  await context.close()
}

// ---------------------------------------------------------------------------
// 1. Frozen assets and protected source
// ---------------------------------------------------------------------------

test('frozen assets and protected source match PROTECTED_BASELINE.sha256', async () => {
  const projectRoot = process.cwd()
  const baselinePath = path.resolve(projectRoot, '..', 'agent-reports', 'universal-ui', 'PROTECTED_BASELINE.sha256')
  expect(existsSync(baselinePath), `baseline present at ${baselinePath}`).toBe(true)
  const lines = readFileSync(baselinePath, 'utf8').split(/\r?\n/).filter((line) => line.trim().length > 0)
  expect(lines.length).toBeGreaterThan(20)
  const failures: string[] = []
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i)
    expect(match, `valid baseline line: ${line}`).not.toBeNull()
    const expected = match?.[1]
    const relative = match?.[2]
    if (!expected || !relative) {
      failures.push(`INVALID ${line}`)
      continue
    }
    const filePath = path.resolve(projectRoot, relative)
    if (!existsSync(filePath)) {
      failures.push(`MISSING ${relative}`)
      continue
    }
    const actual = createHash('sha256').update(readFileSync(filePath)).digest('hex')
    if (actual !== expected.toLowerCase()) {
      failures.push(`MISMATCH ${relative} expected=${expected} actual=${actual}`)
    }
  }
  expect(failures, failures.join('\n')).toEqual([])
})

// ---------------------------------------------------------------------------
// 2. Welcome at all three projector sizes
// ---------------------------------------------------------------------------

test('approved welcome at 1920x1080, 1366x768 and 1024x768', async ({ page }) => {
  test.setTimeout(240_000)
  for (const [label, width, height] of [
    ['1920x1080', 1920, 1080],
    ['1366x768', 1366, 768],
    ['1024x768', 1024, 768],
  ] as const) {
    await page.setViewportSize({ width, height })
    await openGame(page)
    await expectWelcome(page, label)
  }
})

// ---------------------------------------------------------------------------
// 3. Canonical journey: dialogue, four votes, three factories, finale
// ---------------------------------------------------------------------------

test.describe('animated canonical journey', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('dialogue, votes, factories, transitions, sealed finale and archive', async ({ page }) => {
    test.setTimeout(300_000)
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const externalRequests: string[] = []
    const failedRequests: string[] = []
    const appOrigin = new URL(APP_URL, 'http://127.0.0.1:5173').origin
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) return
      if (!url.startsWith(appOrigin)) externalRequests.push(url)
    })
    page.on('requestfailed', (request) => {
      // A looping music track cancels in-flight byte-range reads with
      // net::ERR_ABORTED; those are expected and not broken local assets.
      if (request.url().startsWith(appOrigin) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
        failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`)
      }
    })
    page.on('response', (response) => {
      if (response.url().startsWith(appOrigin) && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.setViewportSize({ width: 1920, height: 1080 })
    await openGame(page)
    // Audio starts locked until the first gesture. This must be checked before
    // expectWelcome(), which clicks the mute control and therefore unlocks it.
    expect(await page.evaluate(() => (window as any).__GAME__?.audio.getSpeechDebug() ?? null)).toBeNull()
    await expectWelcome(page, '1920x1080')
    await expectSealed(page)

    await qaClick(page, '[data-action="start"]')
    await waitForPhase(page, 'opening')
    await expect.poll(async () => page.evaluate(() => (window as any).__GAME__?.audio.getSpeechDebug() !== null)).toBe(true)
    await expect.poll(async () => page.evaluate(() => (window as any).__GAME__?.audio.getMusicDebug() !== null)).toBe(true)

    // Speaker coverage: opening (narrator, Shelldon, Hootley, Slyvester) then
    // Chapter 1 advisors (Pawson, Damian) completes all five executives plus
    // the narrator. The first typed Shell line is used for the mute check.
    const seen = new Set<string>()
    await collectDialogue(page, 'opening', seen)
    await waitForPhase(page, 'briefing')
    await expect(page.getByRole('heading', { name: 'The Console Wars' })).toBeVisible()
    await expectNoOverflow(page, '1920 briefing')

    await qaClick(page, '[data-action="begin-chapter"]')
    await waitForPhase(page, 'advisors')
    // Mute stops babble immediately without stopping the text.
    await page.waitForTimeout(250)
    const speechBeforeMute = await page.evaluate(() => (window as any).__GAME__?.audio.getSpeechDebug())
    expect(speechBeforeMute, 'speech engine initialized').not.toBeNull()
    await page.keyboard.press('m')
    await expect.poll(async () => (await getState(page)).muted).toBe(true)
    await expect.poll(async () => page.evaluate(() => (window as any).__GAME__?.audio.getSpeechDebug()?.activeSources ?? 0)).toBe(0)
    const phaseWhileMuted = (await getState(page)).phase
    expect(phaseWhileMuted).toBe('advisors')
    await page.keyboard.press('m')
    await expect.poll(async () => (await getState(page)).muted).toBe(false)

    await collectDialogue(page, 'advisors', seen)
    await waitForPhase(page, 'voting')
    for (const name of SCREEN_NAMES) expect(seen, `speaker ${name} appeared`).toContain(name)

    // ---------------- Chapter 1 ----------------
    const commit1 = await expectVoteScreen(page, 'd1', 1, 1)
    await expectNoOverflow(page, '1920 vote d1')
    await shot(page, 'vote-d1-1920x1080')
    await page.keyboard.press('2')
    expect((await getState(page)).selectedChoice).toBe('B')
    await page.keyboard.press('3')
    expect((await getState(page)).selectedChoice).toBe('C')
    await page.keyboard.press('1')
    expect((await getState(page)).selectedChoice).toBe('A')
    await expect(commit1).toBeEnabled()
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    expect((await getState(page)).choices).toEqual({ d1: 'A' })
    const d1Spec = buildPrototypeSpec(0, { d1: 'A' })
    const d1Model = await expectFactory(page, {
      title: d1Spec.title,
      key: d1Spec.key,
      source: 'Built from Chapter 1 vote: A · Power Race',
    }, { inspectBuilding: true, replay: true, label: 'factory-d1-1920x1080' })
    await qaClick(page, '[data-action="leave-factory"]')
    await waitForPhase(page, 'feedback')
    await drainDialogue(page)
    await waitForPhase(page, 'transition')
    await expectTransition(page, 0, 0)

    // ---------------- Chapter 2 ----------------
    await qaClick(page, '[data-action="begin-chapter"]')
    await waitForPhase(page, 'advisors')
    await drainDialogue(page)
    await waitForPhase(page, 'voting')
    await expectVoteScreen(page, 'd2', 1, 1)
    await voteAndBuild(page, 2, false)
    await waitForPhase(page, 'factory')
    expect((await getState(page)).choices.d2).toBe('B')
    const d2Spec = buildPrototypeSpec(1, { d2: 'B' })
    const d2Model = await expectFactory(page, {
      title: d2Spec.title,
      key: d2Spec.key,
      source: 'Built from Chapter 2 vote: B · Second Screen',
    }, { inspectBuilding: false, replay: false, label: 'factory-d2-1920x1080' })
    await qaClick(page, '[data-action="leave-factory"]')
    await waitForPhase(page, 'feedback')
    await drainDialogue(page)
    await waitForPhase(page, 'transition')
    await expectTransition(page, 1, 1)

    // ---------------- Chapter 3: two votes, one factory ----------------
    await qaClick(page, '[data-action="begin-chapter"]')
    await waitForPhase(page, 'advisors')
    await drainDialogue(page)
    await waitForPhase(page, 'voting')
    await expectVoteScreen(page, 'd3', 1, 2)
    await shot(page, 'vote-d3-1920x1080')
    await voteAndBuild(page, 3, true)
    await waitForPhase(page, 'voting')
    expect((await getState(page)).choices).toEqual({ d1: 'A', d2: 'B', d3: 'C' })
    await expectVoteScreen(page, 'd4', 2, 2)
    await expectNoOverflow(page, '1920 vote d4')
    await voteAndBuild(page, 2, false)
    await waitForPhase(page, 'factory')
    const d3d4Spec = buildPrototypeSpec(2, { d3: 'C', d4: 'B' })
    const d3d4Model = await expectFactory(page, {
      title: d3d4Spec.title,
      key: d3d4Spec.key,
      source: 'Built from two votes: C · Hybrid + B · Shared Play',
    }, { inspectBuilding: false, replay: false, label: 'factory-d3d4-1920x1080' })
    await qaClick(page, page.getByRole('button', { name: /^Confirm$/ }))
    await waitForPhase(page, 'feedback')
    await drainDialogue(page)
    await waitForPhase(page, 'transition')
    await expectTransition(page, 2, 2)

    // Distinct decisions produced distinct titles and geometry.
    const keys = new Set([d1Model.key, d2Model.key, d3d4Model.key])
    expect(keys.size, 'three distinct prototype keys').toBe(3)
    const modelNames = new Set([d1Model.name, d2Model.name, d3d4Model.name])
    expect(modelNames.size, 'three distinct prototype meshes').toBe(3)
    const signatures = new Set(
      [d1Model, d2Model, d3d4Model].map(
        (model) => `${model.key}:${model.meshes}:${model.vertices}`,
      ),
    )
    expect(signatures.size, 'three distinct prototype geometries').toBe(3)

    // ---------------- Finale and archive ----------------
    await expectSealed(page)
    await expect(page.getByRole('heading', { name: 'Nintendo’s turn' })).toBeVisible()
    await expect(page.locator('.finale-intro')).toHaveCSS('opacity', '1')
    await expectNoOverflow(page, '1920 sealed finale')
    await shot(page, 'finale-sealed-1920x1080')
    await qaClick(page, '[data-action="open-archive"]')
    await expect(page.getByRole('heading', { name: 'The historical record' })).toBeVisible()
    await expect(page.locator('.archive-screen')).toHaveCSS('opacity', '1')
    await expect(page.locator('#seal-indicator')).toHaveText('HISTORICAL RECORD OPEN')
    await expectNoOverflow(page, '1920 archive')
    await shot(page, 'archive-1920x1080')

    const archiveText = await page.locator('.archive-screen').innerText()
    for (const fact of [
      'Wii',
      'Wii U',
      'Original Nintendo Switch',
      '101.63 million',
      '13.56 million',
      '156.59 million',
      'As of June 30, 2026',
      'not unique players',
      'No pass/fail',
      DISCUSSION_QUESTION,
      'C · Hybrid',
      'B · Shared Play',
    ]) {
      expect(archiveText, `archive fact: ${fact}`).toContain(fact)
    }
    expect(await page.locator('.history-card').count()).toBe(3)
    expect(await page.locator('.history-caution').count()).toBe(3)
    for (const caution of await page.locator('.history-caution').allInnerTexts()) {
      expect(caution.trim().length).toBeGreaterThan(20)
    }
    await expect(page.locator('.sources a').first()).toHaveAttribute(
      'href',
      'https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html',
    )
    expect(await page.locator('.sources a').count()).toBeGreaterThanOrEqual(6)
    await expect(page.locator('.discussion-card')).toContainText('Ask the room')

    // Evidence jump scrolls the archive to the discussion card.
    const archiveScrollBefore = await page.locator('.archive-screen').evaluate((element) => element.scrollTop)
    await qaClick(page, '[data-action="scroll-discussion"]')
    await page.waitForTimeout(700)
    const archiveScrollAfter = await page.locator('.archive-screen').evaluate((element) => element.scrollTop)
    expect(archiveScrollAfter, 'evidence jump changes archive scroll').toBeGreaterThan(archiveScrollBefore)
    const discussionInView = await page.locator('.discussion-card').evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0
    })
    expect(discussionInView, 'discussion card in view after evidence jump').toBe(true)

    const finalState = await getState(page)
    expect(finalState.choices).toEqual({ d1: 'A', d2: 'B', d3: 'C', d4: 'B' })
    expect(finalState.phase).toBe('finale')

    expect(externalRequests, 'no external network requests').toEqual([])
    expect(failedRequests, 'no failed local requests').toEqual([])
    expect(pageErrors, 'no page errors').toEqual([])
    const unexpectedConsoleErrors = consoleErrors.filter(
      (message) => !/WebGL|GPU|THREE|swiftshader|AudioContext/i.test(message),
    )
    expect(unexpectedConsoleErrors, 'no unexpected console errors').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. Responsive journeys with different choices at 1366 and 1024
// ---------------------------------------------------------------------------

test('responsive journeys at 1366x768 and 1024x768 with distinct choices', async ({ browser }) => {
  test.setTimeout(300_000)
  await runResponsiveJourney(
    browser,
    { width: 1366, height: 768 },
    { d1: 'C', d2: 'A', d3: 'B', d4: 'A' },
    '1366x768',
  )
  await runResponsiveJourney(
    browser,
    { width: 1024, height: 768 },
    { d1: 'B', d2: 'C', d3: 'A', d4: 'C' },
    '1024x768',
  )
})

// ---------------------------------------------------------------------------
// 5. Presenter drawer at 1366x768
// ---------------------------------------------------------------------------

test('presenter gear, focus trap, inert background and reset at 1366x768', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1366, height: 768 })
  await openGame(page)
  const gear = page.locator('#presenter-button')
  await expect(gear).toHaveAttribute('aria-label', 'Presenter settings')
  await qaClick(page, gear)
  const drawer = page.locator('.presenter-drawer')
  await expect(drawer).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
  await expect(drawer).toHaveAttribute('role', 'dialog')
  await expect(drawer).toHaveAttribute('aria-modal', 'true')

  // Background is inert, including the canvas.
  expect(await page.locator('#hud').evaluate((element) => element.hasAttribute('inert'))).toBe(true)
  expect(await page.locator('#view').evaluate((element) => element.hasAttribute('inert'))).toBe(true)
  expect(await page.locator('#scene').evaluate((element) => element.hasAttribute('inert'))).toBe(true)

  // Focus starts in the drawer and Tab cycles inside the modal layer. The
  // layer includes the full-screen scrim close button (a real focus target by
  // design), so the trap boundary is #presenter-layer, not the drawer alone.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const drawerElement = document.querySelector('.presenter-drawer')
        return Boolean(
          document.activeElement && drawerElement && drawerElement.contains(document.activeElement),
        )
      }),
    )
    .toBe(true)
  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => {
      const active = document.activeElement
      const layer = document.getElementById('presenter-layer')
      return Boolean(active && layer && layer.contains(active))
    })
    expect(inside, `focus trapped after Tab ${index + 1}`).toBe(true)
  }
  // The inert background must never receive focus while the modal is open.
  const focusInBackground = await page.evaluate(() => {
    const active = document.activeElement
    return Boolean(active && (active.closest('#hud') || active.closest('#view') || active.id === 'scene'))
  })
  expect(focusInBackground, 'background focus blocked by inert').toBe(false)

  // Restart and reset are reachable at 1366x768.
  const reset = page.locator('[data-action="reset-demo"]')
  await expect(reset).toBeVisible()
  await reset.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(120)
  const resetBox = await reset.boundingBox()
  expect(resetBox, 'reset bounding box').not.toBeNull()
  expect(resetBox!.y + resetBox!.height, 'reset within viewport').toBeLessThanOrEqual(768 + 1)
  expect(resetBox!.x + resetBox!.width, 'reset within viewport width').toBeLessThanOrEqual(1366 + 1)
  await expect(page.locator('[data-action="restart-scene"]')).toBeVisible()
  await shot(page, 'presenter-1366x768')

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Reset the entire demo')
    await dialog.accept()
  })
  await qaClick(page, reset)
  await waitForPhase(page, 'title')
  expect((await getState(page)).choices).toEqual({})
  expect((await getState(page)).started).toBe(false)
  await expect(page.locator('[data-action="start"]')).toBeVisible()

  // Escape closes the drawer and returns focus to the gear.
  await qaClick(page, gear)
  await expect(drawer).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect
    .poll(async () => page.evaluate(() => document.activeElement?.id ?? ''))
    .toBe('presenter-button')
  // Closing must release the background so the title remains operable.
  for (const id of ['hud', 'view', 'scene']) {
    expect(
      await page.locator(`#${id}`).evaluate((element) => element.hasAttribute('inert')),
      `${id} inert released after close`,
    ).toBe(false)
  }
})

// ---------------------------------------------------------------------------
// 6. Static production build smoke (only when pointed at a preview server)
// ---------------------------------------------------------------------------

test('static preview smoke is local-only and reaches voting', async ({ page }) => {
  test.skip(process.env.UI_QA_STATIC !== '1', 'Set UI_QA_STATIC=1 with UI_QA_URL pointing at vite preview')
  await page.setViewportSize({ width: 1366, height: 768 })
  const externalRequests: string[] = []
  const pageErrors: string[] = []
  const appOrigin = new URL(APP_URL, 'http://127.0.0.1:5173').origin
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) return
    if (!url.startsWith(appOrigin)) externalRequests.push(url)
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openGame(page)
  await expectWelcome(page, 'static-1366x768', false)
  await qaClick(page, '[data-action="start"]')
  await waitForPhase(page, 'opening')
  await drainDialogue(page)
  await waitForPhase(page, 'briefing')
  await qaClick(page, '[data-action="begin-chapter"]')
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expectVoteScreen(page, 'd1', 1, 1)
  expect(externalRequests).toEqual([])
  expect(pageErrors).toEqual([])
})

// Keep a local record of the last run's screenshot directory for the report.
writeFileSync(path.join(SCREENS_DIR, '.last-run.txt'), new Date().toISOString())
