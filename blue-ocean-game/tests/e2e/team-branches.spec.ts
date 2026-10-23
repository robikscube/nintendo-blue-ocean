import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ChoiceId } from '../../src/core/types'
import { getDecisionLabel } from '../../src/core/story'
import { buildPrototypeSpec } from '../../src/scene/prototype-model'

const CHOICES: readonly ChoiceId[] = ['A', 'B', 'C']

async function openGame(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

async function waitForPhase(page: Page, phase: string): Promise<void> {
  await page.waitForFunction((expected) => window.__GAME_STATE__?.phase === expected, phase, {
    timeout: 15_000,
  })
}

async function waitForFactoryDone(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done', null, {
    timeout: 20_000,
  })
}

async function waitForRenderedFactory(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const debug = window.__GAME__?.scene?.getDebugInfo()
      return Boolean(debug && debug.mode === 'factory' && typeof debug.drawCalls === 'number' && debug.drawCalls > 0)
    },
    null,
    { timeout: 10_000 },
  )
}

/**
 * Store-driven navigation to a chapter's voting screen so each branch test can
 * focus on the target decision. Intermediate factory choreography is advanced
 * through valid state transitions, never by editing state directly.
 */
async function driveToVoting(
  page: Page,
  targetChapter: 0 | 1 | 2,
  prior: Partial<Record<'d1' | 'd2', ChoiceId>> = {},
): Promise<void> {
  await page.evaluate(
    ({ chapter, priorChoices }) => {
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
      const finishIntermediateFactory = (): void => {
        store.dispatch({ type: 'FACTORY_STARTED' })
        store.dispatch({ type: 'FACTORY_FINISHED' })
        store.dispatch({ type: 'LEAVE_FACTORY' })
        drain()
        store.dispatch({ type: 'COMPLETE_TRANSITION' })
      }

      store.dispatch({ type: 'START' })
      drain()
      store.dispatch({ type: 'BEGIN_CHAPTER' })
      drain()

      if (chapter >= 1) {
        store.dispatch({ type: 'SELECT_CHOICE', choice: priorChoices.d1 ?? 'A' })
        store.dispatch({ type: 'COMMIT_CHOICE' })
        finishIntermediateFactory()
        store.dispatch({ type: 'BEGIN_CHAPTER' })
        drain()
      }
      if (chapter >= 2) {
        store.dispatch({ type: 'SELECT_CHOICE', choice: priorChoices.d2 ?? 'B' })
        store.dispatch({ type: 'COMMIT_CHOICE' })
        finishIntermediateFactory()
        store.dispatch({ type: 'BEGIN_CHAPTER' })
        drain()
      }
    },
    { chapter: targetChapter, priorChoices: prior },
  )
  await waitForPhase(page, 'voting')
}

async function commitByKeyboard(page: Page, choice: ChoiceId): Promise<void> {
  const index = CHOICES.indexOf(choice) + 1
  await page.keyboard.press(String(index))
  await page.keyboard.press('v')
}

function shotPath(name: string): string {
  return path.resolve(process.cwd(), 'qa-screens', `${name}.png`)
}

test.describe('every D1 branch builds its own labeled concept', () => {
  for (const choice of CHOICES) {
    test(`D1 ${choice} reaches a distinct factory concept`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))

      await openGame(page)
      await driveToVoting(page, 0)
      await expect(page.locator('.choice-card')).toHaveCount(3)
      await commitByKeyboard(page, choice)
      await waitForPhase(page, 'factory')
      await waitForFactoryDone(page)
      await waitForRenderedFactory(page)

      const expected = buildPrototypeSpec(0, { d1: choice })
      await expect(page.getByRole('heading', { name: expected.title })).toBeVisible()
      await expect(page.locator('.factory-source')).toContainText(getDecisionLabel('d1', choice))
      await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
      if (choice === 'B') {
        await page.screenshot({ path: shotPath('team-branch-d1-B-1920') })
      }
      expect(pageErrors).toEqual([])
    })
  }
})

test.describe('every D2 branch builds its own labeled concept', () => {
  for (const choice of CHOICES) {
    test(`D2 ${choice} keeps the D1 vote and reaches a distinct factory concept`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))

      await openGame(page)
      await driveToVoting(page, 1, { d1: 'A' })
      await expect(page.locator('.choice-card')).toHaveCount(3)
      await commitByKeyboard(page, choice)
      await waitForPhase(page, 'factory')
      await waitForFactoryDone(page)
      await waitForRenderedFactory(page)

      const state = await page.evaluate(() => window.__GAME_STATE__)
      expect(state?.choices).toEqual({ d1: 'A', d2: choice })
      const expected = buildPrototypeSpec(1, { d2: choice })
      await expect(page.getByRole('heading', { name: expected.title })).toBeVisible()
      await expect(page.locator('.factory-source')).toContainText(getDecisionLabel('d2', choice))
      await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
      if (choice === 'C') {
        await page.screenshot({ path: shotPath('team-branch-d2-C-1920') })
      }
      expect(pageErrors).toEqual([])
    })
  }
})

test.describe('all nine D3 x D4 combinations', () => {
  for (const d3 of CHOICES) {
    for (const d4 of CHOICES) {
      test(`D3 ${d3} + D4 ${d4} waits for both votes and builds one specific concept`, async ({
        page,
      }) => {
        const pageErrors: string[] = []
        page.on('pageerror', (error) => pageErrors.push(error.message))

        await openGame(page)
        await driveToVoting(page, 2, { d1: 'A', d2: 'B' })
        await expect(page.getByText(/VOTE 1 OF 2/)).toBeVisible()

        await commitByKeyboard(page, d3)
        await waitForPhase(page, 'voting')
        const afterD3 = await page.evaluate(() => window.__GAME_STATE__)
        expect(afterD3?.choices.d3).toBe(d3)
        expect(afterD3?.choices.d4).toBeUndefined()
        await expect(page.getByText(/VOTE 2 OF 2/)).toBeVisible()
        await expect(page.locator('.factory-screen')).toHaveCount(0)

        await commitByKeyboard(page, d4)
        await waitForPhase(page, 'factory')
        await waitForFactoryDone(page)
        await waitForRenderedFactory(page)

        const expected = buildPrototypeSpec(2, { d3, d4 })
        await expect(page.getByRole('heading', { name: expected.title })).toBeVisible()
        await expect(page.locator('.factory-source')).toContainText(getDecisionLabel('d3', d3))
        await expect(page.locator('.factory-source')).toContainText(getDecisionLabel('d4', d4))
        await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
        const state = await page.evaluate(() => window.__GAME_STATE__)
        expect(state?.choices).toEqual({ d1: 'A', d2: 'B', d3, d4 })
        if (d3 === 'C' && d4 === 'B') {
          await page.screenshot({ path: shotPath('team-branch-d3C-d4B-1920') })
        }
        expect(pageErrors).toEqual([])
      })
    }
  }
})
