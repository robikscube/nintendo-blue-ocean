import { expect, test, type Page } from '@playwright/test'
import type { GameState } from '../../src/core/types'
import { SIMULATED_LABEL } from '../../src/core/story'
import { buildPrototypeSpec } from '../../src/scene/prototype-model'

declare global {
  interface Window {
    __QA_FACTORY_ENTRIES__?: number
  }
}

const DIALOGUE_PHASES = new Set(['opening', 'advisors', 'feedback', 'boss'])
const HISTORY_LEAK = /\bWii\b|Wii U|Nintendo Switch|Joy-Con|GamePad|101\.63|13\.56|156\.59|June 30, 2026|\b2006\b|\b2012\b|\b2017\b/
const ARCHIVE_FACTS = [
  'Wii',
  'Wii U',
  'Original Nintendo Switch',
  '101.63 million',
  '13.56 million',
  '156.59 million',
  'As of June 30, 2026',
  'not unique players',
  'No pass/fail',
]

async function openGame(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

async function getState(page: Page): Promise<GameState> {
  return page.evaluate(() => window.__GAME_STATE__ as GameState)
}

async function waitForPhase(page: Page, phase: GameState['phase']): Promise<void> {
  await page.waitForFunction((expected) => window.__GAME_STATE__?.phase === expected, phase, {
    timeout: 15_000,
  })
}

async function waitForFactoryDone(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done', null, {
    timeout: 20_000,
  })
}

async function drainDialogue(page: Page): Promise<void> {
  for (let guard = 0; guard < 40; guard += 1) {
    const phase = await page.evaluate(() => window.__GAME_STATE__?.phase)
    if (!phase || !DIALOGUE_PHASES.has(phase)) return
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await page.keyboard.press('Space')
    await page.waitForTimeout(170)
  }
  throw new Error('Dialogue did not terminate')
}

async function expectSealed(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(HISTORY_LEAK)
  await expect(page.locator('.archive-screen')).toHaveCount(0)
  await expect(page.locator('#seal-indicator')).toHaveText('HISTORICAL RECORD SEALED')
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

async function recordFactoryEntries(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__QA_FACTORY_ENTRIES__ = 0
    window.__GAME__?.store.subscribe((state, previous) => {
      if (state.phase === 'factory' && previous.phase !== 'factory') {
        window.__QA_FACTORY_ENTRIES__ = (window.__QA_FACTORY_ENTRIES__ ?? 0) + 1
      }
    })
  })
}

