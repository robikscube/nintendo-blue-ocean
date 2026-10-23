import { expect, test, type Page } from '@playwright/test'
import type { GameState } from '../../src/core/types'

async function openGame(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

async function getState(page: Page): Promise<GameState> {
  return page.evaluate(() => window.__GAME_STATE__ as GameState)
}

async function waitForPhase(page: Page, phase: GameState['phase']): Promise<void> {
  await page.waitForFunction((expected) => window.__GAME_STATE__?.phase === expected, phase, {
    timeout: 10_000,
  })
}

async function drainDialogue(page: Page): Promise<void> {
  for (let guard = 0; guard < 40; guard += 1) {
    const state = await getState(page)
    if (!['opening', 'advisors', 'feedback', 'boss'].includes(state.phase)) return
    await page.keyboard.press('Space')
    await page.waitForTimeout(35)
  }
  throw new Error('Dialogue did not terminate')
}

async function startAndReachVoting(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Start$/i }).click()
  await waitForPhase(page, 'opening')
  await drainDialogue(page)
  await waitForPhase(page, 'briefing')
  await page.getByRole('button', { name: /Convene the board/i }).click()
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
}

async function commitAndFinishFactory(page: Page, choice: '1' | '2' | '3'): Promise<void> {
  await page.keyboard.press(choice)
  await expect(page.locator('.choice-card.is-selected')).toHaveCount(1)
  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
  await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
  await page.getByRole('button', { name: /^Confirm$/i }).click()
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
}

async function finishTransition(page: Page, chapter: number): Promise<void> {
  if (chapter < 3) {
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await waitForPhase(page, 'briefing')
  } else {
    await page.getByRole('button', { name: /Open the sealed archive/i }).click()
    await waitForPhase(page, 'finale')
  }
}

async function expectHistorySealed(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\bWii\b/)
  expect(text).not.toMatch(/Wii U/)
  expect(text).not.toMatch(/Nintendo Switch/)
  expect(text).not.toMatch(/Joy-Con/)
  expect(text).not.toMatch(/GamePad/)
  expect(text).not.toContain('101.63')
  expect(text).not.toContain('13.56')
  expect(text).not.toContain('156.59')
  expect(text).not.toContain('June 30, 2026')
}

test('completes all three chapters, four votes, and reveals only the cited historical archive', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openGame(page)

  await expect(page.getByRole('heading', { name: /The Next Blue Ocean/i })).toBeVisible()
  await expect(page.locator('#fallback-note')).toBeHidden()
  await expectHistorySealed(page)

  await page.getByRole('button', { name: /^Start$/i }).click()
  await waitForPhase(page, 'opening')
  await drainDialogue(page)
  await waitForPhase(page, 'briefing')
  await expect(page.getByRole('heading', { name: 'The Console Wars' })).toBeVisible()
  await page.getByRole('button', { name: /Convene the board/i }).click()
  await waitForPhase(page, 'advisors')
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await expectHistorySealed(page)
  await page.keyboard.press('2')
  await expect(page.locator('.choice-card.is-selected')).toContainText('Open the Living Room')
  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
  await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The Hearth Box' })).toBeVisible()
  await page.getByRole('button', { name: /^Confirm$/i }).click()
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectHistorySealed(page)
  await page.getByRole('button', { name: /^Continue$/i }).click()
  await waitForPhase(page, 'briefing')

  await page.getByRole('button', { name: /Convene the board/i }).click()
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await commitAndFinishFactory(page, '2')
  await expectHistorySealed(page)
  await finishTransition(page, 2)

  await page.getByRole('button', { name: /Convene the board/i }).click()
  await drainDialogue(page)
  await waitForPhase(page, 'voting')
  await page.keyboard.press('3')
  await page.keyboard.press('v')
  await waitForPhase(page, 'voting')
  const secondVote = await getState(page)
  expect(secondVote.choices.d3).toBe('C')
  expect(secondVote.choices.d4).toBeUndefined()
  await expect(page.getByText(/VOTE 2 OF 2/)).toBeVisible()
  await page.keyboard.press('2')
  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
  await expect(page.getByRole('heading', { name: /Take-Anywhere Dock/i })).toBeVisible()
  await page.getByRole('button', { name: /^Confirm$/i }).click()
  await waitForPhase(page, 'feedback')
  await drainDialogue(page)
  await waitForPhase(page, 'transition')
  await expectHistorySealed(page)
  await finishTransition(page, 3)

  await expect(page.getByRole('heading', { name: 'The sealed archive' })).toBeVisible()
  await expectHistorySealed(page)
  await page.getByRole('button', { name: /Break the seal/i }).click()
  await expect(page.getByRole('heading', { name: 'The historical record' })).toBeVisible()

  const archiveText = await page.locator('.archive-screen').innerText()
  expect(archiveText).toContain('Wii')
  expect(archiveText).toContain('Wii U')
  expect(archiveText).toContain('Original Nintendo Switch')
  expect(archiveText).toContain('101.63 million')
  expect(archiveText).toContain('13.56 million')
  expect(archiveText).toContain('156.59 million')
  expect(archiveText).toContain('As of June 30, 2026')
  expect(archiveText).toContain('not unique players')
  expect(archiveText).toContain('No pass/fail')
  expect(archiveText).toContain('D3')
  expect(archiveText).toContain('C · Hybrid')
  expect(archiveText).toContain('B · Shared Play')

  const finalState = await getState(page)
  expect(finalState.choices).toEqual({ d1: 'B', d2: 'B', d3: 'C', d4: 'B' })
  expect(pageErrors).toEqual([])
})

