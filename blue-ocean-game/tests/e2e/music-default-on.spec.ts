import { expect, test, type Page } from '@playwright/test'

/**
 * Regression guard for the corrected music-default request (2026-10-22):
 * - first visit / clean storage starts with music enabled at 70%;
 * - audio still waits for a real gesture (browser autoplay policy);
 * - the existing HUD speaker icon is untouched;
 * - saved master-mute and music-volume preferences are honoured;
 * - the master mute and speech behaviour are independent of the music slider.
 *
 * Run against an isolated server (playwright.music.config.ts, port 5199) so it
 * cannot collide with the UI lead's or QA's Playwright runs.
 */

const MUSIC_VOLUME_KEY = 'nintendo-next-blue-ocean:music-volume'
const MUTED_KEY = 'nintendo-next-blue-ocean:muted'
const SPEAKER_PATH = 'M4 9h3.5L13 5v14l-5.5-4H4z'
const WAVE_PATH = 'M16.5 8.2c1.6 1.7 1.6 5.9 0 7.6M19.2 5.8c2.8 2.9 2.8 9.5 0 12.4'
const SLASH_PATH = 'M16.5 9l5 6M21.5 9l-5 6'

test.use({ reducedMotion: 'no-preference' })

async function musicDebug(page: Page) {
  return page.evaluate(() => window.__GAME__?.audio.getMusicDebug() ?? null)
}

async function readMusicState(page: Page) {
  return page.evaluate(() => {
    const audio = window.__GAME__?.audio
    const button = document.getElementById('mute-button')
    const wave = button?.querySelector<SVGPathElement>('.sound-wave')
    const slash = button?.querySelector<SVGPathElement>('.sound-slash')
    return {
      muted: window.__GAME_STATE__?.muted ?? null,
      musicVolume: audio?.getMusicVolume() ?? null,
      masterVolume: audio?.getVolume() ?? null,
      speechMuted: audio?.getSpeechDebug()?.muted ?? null,
      buttonClass: button?.className ?? null,
      ariaLabel: button?.getAttribute('aria-label') ?? null,
      ariaPressed: button?.getAttribute('aria-pressed') ?? null,
      buttonColor: button ? getComputedStyle(button).color : null,
      waveDisplay: wave ? getComputedStyle(wave).display : null,
      slashDisplay: slash ? getComputedStyle(slash).display : null,
      pathCount: button?.querySelectorAll('svg path').length ?? 0,
      paths: Array.from(button?.querySelectorAll('svg path') ?? []).map((path) => path.getAttribute('d')),
      svgMarkup: button?.querySelector('svg')?.outerHTML ?? null,
      storage: { ...localStorage },
    }
  })
}

async function openTitle(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  // Clean every storage channel so each assertion describes a first visit.
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

test('clean storage: music is enabled by default but waits for the first gesture', async ({ page }) => {
  await openTitle(page)
  const before = await readMusicState(page)

  expect(before.muted).toBe(false)
  expect(before.musicVolume).toBe(0.7)
  // No AudioContext exists yet, so there is no speech engine to report from.
  expect(before.speechMuted).toBeNull()
  expect(before.buttonClass).toBe('hud-button icon-button')
  expect(before.ariaLabel).toBe('Mute sound')
  expect(before.ariaPressed).toBe('false')
  expect(before.waveDisplay).not.toBe('none')
  expect(before.slashDisplay).toBe('none')
  expect(before.storage[MUSIC_VOLUME_KEY]).toBeUndefined()
  expect(before.storage[MUTED_KEY]).toBeUndefined()

  // Autoplay policy: no AudioContext or music element before a gesture.
  expect(await musicDebug(page)).toBeNull()
  expect(await page.locator('audio[data-music-track]').count()).toBe(0)

  // The existing HUD speaker icon: same three paths, no replacement art.
  expect(before.pathCount).toBe(3)
  expect(before.paths).toEqual([SPEAKER_PATH, WAVE_PATH, SLASH_PATH])
  expect(before.svgMarkup).toContain('stroke="currentColor"')

  // First gesture unlocks audio without leaving the title.
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.title, { timeout: 20_000 }).toBe('1am')
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)
  await expect.poll(async () => (await musicDebug(page))?.gain ?? 0, { timeout: 20_000 }).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.__GAME_STATE__?.phase)).toBe('title')

  const after = await readMusicState(page)
  // The gesture starts playback; it must not flip the visual mute toggle.
  expect(after.muted).toBe(false)
  expect(after.speechMuted).toBe(false)
  expect(after.buttonClass).toBe('hud-button icon-button')
  expect(after.ariaLabel).toBe('Mute sound')
  expect(after.ariaPressed).toBe('false')
  expect(after.svgMarkup).toBe(before.svgMarkup)
  expect(after.buttonColor).toBe(before.buttonColor)
  expect(after.storage[MUSIC_VOLUME_KEY]).toBeUndefined()
  expect(after.storage[MUTED_KEY]).toBeUndefined()
})

