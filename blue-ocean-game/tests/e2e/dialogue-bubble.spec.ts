import { expect, test, type Page } from '@playwright/test'
import type { GameState } from '../../src/core/types'

const SPEAKER_NAMES: Record<string, string> = {
  narrator: 'Boardroom',
  shell: 'Shelldon',
  mori: 'Hootley',
  pip: 'Slyvester',
  bolt: 'Damian',
  grumble: 'Pawson',
}

const TAG_FILLS: Record<string, string> = {
  narrator: '#6f7480',
  shell: '#9185b8',
  mori: '#6aa87b',
  pip: '#67aeca',
  bolt: '#c58b3f',
  grumble: '#d27ba6',
}

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
    timeout: 20_000,
  })
}

async function startGame(page: Page): Promise<void> {
  await openGame(page)
  await page.getByRole('button', { name: /^Start$/i }).click()
  await waitForPhase(page, 'opening')
  await page.waitForFunction(() => {
    const art = document.getElementById('dialogue-art') as HTMLImageElement | null
    return Boolean(art?.complete && art.naturalWidth > 0)
  })
}

async function advanceDialogue(page: Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.store.dispatch({ type: 'ADVANCE_DIALOGUE' }))
  await page.waitForTimeout(20)
}

async function drainDialogueWithKeyboard(page: Page): Promise<void> {
  const startPhase = (await getState(page)).phase
  if (!DIALOGUE_PHASES.has(startPhase)) return
  for (let guard = 0; guard < 40; guard += 1) {
    const state = await getState(page)
    if (state.phase !== startPhase) return
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await page.keyboard.press('Space')
    await page.waitForTimeout(175)
  }
  throw new Error('Dialogue did not terminate')
}

async function readBubble(page: Page) {
  return page.evaluate(() => {
    const panel = document.getElementById('dialogue-panel')
    const art = document.getElementById('dialogue-art') as HTMLImageElement | null
    const name = document.getElementById('speaker-name')
    const text = document.getElementById('dialogue-text')
    const copy = document.querySelector<HTMLElement>('.dialogue-copy')
    const button = document.getElementById('dialogue-continue')
    const rect = (element: Element | null) => {
      if (!element) return null
      const box = element.getBoundingClientRect()
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height }
    }
    const panelRect = rect(panel)
    const copyRect = rect(copy)
    const textRect = rect(text)
    return {
      phase: window.__GAME_STATE__?.phase,
      hidden: panel?.hidden ?? null,
      speaker: panel?.dataset.speaker ?? null,
      name: name?.textContent?.trim() ?? null,
      nameColor: name ? getComputedStyle(name).color : null,
      tagFill: panel ? getComputedStyle(panel).getPropertyValue('--name-tag-fill').trim().toLowerCase() : null,
      nameFontSize: name ? parseFloat(getComputedStyle(name).fontSize) : 0,
      fontSize: text ? parseFloat(getComputedStyle(text).fontSize) : 0,
      text: text?.textContent ?? '',
      panel: panelRect,
      copy: copyRect,
      textRect,
      bottomGap: panelRect ? window.innerHeight - panelRect.bottom : null,
      nameOverflow: name ? name.scrollWidth - name.clientWidth : null,
      textOverflow: text ? text.scrollWidth - text.clientWidth : null,
      textInsideCopy:
        textRect && copyRect
          ? textRect.top >= copyRect.top - 1 &&
            textRect.bottom <= copyRect.bottom + 1 &&
            textRect.left >= copyRect.left - 1 &&
            textRect.right <= copyRect.right + 1
          : null,
      art: art
        ? {
            width: art.naturalWidth,
            height: art.naturalHeight,
            ratio: art.getBoundingClientRect().width / art.getBoundingClientRect().height,
            src: art.currentSrc || art.src,
          }
        : null,
      duplicateArrow: document.querySelectorAll('.continue-marker').length,
      continueButton: button
        ? {
            tag: button.tagName,
            aria: button.getAttribute('aria-label'),
            box: rect(button),
          }
        : null,
      horizontalOverflow:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    }
  })
}

