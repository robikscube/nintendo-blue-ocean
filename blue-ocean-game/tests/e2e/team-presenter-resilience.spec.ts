import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ChoiceId, GameState } from '../../src/core/types'

const DIALOGUE_PHASES = new Set(['opening', 'advisors', 'feedback', 'boss'])

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

function shotPath(name: string): string {
  return path.resolve(process.cwd(), 'qa-screens', `${name}.png`)
}

/** Store-driven setup: title -> Chapter 1 factory with a committed D1 vote. */
async function driveToD1Factory(page: Page, choice: ChoiceId): Promise<void> {
  await page.evaluate((selected) => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('Game store unavailable')
    const isDialogue = (phase: string): boolean =>
      ['opening', 'advisors', 'feedback', 'boss'].includes(phase)
    const drain = (): void => {
      for (let guard = 0; guard < 40; guard += 1) {
        if (!isDialogue(store.state.phase)) return
        store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      }
    }
    store.dispatch({ type: 'START' })
    drain()
    store.dispatch({ type: 'BEGIN_CHAPTER' })
    drain()
    store.dispatch({ type: 'SELECT_CHOICE', choice: selected })
    store.dispatch({ type: 'COMMIT_CHOICE' })
  }, choice)
  await waitForPhase(page, 'factory')
  await waitForFactoryDone(page)
}

test.describe('presenter controls', () => {
  test('jumping back to a voted chapter reopens a usable, re-votable screen instead of a dead end', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await openGame(page)
    await driveToD1Factory(page, 'B')

    await page.locator('#presenter-button').click()
    await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
    const jumpToChapterOne = page.locator('[data-action="jump-chapter"][data-index="0"]')
    await expect(jumpToChapterOne).toBeDisabled()
    await page.locator('[data-action="presenter-mode"]').click()
    await expect(jumpToChapterOne).toBeEnabled()
    await jumpToChapterOne.click()
    await page.keyboard.press('Escape')
    await expect(page.locator('.presenter-drawer')).toBeHidden()

    await waitForPhase(page, 'briefing')
    const jumped = await getState(page)
    expect(jumped.chapterIndex).toBe(0)
    expect(jumped.choices.d1).toBeUndefined()
    await expect(page.getByRole('heading', { name: 'The Console Wars' })).toBeVisible()

    // Re-run Chapter 1. The old bug left phase=voting with an empty #view.
    await page.getByRole('button', { name: /Convene the board/i }).click()
    await waitForPhase(page, 'advisors')
    await drainDialogue(page)
    await waitForPhase(page, 'voting')
    await expect(page.locator('.voting-screen')).toBeVisible()
    await expect(page.locator('.choice-card')).toHaveCount(3)
    await expect(page.locator('#view')).not.toBeEmpty()
    await expect(page.getByRole('heading', { name: /Where should the next platform compete/i })).toBeVisible()

    await page.screenshot({ path: shotPath('team-presenter-jump-revoted-1920') })
    await page.keyboard.press('1')
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    await waitForFactoryDone(page)
    const reVoted = await getState(page)
    expect(reVoted.choices.d1).toBe('A')
    await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
    expect(pageErrors).toEqual([])
  })

  test('jumping ahead invents no votes and the archive discloses "Not voted"', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await openGame(page)
    await page.locator('#presenter-button').click()
    await page.locator('[data-action="presenter-mode"]').click()
    await page.locator('[data-action="jump-chapter"][data-index="2"]').click()
    await page.keyboard.press('Escape')
    await waitForPhase(page, 'briefing')
    await expect(page.getByRole('heading', { name: 'The Category Is Up for Grabs' })).toBeVisible()
    expect((await getState(page)).choices).toEqual({})

    await page.locator('#presenter-button').click()
    await page.locator('[data-action="show-finale"]').click()
    await page.keyboard.press('Escape')
    await waitForPhase(page, 'finale')
    await expect(page.getByRole('heading', { name: 'The sealed archive' })).toBeVisible()
    await page.locator('[data-action="open-archive"]').click()
    await expect(page.locator('.archive-screen')).toBeVisible()

    const pathText = await page.locator('.class-path').innerText()
    expect(pathText.match(/Not voted/g)?.length ?? 0).toBe(4)
    expect(pathText).not.toMatch(/\bA · /)
    await expect(page.locator('.path-chip')).toHaveCount(4)
    expect((await getState(page)).choices).toEqual({})
    expect(pageErrors).toEqual([])
  })
})

test.describe('checkpoints and reset', () => {
  test('refresh preserves a draft vote and committed factory, and reset clears the demo', async ({
    page,
  }) => {
    // Reloads plus a software-rendered first factory can approach the 90s default.
    test.setTimeout(180_000)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await openGame(page)
    await page.getByRole('button', { name: /^Start$/i }).click()
    await waitForPhase(page, 'opening')
    await drainDialogue(page)
    await waitForPhase(page, 'briefing')
    await page.getByRole('button', { name: /Convene the board/i }).click()
    await waitForPhase(page, 'advisors')
    await drainDialogue(page)
    await waitForPhase(page, 'voting')

    // A selected but uncommitted choice survives refresh as a draft.
    await page.keyboard.press('2')
    expect((await getState(page)).selectedChoice).toBe('B')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)
    await waitForPhase(page, 'voting')
    const restoredDraft = await getState(page)
    expect(restoredDraft.selectedChoice).toBe('B')
    expect(restoredDraft.choices).toEqual({})
    await expect(page.locator('.choice-card.is-selected')).toContainText('Open the Living Room')

    // Committing, then refreshing during the factory returns to a clean idle build.
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    await waitForFactoryDone(page)
    expect((await getState(page)).choices).toEqual({ d1: 'B' })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)
    await waitForPhase(page, 'factory')
    await waitForFactoryDone(page)
    expect((await getState(page)).choices).toEqual({ d1: 'B' })
    await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
    await expect(page.locator('[data-action="leave-factory"]')).toBeVisible()
    await page.screenshot({ path: shotPath('team-reload-factory-checkpoint-1920') })

    // Mute survives, then a confirmed reset returns to a clean title.
    await page.keyboard.press('m')
    expect((await getState(page)).muted).toBe(true)
    await page.locator('#presenter-button').click()
    await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Reset the entire demo')
      await dialog.accept()
    })
    await page.locator('[data-action="reset-demo"]').click()
    await waitForPhase(page, 'title')
    const reset = await getState(page)
    expect(reset.choices).toEqual({})
    expect(reset.started).toBe(false)
    expect(reset.muted).toBe(true)
    await expect(page.getByRole('button', { name: /^Start$/i })).toBeVisible()
    await expect(page.locator('#mute-button')).toHaveAttribute('aria-pressed', 'true')
    expect(pageErrors).toEqual([])
  })

  test('refreshing on the finale returns to the sealed intro, never the open archive', async ({
    page,
  }) => {
    await openGame(page)
    await page.evaluate(() => {
      window.__GAME__?.store.dispatch({ type: 'SHOW_FINALE' })
    })
    await waitForPhase(page, 'finale')
    await page.locator('[data-action="open-archive"]').click()
    await expect(page.locator('.archive-screen')).toBeVisible()

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)
    await waitForPhase(page, 'finale')
    await expect(page.locator('.archive-screen')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'The sealed archive' })).toBeVisible()
    await expect(page.locator('[data-action="open-archive"]')).toBeVisible()
    await expect(page.locator('#seal-indicator')).toHaveText('HISTORICAL RECORD SEALED')
  })
})
