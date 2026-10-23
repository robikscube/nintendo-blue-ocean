import { expect, test, type Page } from 'C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/node_modules/@playwright/test/index.mjs'
import type { GameState } from '../../blue-ocean-game/src/core/types'

async function openGame(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

async function getState(page: Page): Promise<GameState> {
  return page.evaluate(() => window.__GAME_STATE__ as GameState)
}

async function fastForwardToFactory(page: Page, choice: 'A' | 'B' | 'C' = 'B'): Promise<void> {
  await page.evaluate((selected) => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('Game store missing')
    if (store.state.phase === 'title') store.dispatch({ type: 'START' })
    const dialoguePhases = new Set(['opening', 'advisors', 'feedback', 'boss'])
    for (let guard = 0; guard < 30; guard += 1) {
      const state = store.state
      if (!dialoguePhases.has(state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
    store.dispatch({ type: 'BEGIN_CHAPTER' })
    for (let guard = 0; guard < 30; guard += 1) {
      const state = store.state
      if (!dialoguePhases.has(state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
    store.dispatch({ type: 'SELECT_CHOICE', choice: selected })
    store.dispatch({ type: 'COMMIT_CHOICE' })
  }, choice)
}

test.describe('timed presentation interactions', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('typewriter completes on the first interaction and advances only on the next', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: /Enter the boardroom/i }).click()
    await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
    // The first line is narrator narration and appears instantly. The second is typed.
    await page.keyboard.press('Space')
    await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 1)
    await expect(page.locator('#dialogue-panel')).toHaveClass(/is-typing/)
    const fullText = await page.locator('#dialogue-accessible').innerText()
    expect(fullText.length).toBeGreaterThan(40)

    await page.evaluate(() => document.getElementById('dialogue-panel')?.click())
    await expect(page.locator('#dialogue-panel')).not.toHaveClass(/is-typing/)
    expect((await getState(page)).dialogueIndex).toBe(1)
    await expect(page.locator('#dialogue-panel')).toHaveAttribute('aria-busy', 'false')
    expect(await page.locator('#dialogue-text').innerText()).toContain('Welcome to the board')

    await page.waitForTimeout(180)
    await page.locator('#dialogue-panel').click()
    await page.waitForFunction(() => window.__GAME_STATE__?.dialogueIndex === 2)
    expect((await getState(page)).phase).toBe('opening')
  })

  test('skips, replays, and recovers the factory without changing the vote', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await openGame(page)
    await fastForwardToFactory(page, 'C')
    await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'factory')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'running', null, {
      timeout: 10_000,
    })
    await page.waitForTimeout(500)
    expect((await getState(page)).factoryProgress).toBe('running')
    await page.keyboard.press('s')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
    await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
    expect((await getState(page)).choices.d1).toBe('C')

    await page.getByRole('button', { name: /Replay build/i }).click()
    await page.waitForTimeout(250)
    await page.keyboard.press('s')
    await page.waitForTimeout(180)
    expect((await getState(page)).phase).toBe('factory')
    expect((await getState(page)).factoryProgress).toBe('done')
    await expect(page.getByRole('button', { name: /Face the board/i })).toBeVisible()
    expect(pageErrors).toEqual([])
  })

  test('mute is an immediate, reversible state change', async ({ page }) => {
    await openGame(page)
    await page.keyboard.press('m')
    await expect(page.locator('#mute-button')).toHaveAttribute('aria-pressed', 'true')
    expect((await getState(page)).muted).toBe(true)
    await page.keyboard.press('m')
    await expect(page.locator('#mute-button')).toHaveAttribute('aria-pressed', 'false')
    expect((await getState(page)).muted).toBe(false)
  })
})

test('remains playable in story mode when WebGL cannot start', async ({ page }) => {
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
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await expect(page.locator('#fallback-note')).toBeVisible()
  expect(await page.evaluate(() => window.__GAME__?.scene)).toBeNull()

  await page.getByRole('button', { name: /Enter the boardroom/i }).click()
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
  await page.evaluate(() => {
    const store = window.__GAME__?.store
    if (!store) throw new Error('Game store missing')
    const dialoguePhases = new Set(['opening', 'advisors', 'feedback', 'boss'])
    for (let guard = 0; guard < 30; guard += 1) {
      const state = store.state
      if (!dialoguePhases.has(state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
    if (store.state.phase === 'briefing') store.dispatch({ type: 'BEGIN_CHAPTER' })
    for (let guard = 0; guard < 30; guard += 1) {
      const state = store.state
      if (!dialoguePhases.has(state.phase)) break
      store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    }
    store.dispatch({ type: 'SELECT_CHOICE', choice: 'A' })
    store.dispatch({ type: 'COMMIT_CHOICE' })
  })
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'factory')
  await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done', null, {
    timeout: 5000,
  })
  await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()
  await expect(page.getByRole('button', { name: /Face the board/i })).toBeVisible()
})
