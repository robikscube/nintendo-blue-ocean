import { expect, test, type Page } from '@playwright/test'
import { OPENING_LINES } from '../../src/core/story'
const firstTypedIndex = OPENING_LINES.findIndex(line => line.speaker !== 'narrator')

test.use({ reducedMotion: 'no-preference' })

async function speechDebug(page: Page) {
  return page.evaluate(() => window.__GAME__?.audio.getSpeechDebug() ?? null)
}

test('procedural speech follows the speaker, unlocks on gesture, and stops cleanly', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  expect(await speechDebug(page)).toBeNull()

  await page.getByRole('button', { name: /^Start$/i }).click()
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')

  // The first opening line is narrator-only. Move to Shelldon's typed line.
  // The wait, state read, and click all happen in one browser task. That keeps
  // the short 600 ms line from finishing between Playwright round-trips.
  const skipped = await page.evaluate(async (firstTypedIndex) => {
    for (let i=0;i<firstTypedIndex;i++) window.__GAME__?.store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    const panel = document.getElementById('dialogue-panel')
    if (!panel) throw new Error('Dialogue panel missing')
    const deadline = performance.now() + 2000
    while (!panel.classList.contains('is-typing') && performance.now() < deadline) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    const before = window.__GAME__?.audio.getSpeechDebug() ?? null
    const typing = panel.classList.contains('is-typing')
    panel.click()
    const after = window.__GAME__?.audio.getSpeechDebug() ?? null
    return { before, after, typing }
  }, firstTypedIndex)

  expect(skipped.typing).toBe(true)
  expect(skipped.before?.contextState).toBe('running')
  expect(skipped.before?.profileId).toBe('shell')
  expect(skipped.before?.running).toBe(true)
  expect(skipped.after?.running).toBe(false)
  await expect(page.locator('#dialogue-panel')).toHaveClass(/is-complete/)
  await expect.poll(async () => (await speechDebug(page))?.activeSources).toBe(0)

  // A new speaker starts a fresh profile and a fresh utterance bus. Observe
  // the short window from inside the page so polling latency cannot miss it.
  const moriDebug = await page.evaluate(async () => {
    window.__GAME__?.store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    const deadline = performance.now() + 2000
    let latest = window.__GAME__?.audio.getSpeechDebug() ?? null
    // Notes live for only 60-90 ms. Sampling on animation frames can miss a
    // whole short line on slow headless GPUs, so use a fast timer instead.
    while (performance.now() < deadline) {
      latest = window.__GAME__?.audio.getSpeechDebug() ?? null
      if (latest?.profileId === 'mori' && latest.activeSources > 0) break
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
    }
    return latest
  })
  expect(moriDebug?.profileId).toBe('mori')
  expect(moriDebug?.activeSources ?? 0).toBeGreaterThan(0)

  // Mute is immediate and stops synthesized nodes without disturbing the text.
  await page.keyboard.press('m')
  await expect.poll(async () => (await speechDebug(page))?.muted).toBe(true)
  await expect.poll(async () => (await speechDebug(page))?.activeSources).toBe(0)
  expect(await page.evaluate(() => window.__GAME_STATE__?.phase)).toBe('opening')
  expect(pageErrors).toEqual([])
})