function expectApprovedBubble(
  bubble: Awaited<ReturnType<typeof readBubble>>,
  expectedSpeaker: string,
  minGap = 14,
  maxGap = 26,
) {
  expect(bubble.hidden).toBe(false)
  expect(bubble.speaker).toBe(expectedSpeaker)
  expect(bubble.name).toBe(SPEAKER_NAMES[expectedSpeaker])
  expect(bubble.nameColor).toBe('rgb(255, 255, 255)')
  expect(bubble.tagFill).toBe(TAG_FILLS[expectedSpeaker])
  expect(bubble.bottomGap).not.toBeNull()
  expect(bubble.bottomGap ?? 0).toBeGreaterThanOrEqual(minGap)
  expect(bubble.bottomGap ?? 0).toBeLessThanOrEqual(maxGap)
  expect(bubble.art?.width).toBe(3872)
  expect(bubble.art?.height).toBe(1552)
  expect(bubble.art?.ratio ?? 0).toBeCloseTo(3872 / 1552, 2)
  expect(bubble.art?.src ?? '').toMatch(/\/assets\/ui\/dialogue-bubble\.png$/)
  expect(bubble.duplicateArrow).toBe(0)
  expect(bubble.continueButton?.tag).toBe('BUTTON')
  expect(bubble.continueButton?.aria).toBe('Continue to the next line')
  expect(bubble.continueButton?.box?.width ?? 0).toBeGreaterThanOrEqual(44)
  expect(bubble.continueButton?.box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(bubble.nameOverflow ?? 0).toBeLessThanOrEqual(1)
  expect(bubble.textOverflow ?? 0).toBeLessThanOrEqual(1)
  expect(bubble.textInsideCopy).toBe(true)
  expect(bubble.horizontalOverflow).toBeLessThanOrEqual(1)
}

async function expectHiddenBubbleDoesNotIntercept(page: Page): Promise<void> {
  await expect(page.locator('#dialogue-panel')).toBeHidden()
  const blocked = await page.evaluate(() => {
    const points: Array<[number, number]> = [
      [window.innerWidth / 2, window.innerHeight - 30],
      [window.innerWidth / 2, window.innerHeight - 120],
    ]
    return points.some(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('#dialogue-panel')))
  })
  expect(blocked).toBe(false)
}

test.describe('approved dialogue bubble', () => {
  test('uses the approved art, white names and every cast cue in the shared component', async ({ page }) => {
    test.setTimeout(150_000)
    await startGame(page)

    const opening = await readBubble(page)
    expectApprovedBubble(opening, 'narrator')
    expect(opening.text.length).toBeGreaterThan(0)
    await expect(page.locator('.name-live')).toContainText('Boardroom')

    await advanceDialogue(page)
    expectApprovedBubble(await readBubble(page), 'shell')
    await advanceDialogue(page)
    expectApprovedBubble(await readBubble(page), 'mori')
    await advanceDialogue(page)
    expectApprovedBubble(await readBubble(page), 'pip')

    // The modal presenter drawer must paint above the bubble and close cleanly.
    await page.keyboard.press('p')
    await expect(page.locator('.presenter-drawer')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.presenter-drawer')).toBeHidden()
    expectApprovedBubble(await readBubble(page), 'pip')

    // Opening -> briefing. The same node must disappear cleanly.
    await page.evaluate(() => {
      const store = window.__GAME__?.store
      if (!store) throw new Error('store missing')
      while (store.state.phase === 'opening') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    })
    await waitForPhase(page, 'briefing')
    await expectHiddenBubbleDoesNotIntercept(page)

    // Chapter 1 advisors exercise every remaining cast tag.
    await page.getByRole('button', { name: /Convene the board/i }).click()
    await waitForPhase(page, 'advisors')
    expectApprovedBubble(await readBubble(page), 'mori')
    for (const speaker of ['pip', 'grumble', 'pip', 'grumble', 'bolt', 'mori']) {
      await advanceDialogue(page)
      expectApprovedBubble(await readBubble(page), speaker)
    }

    // End of advisors -> voting. Choice cards must receive clicks, not the bubble.
    await page.evaluate(() => {
      const store = window.__GAME__?.store
      if (!store) throw new Error('store missing')
      while (store.state.phase === 'advisors') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    })
    await waitForPhase(page, 'voting')
    await expectHiddenBubbleDoesNotIntercept(page)
    await expect(page.locator('.choice-card')).toHaveCount(3)

    // Mute, choose, skip the factory, then verify feedback/boss still use the same bubble.
    await page.keyboard.press('m')
    await expect(page.locator('#mute-button')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('m')
    await expect(page.locator('#mute-button')).toHaveAttribute('aria-pressed', 'false')
    await page.keyboard.press('2')
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    await page.keyboard.press('s')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done', null, {
      timeout: 20_000,
    })
    await page.locator('[data-action="leave-factory"]').click()
    await waitForPhase(page, 'feedback')
    const feedback = await readBubble(page)
    expectApprovedBubble(feedback, 'mori')
    await page.evaluate(() => {
      const store = window.__GAME__?.store
      if (!store) throw new Error('store missing')
      while (store.state.phase === 'feedback') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    })
    await waitForPhase(page, 'boss')
    expectApprovedBubble(await readBubble(page), 'shell')
    await page.evaluate(() => {
      const store = window.__GAME__?.store
      if (!store) throw new Error('store missing')
      while (store.state.phase === 'boss') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    })
    await waitForPhase(page, 'transition')
    await expectHiddenBubbleDoesNotIntercept(page)
  })

  test('runs all four votes through factory, feedback, boss, transitions and finale', async ({ page }) => {
    test.setTimeout(240_000)
    await startGame(page)

    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'briefing')

    // Chapter 1: 2005, one vote.
    await page.getByRole('button', { name: /Convene the board/i }).click()
    await waitForPhase(page, 'advisors')
    expectApprovedBubble(await readBubble(page), 'mori')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'voting')
    await page.locator('.choice-card').nth(1).click()
    await expect(page.locator('.choice-card').nth(1)).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    await page.keyboard.press('s')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
    await page.locator('[data-action="leave-factory"]').click()
    await waitForPhase(page, 'feedback')
    expectApprovedBubble(await readBubble(page), 'mori')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'boss')
    expectApprovedBubble(await readBubble(page), 'shell')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'transition')
    await expectHiddenBubbleDoesNotIntercept(page)
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await waitForPhase(page, 'briefing')

    // Chapter 2: 2011, one vote.
    await page.getByRole('button', { name: /Convene the board/i }).click()
    await waitForPhase(page, 'advisors')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'voting')
    await page.keyboard.press('2')
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    await page.keyboard.press('s')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
    await page.locator('[data-action="leave-factory"]').click()
    await waitForPhase(page, 'feedback')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'boss')
    expectApprovedBubble(await readBubble(page), 'shell')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'transition')
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await waitForPhase(page, 'briefing')

    // Chapter 3: 2016, two votes then exactly one factory reveal.
    await page.getByRole('button', { name: /Convene the board/i }).click()
    await waitForPhase(page, 'advisors')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'voting')
    await page.keyboard.press('3')
    await page.keyboard.press('v')
    await waitForPhase(page, 'voting')
    await expect(page.getByText(/VOTE 2 OF 2/)).toBeVisible()
    await page.keyboard.press('2')
    await page.keyboard.press('v')
    await waitForPhase(page, 'factory')
    await expect(page.locator('.factory-screen')).toHaveCount(1)
    await page.keyboard.press('s')
    await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done')
    await page.locator('[data-action="leave-factory"]').click()
    await waitForPhase(page, 'feedback')
    const feedback = await readBubble(page)
    expect(['mori', 'pip', 'grumble', 'bolt']).toContain(feedback.speaker)
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'boss')
    expectApprovedBubble(await readBubble(page), 'shell')
    await drainDialogueWithKeyboard(page)
    await waitForPhase(page, 'transition')
    await expectHiddenBubbleDoesNotIntercept(page)
    await page.getByRole('button', { name: /Open the sealed archive/i }).click()
    await waitForPhase(page, 'finale')
    await expectHiddenBubbleDoesNotIntercept(page)
    await page.locator('[data-action="open-archive"]').click()
    await expect(page.getByRole('heading', { name: 'The historical record' })).toBeVisible()
    await expectHiddenBubbleDoesNotIntercept(page)
    expect((await getState(page)).choices).toEqual({ d1: 'B', d2: 'B', d3: 'C', d4: 'B' })
  })

  test('reload keeps the same bubble and reset clears it', async ({ page }) => {
    test.setTimeout(120_000)
    await startGame(page)
    await advanceDialogue(page)
    await advanceDialogue(page)
    const beforeReload = await getState(page)
    expect(beforeReload.phase).toBe('opening')
    expect(beforeReload.dialogueIndex).toBe(2)

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)
    await waitForPhase(page, 'opening')
    const restored = await getState(page)
    expect(restored.dialogueIndex).toBe(2)
    expectApprovedBubble(await readBubble(page), 'mori')

    page.once('dialog', (dialog) => dialog.accept())
    await page.keyboard.press('Shift+R')
    await waitForPhase(page, 'title')
    await expectHiddenBubbleDoesNotIntercept(page)
    expect((await getState(page)).choices).toEqual({})
  })
})

