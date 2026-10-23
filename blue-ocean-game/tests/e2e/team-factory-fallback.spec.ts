import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ChoiceId, GameState } from '../../src/core/types'

declare global {
  interface Window {
    __QA_FACTORY_TRACE__?: Array<{ progress: string; at: number }>
  }
}

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
    timeout: 25_000,
  })
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
}

test.describe('factory animation with normal motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('skip finishes immediately, replay restarts visibly, and the story continues once', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await openGame(page)
    await driveToD1Factory(page, 'C')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'running', null, {
      timeout: 15_000,
    })
    await expect(page.locator('[data-action="skip-factory"]')).toBeVisible()
    await expect(page.locator('[data-action="leave-factory"]')).toBeHidden()
    await expect(page.locator('[data-action="replay-factory"]')).toBeHidden()
    await page.screenshot({ path: shotPath('team-factory-running-1920') })

    const skipStart = Date.now()
    await page.keyboard.press('s')
    await waitForFactoryDone(page)
    const skipElapsed = Date.now() - skipStart
    // Software WebGL at 1080p can stall the compositor; assert skip is decisive,
    // not a specific frame time (it completed in ~4.7s under swiftshader).
    expect(skipElapsed).toBeLessThan(8000)
    await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
    await expect(page.locator('[data-action="skip-factory"]')).toBeHidden()
    await expect(page.locator('[data-action="leave-factory"]')).toBeVisible()
    await expect(page.locator('[data-action="replay-factory"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'The Pocket Dock' })).toBeVisible()
    await page.screenshot({ path: shotPath('team-factory-revealed-1920') })

    // Replay must return to a visible build state with a working Skip control.
    await page.locator('[data-action="replay-factory"]').click()
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'running', null, {
      timeout: 5_000,
    })
    await expect(page.locator('[data-action="skip-factory"]')).toBeVisible()
    await expect(page.locator('[data-action="leave-factory"]')).toBeHidden()
    await expect(page.locator('.factory-screen')).toHaveCount(1)
    await expect(page.locator('.factory-card')).toHaveCount(1)

    const replaySkipStart = Date.now()
    await page.keyboard.press('s')
    await waitForFactoryDone(page)
    expect(Date.now() - replaySkipStart).toBeLessThan(8000)
    await expect(page.locator('.factory-screen')).toHaveCount(1)
    await expect(page.locator('[data-action="leave-factory"]')).toBeVisible()
    expect((await getState(page)).choices).toEqual({ d1: 'C' })

    // Continuing the story after a replay enters feedback exactly once.
    await page.locator('[data-action="leave-factory"]').click()
    await waitForPhase(page, 'feedback')
    expect((await getState(page)).dialogueIndex).toBe(0)
    expect(pageErrors).toEqual([])
  })

  test('reloading mid-animation restores an idle factory that rebuilds once', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await openGame(page)
    await driveToD1Factory(page, 'B')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'running', null, {
      timeout: 15_000,
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)
    await waitForPhase(page, 'factory')
    const restored = await getState(page)
    expect(restored.choices).toEqual({ d1: 'B' })
    expect(['idle', 'running']).toContain(restored.factoryProgress)
    await waitForFactoryDone(page)
    await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
    await expect(page.locator('[data-action="leave-factory"]')).toBeVisible()
    await expect(page.locator('.factory-screen')).toHaveCount(1)
    expect((await getState(page)).choices).toEqual({ d1: 'B' })
    expect(pageErrors).toEqual([])
  })
})

test('replay obeys prefers-reduced-motion and does not block the story', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await openGame(page)
  await driveToD1Factory(page, 'B')
  await waitForFactoryDone(page)
  await expect(page.locator('[data-action="replay-factory"]')).toBeVisible()

  // Record in-page transition timestamps so the brief idle->running->done
  // sequence cannot be missed, and so renderer polling overhead is excluded.
  await page.evaluate(() => {
    window.__QA_FACTORY_TRACE__ = []
    window.__GAME__?.store.subscribe((state) => {
      window.__QA_FACTORY_TRACE__?.push({
        progress: state.factoryProgress,
        at: performance.now(),
      })
    })
  })

  await page.locator('[data-action="replay-factory"]').click()
  await page.waitForFunction(
    () => {
      const trace = window.__QA_FACTORY_TRACE__
      return Boolean(trace?.some((entry) => entry.progress === 'idle') && trace[trace.length - 1]?.progress === 'done')
    },
    null,
    { timeout: 3_000 },
  )
  const trace = await page.evaluate(() => window.__QA_FACTORY_TRACE__ ?? [])
  expect(trace.map((entry) => entry.progress)).toEqual(['idle', 'running', 'done'])
  const idle = trace[0]
  const done = trace[trace.length - 1]
  const buildMs = (done?.at ?? 0) - (idle?.at ?? 0)
  expect(buildMs).toBeLessThan(1_500)
  expect(await page.evaluate(() => window.__GAME__?.scene?.getDebugInfo().reducedMotion)).toBe(true)
  await expect(page.locator('[data-action="leave-factory"]')).toBeVisible()
  await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('remains fully playable in story mode when WebGL cannot start', async ({ page }) => {
  test.setTimeout(180_000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ): RenderingContext | null {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.call(this, type, ...args) as RenderingContext | null
    } as typeof HTMLCanvasElement.prototype.getContext
  })

  await openGame(page)
  await expect(page.locator('#fallback-note')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/no-webgl/)
  expect(await page.evaluate(() => window.__GAME__?.scene)).toBeNull()

  // The factory still resolves without a scene, and the prototype label stays exact.
  await driveToD1Factory(page, 'A')
  await waitForFactoryDone(page)
  expect((await getState(page)).choices).toEqual({ d1: 'A' })
  await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
  await expect(page.locator('[data-action="leave-factory"]')).toBeVisible()

  // The finale remains reachable and factually complete without WebGL.
  await page.evaluate(() => {
    window.__GAME__?.store.dispatch({ type: 'SHOW_FINALE' })
  })
  await waitForPhase(page, 'finale')
  await page.locator('[data-action="open-archive"]').click()
  const archiveText = await page.locator('.archive-screen').innerText()
  expect(archiveText).toContain('Wii')
  expect(archiveText).toContain('Original Nintendo Switch')
  expect(archiveText).toContain('156.59 million')
  expect(pageErrors).toEqual([])
})