test('canonical four-vote classroom flow: three factories, sealed history, official archive at 1080p', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await openGame(page)
  await recordFactoryEntries(page)

  expect(page.viewportSize()).toEqual({ width: 1920, height: 1080 })
  await expect(page.getByRole('heading', { name: /The Next Blue Ocean/i })).toBeVisible()
  await expect(page.locator('#fallback-note')).toBeHidden()
  await expectSealed(page)
  await expectNoHorizontalOverflow(page)

  // Opening dialogue, then Chapter 1 briefing.
  await page.getByRole('button', { name: /^Start$/i }).click()
  await waitForPhase(page, 'opening')
  await expectSealed(page)
  await drainDialogue(page)
  await waitForPhase(page, 'briefing')
  await expect(page.getByRole('heading', { name: 'The Console Wars' })).toBeVisible()
  await expectSealed(page)

  // Chapter 1: one vote, one factory.
  await page.getByRole('button', { name: /Convene the board/i }).click()
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expect(page.locator('.voting-screen')).toBeVisible()
  await expect(page.locator('.choice-card')).toHaveCount(3)
  await expectSealed(page)
  await expectNoHorizontalOverflow(page)
  await page.keyboard.press('2')
  await expect(page.locator('.choice-card.is-selected')).toContainText('Open the Living Room')
  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await waitForFactoryDone(page)
  await expect(page.getByText(SIMULATED_LABEL)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: buildPrototypeSpec(0, { d1: 'B' }).title }),
  ).toBeVisible()
  await expectSealed(page)
  await expectNoHorizontalOverflow(page)
  await page.locator('[data-action="leave-factory"]').click()
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectSealed(page)
  await page.getByRole('button', { name: /^Continue$/i }).click()
  await waitForPhase(page, 'briefing')
  expect((await getState(page)).chapterIndex).toBe(1)

  // Chapter 2: one vote, one factory.
  await expect(page.getByRole('heading', { name: 'The Follow-Up Problem' })).toBeVisible()
  await page.getByRole('button', { name: /Convene the board/i }).click()
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expect(page.locator('.choice-card')).toHaveCount(3)
  await expectSealed(page)
  await page.keyboard.press('2')
  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await waitForFactoryDone(page)
  await expect(
    page.getByRole('heading', { name: buildPrototypeSpec(1, { d2: 'B' }).title }),
  ).toBeVisible()
  await expect(page.getByText(SIMULATED_LABEL)).toBeVisible()
  await expectSealed(page)
  await page.locator('[data-action="leave-factory"]').click()
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectSealed(page)
  await page.getByRole('button', { name: /^Continue$/i }).click()
  await waitForPhase(page, 'briefing')
  expect((await getState(page)).chapterIndex).toBe(2)

  // Chapter 3: two connected votes, then exactly one factory.
  await expect(page.getByRole('heading', { name: 'The Category Is Up for Grabs' })).toBeVisible()
  await page.getByRole('button', { name: /Convene the board/i }).click()
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expect(page.locator('.choice-card')).toHaveCount(3)
  await expectSealed(page)
  await page.keyboard.press('3')
  await page.keyboard.press('v')
  await waitForPhase(page, 'voting')
  const afterD3 = await getState(page)
  expect(afterD3.choices.d3).toBe('C')
  expect(afterD3.choices.d4).toBeUndefined()
  await expect(page.getByText(/VOTE 2 OF 2/)).toBeVisible()
  await expect(page.locator('.factory-screen')).toHaveCount(0)
  await expect(page.locator('.choice-card')).toHaveCount(3)
  await expectSealed(page)
  await page.keyboard.press('2')
  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await waitForFactoryDone(page)
  await expect(
    page.getByRole('heading', { name: buildPrototypeSpec(2, { d3: 'C', d4: 'B' }).title }),
  ).toBeVisible()
  await expect(page.getByText(SIMULATED_LABEL)).toBeVisible()
  await expectSealed(page)
  await expectNoHorizontalOverflow(page)
  await page.locator('[data-action="leave-factory"]').click()
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectSealed(page)

  // Exactly one factory per chapter, one per reveal.
  expect(await page.evaluate(() => window.__QA_FACTORY_ENTRIES__ ?? 0)).toBe(3)

  // Sealed finale intro, then the only place historical facts may appear.
  await page.getByRole('button', { name: /See the grand finale/i }).click()
  await waitForPhase(page, 'finale')
  await expect(page.getByRole('heading', { name: 'Nintendo’s turn' })).toBeVisible()
  await expectSealed(page)
  await expectNoHorizontalOverflow(page)
  await page.locator('[data-action="open-archive"]').click()
  await expect(page.getByRole('heading', { name: 'The historical record' })).toBeVisible()
  await expect(page.locator('#seal-indicator')).toHaveText('HISTORICAL RECORD OPEN')
  await expect(page.locator('.archive-screen')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  const archiveText = await page.locator('.archive-screen').innerText()
  for (const fact of ARCHIVE_FACTS) expect(archiveText).toContain(fact)
  expect(archiveText).toContain('C · Hybrid')
  expect(archiveText).toContain('B · Shared Play')
  expect(archiveText).toContain('D3')
  await expect(page.locator('.sources a').first()).toHaveAttribute(
    'href',
    'https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html',
  )

  const finalState = await getState(page)
  expect(finalState.choices).toEqual({ d1: 'B', d2: 'B', d3: 'C', d4: 'B' })
  expect(finalState.phase).toBe('finale')


  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !/WebGL|GPU|THREE|swiftshader/i.test(message),
  )
  expect(pageErrors).toEqual([])
  expect(unexpectedConsoleErrors).toEqual([])
})