for (const viewport of [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
] as const) {
  test.describe(`approved bubble at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('stays bottom-anchored and fits the longest name and line', async ({ page }) => {
      test.setTimeout(150_000)
      await startGame(page)
      await page.evaluate(() => {
        const store = window.__GAME__?.store
        if (!store) throw new Error('store missing')
        while (store.state.phase === 'opening') store.dispatch({ type: 'ADVANCE_DIALOGUE' })
        store.dispatch({ type: 'BEGIN_CHAPTER' })
        store.dispatch({ type: 'ADVANCE_DIALOGUE' })
      })
      await waitForPhase(page, 'advisors')
      const bubble = await readBubble(page)
      expectApprovedBubble(bubble, 'pip')
      expect(bubble.text.length).toBe(154)
      expect(bubble.fontSize).toBeGreaterThanOrEqual(24)
      expect(bubble.nameFontSize).toBeGreaterThanOrEqual(24)
      expect(bubble.textInsideCopy).toBe(true)
      expect(bubble.panel?.left ?? -1).toBeGreaterThanOrEqual(-1)
      expect(bubble.panel?.right ?? Infinity).toBeLessThanOrEqual(viewport.width + 1)
      expect(bubble.panel?.top ?? -1).toBeGreaterThanOrEqual(0)
      expect(bubble.panel?.bottom ?? Infinity).toBeLessThanOrEqual(viewport.height + 1)
      expect(bubble.bottomGap ?? 0).toBeGreaterThanOrEqual(14)
      expect(bubble.bottomGap ?? 0).toBeLessThanOrEqual(26)
    })
  })
}