test('restores a safe checkpoint through reload and resets cleanly from the presenter desk', async ({ page }) => {
  await openGame(page)
  await startAndReachVoting(page)
  await page.keyboard.press('2')
  expect((await getState(page)).selectedChoice).toBe('B')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await waitForPhase(page, 'voting')
  const restored = await getState(page)
  expect(restored.selectedChoice).toBe('B')
  expect(restored.choices).toEqual({})
  await expect(page.locator('.choice-card.is-selected')).toContainText('Open the Living Room')

  await page.keyboard.press('v')
  await waitForPhase(page, 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
  expect((await getState(page)).choices).toEqual({ d1: 'B' })

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
  expect((await getState(page)).choices).toEqual({ d1: 'B' })
  await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()

  await page.locator('#presenter-button').click()
  await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Reset the entire demo')
    await dialog.accept()
  })
  await page.getByRole('button', { name: /Reset entire demo/i }).click()
  await waitForPhase(page, 'title')
  const reset = await getState(page)
  expect(reset.choices).toEqual({})
  expect(reset.started).toBe(false)
  await expect(page.getByRole('button', { name: /^Start$/i })).toBeVisible()
})

test('protects chapter jumps behind presenter mode', async ({ page }) => {
  await openGame(page)
  await page.locator('#presenter-button').click()
  const jumpButton = page.locator('[data-action="jump-chapter"]').first()
  await expect(jumpButton).toBeDisabled()
  await page.locator('[data-action="presenter-mode"]').click()
  await expect(page.locator('[data-action="jump-chapter"]').first()).toBeEnabled()
  await expect(page.locator('[data-action="show-finale"]')).toBeEnabled()
  await page.locator('[data-action="jump-chapter"]').nth(1).click()
  await waitForPhase(page, 'briefing')
  expect((await getState(page)).chapterIndex).toBe(1)
  expect((await getState(page)).choices).toEqual({})
  await page.keyboard.press('Escape')
  await expect(page.locator('.presenter-drawer')).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => window.__GAME_STATE__?.chapterIndex === 2)
  expect((await getState(page)).phase).toBe('briefing')
})

test('keeps all runtime requests local to the application origin', async ({ page, baseURL }) => {
  const appOrigin = new URL(baseURL ?? 'http://127.0.0.1:5173').origin
  const remoteRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith(appOrigin) || url.startsWith('data:') || url.startsWith('blob:')) return
    remoteRequests.push(url)
  })
  await openGame(page)
  await page.waitForTimeout(700)
  expect(remoteRequests).toEqual([])
})