test('master mute keeps its existing icon and leaves the music volume preference alone', async ({ page }) => {
  await openTitle(page)
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)

  const unmuted = await readMusicState(page)

  // Keyboard shortcut M: master mute, not a music-only toggle.
  await page.keyboard.press('m')
  await expect.poll(async () => (await readMusicState(page)).muted).toBe(true)
  const muted = await readMusicState(page)
  expect(muted.buttonClass).toContain('is-muted')
  expect(muted.ariaLabel).toBe('Unmute sound')
  expect(muted.ariaPressed).toBe('true')
  expect(muted.waveDisplay).toBe('none')
  expect(muted.slashDisplay).not.toBe('none')
  // Same icon markup and colour: the slash is shown by the existing CSS state.
  expect(muted.svgMarkup).toBe(unmuted.svgMarkup)
  expect(muted.buttonColor).toBe(unmuted.buttonColor)
  expect(muted.pathCount).toBe(3)
  expect(muted.paths).toEqual([SPEAKER_PATH, WAVE_PATH, SLASH_PATH])
  expect(muted.speechMuted).toBe(true)
  expect(muted.musicVolume).toBe(0.7)
  expect(muted.masterVolume).toBe(unmuted.masterVolume)
  expect(muted.storage[MUTED_KEY]).toBe('true')
  expect(muted.storage[MUSIC_VOLUME_KEY]).toBeUndefined()
  await expect(page.locator('#toast')).toHaveText('Sound muted.')

  // The music element keeps running under the muted master bus, so unmuting is
  // immediate. More importantly, M must not write a music-volume preference.
  expect((await musicDebug(page))?.playing).toBe(true)

  await page.keyboard.press('m')
  await expect.poll(async () => (await readMusicState(page)).muted).toBe(false)
  const back = await readMusicState(page)
  expect(back.buttonClass).toBe('hud-button icon-button')
  expect(back.ariaLabel).toBe('Mute sound')
  expect(back.ariaPressed).toBe('false')
  expect(back.svgMarkup).toBe(unmuted.svgMarkup)
  expect(back.musicVolume).toBe(0.7)
  expect(back.speechMuted).toBe(false)
  expect(back.storage[MUTED_KEY]).toBe('false')
  expect(back.storage[MUSIC_VOLUME_KEY]).toBeUndefined()
})

