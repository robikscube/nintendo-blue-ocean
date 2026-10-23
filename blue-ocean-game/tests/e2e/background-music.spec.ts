import { expect, test, type Page } from '@playwright/test'

test.use({ reducedMotion: 'no-preference' })

async function musicDebug(page: Page) {
  return page.evaluate(() => window.__GAME__?.audio.getMusicDebug() ?? null)
}

test('office music streams, loops, ducks under speech, and is credited', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  expect(await musicDebug(page)).toBeNull()
  // The title screen names only the artist; the tracks are credited in the
  // presenter drawer and in the finale archive.
  await expect(page.locator('.title-credit')).toContainText('Towball')
  await expect(page.locator('.title-credit')).toContainText('CC BY 4.0')
  await expect(page.locator('.title-credit')).not.toContainText('1am')
  await expect(page.locator('.title-credit')).not.toContainText('7am')
  await expect(page.locator('.title-credit')).not.toContainText('6pm')
  await expect(page.locator('.title-credit')).not.toContainText('10pm')
  await expect(page.locator('.title-credit')).not.toContainText('Goodbye')

  // The title cue starts on the first gesture without leaving the title.
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.title).toBe('1am')
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)
  expect(await page.evaluate(() => window.__GAME_STATE__?.phase)).toBe('title')

  await page.getByRole('button', { name: /^Start$/i }).click()
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')

  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)
  // The music fades in over about a second, so let the bus ramp open.
  await expect.poll(async () => (await musicDebug(page))?.gain ?? 0).toBeGreaterThan(0)
  const info = await musicDebug(page)
  expect(info?.mode).toBe('office')
  expect(info?.title).toBe('7am')
  expect(info?.src).toContain('towball-7am.mp3')
  expect(info?.contextState).toBe('running')
  expect(info?.gain ?? 0).toBeGreaterThan(0)
  expect(info?.ducked).toBe(false)

  const startedAt = info?.currentTime ?? 0
  await expect.poll(async () => (await musicDebug(page))?.currentTime ?? 0).toBeGreaterThan(startedAt + 0.2)

  const loop = await page.evaluate(() => {
    const element = document.querySelector<HTMLAudioElement>('audio[data-music-track]')
    return element ? { loop: element.loop, preload: element.preload } : null
  })
  expect(loop).toEqual({ loop: true, preload: 'auto' })

  // Advance from the silent narrator line into Shelldon's spoken line.
  const ducked = await page.evaluate(async () => {
    window.__GAME__?.store.dispatch({ type: 'ADVANCE_DIALOGUE' })
    const deadline = performance.now() + 2500
    let latest = window.__GAME__?.audio.getMusicDebug() ?? null
    while (performance.now() < deadline) {
      latest = window.__GAME__?.audio.getMusicDebug() ?? null
      if (latest?.ducked) break
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
    }
    return latest
  })
  expect(ducked?.ducked).toBe(true)
  // Complete the line rather than waiting out its natural several seconds.
  await page.evaluate(() => document.getElementById('dialogue-panel')?.click())
  await expect.poll(async () => (await musicDebug(page))?.ducked).toBe(false)

  await page.keyboard.press('p')
  await expect(page.locator('.presenter-drawer')).toContainText('1am')
  await expect(page.locator('.presenter-drawer')).toContainText('7am')
  await expect(page.locator('.presenter-drawer')).toContainText('6pm')
  await expect(page.locator('.presenter-drawer')).toContainText('10pm')
  await expect(page.locator('.presenter-drawer')).toContainText('5am - Goodbye')
  await expect(page.locator('.presenter-drawer')).toContainText('CC BY 4.0')

  const before = (await musicDebug(page))?.gain ?? 0
  await page.locator('#music-volume').evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = '30'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect.poll(async () => (await musicDebug(page))?.volume).toBeCloseTo(0.3, 5)
  await expect.poll(async () => (await musicDebug(page))?.gain ?? 0).toBeLessThan(before)

  // Leaving the boardroom fades the track out and pauses the element; coming
  // back resumes it. This also covers the scene-change cleanup path.
  await page.evaluate(() => window.__GAME__?.audio.setMusicMode('silent'))
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(false)
  await page.evaluate(() => window.__GAME__?.audio.setMusicMode('office'))
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)

  // Briefing and voting use the calmer context cue on the same bus.
  await page.evaluate(() => window.__GAME__?.audio.setMusicMode('context'))
  await expect.poll(async () => (await musicDebug(page))?.title).toBe('6pm')
  await expect.poll(async () => (await musicDebug(page))?.src ?? '').toContain('towball-6pm.mp3')
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)

  // The factory cue swaps to its own track on the same bus.
  await page.evaluate(() => window.__GAME__?.audio.setMusicMode('factory'))
  await expect.poll(async () => (await musicDebug(page))?.title).toBe('10pm')
  await expect.poll(async () => (await musicDebug(page))?.src ?? '').toContain('towball-10pm.mp3')
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)
  await page.evaluate(() => window.__GAME__?.audio.setMusicMode('office'))
  await expect.poll(async () => (await musicDebug(page))?.title).toBe('7am')
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)

  // Real phase transitions select the finale and title cues.
  await page.evaluate(() => window.__GAME__?.store.dispatch({ type: 'SHOW_FINALE' }))
  await expect.poll(async () => page.evaluate(() => window.__GAME_STATE__?.phase)).toBe('finale')
  await expect.poll(async () => (await musicDebug(page))?.title).toBe('5am - Goodbye')
  await expect.poll(async () => (await musicDebug(page))?.src ?? '').toContain('towball-5am-goodbye.mp3')
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)

  await page.evaluate(() => window.__GAME__?.store.reset())
  await expect.poll(async () => page.evaluate(() => window.__GAME_STATE__?.phase)).toBe('title')
  await expect.poll(async () => (await musicDebug(page))?.title).toBe('1am')
  await expect.poll(async () => (await musicDebug(page))?.src ?? '').toContain('towball-1am.mp3')
  await expect.poll(async () => (await musicDebug(page))?.playing).toBe(true)

  await page.keyboard.press('Escape')
  await page.keyboard.press('m')
  expect(await page.evaluate(() => window.__GAME_STATE__?.muted)).toBe(true)
  expect(pageErrors).toEqual([])
})