test('an explicit saved music-off preference survives reload', async ({ page }) => {
  await openTitle(page)
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)

  // Presenter drawer → Music slider → 0%. This is the only music-specific
  // preference that exists today.
  await page.keyboard.press('p')
  await expect(page.locator('.presenter-drawer')).toBeVisible()
  await page.locator('#music-volume').evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = '0'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect.poll(async () => (await readMusicState(page)).musicVolume).toBe(0)
  const zeroed = await readMusicState(page)
  expect(zeroed.muted).toBe(false)
  expect(zeroed.speechMuted).toBe(false)
  expect(zeroed.masterVolume).toBe(0.62)
  expect(zeroed.storage[MUSIC_VOLUME_KEY]).toBe('0')
  // The slider ramps over 120 ms; poll rather than sampling mid-ramp.
  await expect.poll(async () => Math.abs((await musicDebug(page))?.gain ?? -1)).toBeLessThan(1e-6)
  await page.keyboard.press('Escape')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  const restored = await readMusicState(page)
  expect(restored.musicVolume).toBe(0)
  expect(restored.muted).toBe(false)
  // Reload has not unlocked audio yet, so the speech engine is absent.
  expect(restored.speechMuted).toBeNull()
  expect(restored.storage[MUSIC_VOLUME_KEY]).toBe('0')
  expect(await musicDebug(page)).toBeNull()

  // The gesture still unlocks audio, but the saved 0% keeps the music silent.
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)
  await expect.poll(async () => (await musicDebug(page))?.gain ?? -1).toBe(0)
  expect((await readMusicState(page)).muted).toBe(false)
})

test('an explicit saved master-mute preference survives reload and unmutes normally', async ({ page }) => {
  await openTitle(page)
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)

  await page.keyboard.press('m')
  await expect.poll(async () => (await readMusicState(page)).muted).toBe(true)
  expect((await readMusicState(page)).storage[MUTED_KEY]).toBe('true')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  const restored = await readMusicState(page)
  expect(restored.muted).toBe(true)
  expect(restored.buttonClass).toContain('is-muted')
  expect(restored.ariaLabel).toBe('Unmute sound')
  expect(restored.musicVolume).toBe(0.7)
  expect(restored.storage[MUTED_KEY]).toBe('true')
  expect(await musicDebug(page)).toBeNull()

  await page.keyboard.press('m')
  await expect.poll(async () => (await readMusicState(page)).muted).toBe(false)
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.title, { timeout: 20_000 }).toBe('1am')
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)
  expect((await readMusicState(page)).storage[MUTED_KEY]).toBe('false')
})

test('music follows scene transitions while remaining enabled by default', async ({ page }) => {
  await openTitle(page)
  await page.locator('.title-screen').click()
  await expect.poll(async () => (await musicDebug(page))?.title, { timeout: 20_000 }).toBe('1am')

  await page.getByRole('button', { name: /^Start$/i }).click()
  await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'opening')
  await expect.poll(async () => (await musicDebug(page))?.title, { timeout: 20_000 }).toBe('7am')
  await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)
  const state = await readMusicState(page)
  expect(state.muted).toBe(false)
  expect(state.musicVolume).toBe(0.7)
  expect(state.svgMarkup).toContain(WAVE_PATH)
})

test('a fresh mobile-touch first tap starts the title cue', async ({ browser }) => {
  // Fresh context = fresh storage, matching a first-time phone visitor. This is
  // Chromium touch emulation, not iOS Safari (see the report caveat).
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__GAME_READY__ === true)

    const before = await readMusicState(page)
    expect(before.muted).toBe(false)
    expect(before.musicVolume).toBe(0.7)
    expect(before.storage[MUSIC_VOLUME_KEY]).toBeUndefined()
    expect(before.storage[MUTED_KEY]).toBeUndefined()
    expect(await musicDebug(page)).toBeNull()

    await page.locator('.title-screen').tap()
    await expect.poll(async () => (await musicDebug(page))?.title, { timeout: 20_000 }).toBe('1am')
    await expect.poll(async () => (await musicDebug(page))?.playing, { timeout: 20_000 }).toBe(true)
    await expect.poll(async () => (await musicDebug(page))?.gain ?? 0, { timeout: 20_000 }).toBeGreaterThan(0)

    const after = await readMusicState(page)
    expect(after.muted).toBe(false)
    expect(after.buttonClass).toBe('hud-button icon-button')
    expect(after.svgMarkup).toBe(before.svgMarkup)
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
