import { expect, test, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CHAPTERS } from '../../src/core/story'

const LABELS = [
  ['Hardware benchmark', 'Families and non-players', 'Spending race'],
  ['Sharper graphics', 'Screen controller', 'Standalone handheld'],
  ['Better graphics', 'Shared play', 'Motion controls'],
] as const
const ART_FILES = ['woodland-briefing-panel.png', 'woodland-briefing-2011.png', 'woodland-briefing-2016.png'] as const
const VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920x1080' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1024, height: 768, label: '1024x768' },
] as const
const SHOT_DIR = path.resolve('agent-reports/woodland-briefing')

interface Box {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

interface Geometry {
  viewport: { width: number; height: number }
  documentScrollWidth: number
  bodyScrollWidth: number
  art: string
  imageCount: number
  artNaturalWidth: number
  artNaturalHeight: number
  artSource: string
  panel: Box
  heading: Box
  copy: Box
  watch: Box
  labelFont: number
  labels: Box[]
  iconLayer: Box | null
  icons: Box[]
  button: Box
}

async function openBriefing(page: Page, chapterIndex: number): Promise<void> {
  await page.waitForFunction(() => window.__GAME_READY__ === true)
  await page.evaluate((index) => {
    const game = window.__GAME__
    if (!game) throw new Error('Game harness unavailable')
    game.store.dispatch({ type: 'JUMP_CHAPTER', chapterIndex: index })
  }, chapterIndex)
  const chapter = CHAPTERS[chapterIndex]
  if (!chapter) throw new Error(`No chapter ${chapterIndex}`)
  await expect(page.getByRole('heading', { name: chapter.title, level: 2 })).toBeVisible()
  await expect(page.locator('.woodland-panel')).toBeVisible()
  // Native dimensions can be available before an async PNG is painted.
  // Await decoding so screenshots verify the artwork as well as its overlays.
  await page.locator('.woodland-art').evaluate((image) => (image as HTMLImageElement).decode().catch(() => {}))
}

async function readGeometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const box = (element: Element | null): Box | null => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      }
    }
    const required = (selector: string): Box => {
      const value = box(document.querySelector(selector))
      if (!value) throw new Error(`Missing ${selector}`)
      return value
    }
    const panelElement = document.querySelector('.woodland-panel')
    if (!(panelElement instanceof HTMLElement)) throw new Error('Missing woodland panel')
    const labelElements = Array.from(document.querySelectorAll('.woodland-label'))
    const iconElements = Array.from(document.querySelectorAll('.woodland-icon'))
    const labelFont = labelElements[0]
      ? Number.parseFloat(getComputedStyle(labelElements[0]).fontSize)
      : 0
    const artImage = document.querySelector<HTMLImageElement>('img.woodland-art')

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      art: panelElement.dataset.art ?? '',
      imageCount: document.querySelectorAll('img.woodland-art').length,
      artNaturalWidth: artImage?.naturalWidth ?? 0,
      artNaturalHeight: artImage?.naturalHeight ?? 0,
      artSource: artImage?.getAttribute('src') ?? '',
      panel: required('.woodland-panel'),
      heading: required('.woodland-heading-zone h2'),
      copy: required('.woodland-copy'),
      watch: required('.woodland-watch'),
      labelFont,
      labels: labelElements.map((element) => box(element)).filter((value): value is Box => Boolean(value)),
      iconLayer: box(document.querySelector('.woodland-icon-layer')),
      icons: iconElements.map((element) => box(element)).filter((value): value is Box => Boolean(value)),
      button: required('[data-action="begin-chapter"]'),
    }
  })
}

function assertGeometry(geometry: Geometry, viewportLabel: string, chapterIndex: number): void {
  const { panel, heading, copy, watch, button, viewport } = geometry
  const top = panel.top
  const height = panel.height
  const width = panel.width

  expect(geometry.documentScrollWidth, `${viewportLabel}: no horizontal page scroll`)
    .toBeLessThanOrEqual(viewport.width + 1)
  expect(geometry.bodyScrollWidth, `${viewportLabel}: no horizontal body scroll`)
    .toBeLessThanOrEqual(viewport.width + 1)

  expect(panel.left, `${viewportLabel}: panel left inset`).toBeGreaterThanOrEqual(0)
  expect(panel.right, `${viewportLabel}: panel right inset`).toBeLessThanOrEqual(viewport.width + 1)
  expect(panel.top, `${viewportLabel}: panel below HUD`).toBeGreaterThanOrEqual(70)

  // Approved composition zones: title 12–22%, body 29–55%, watch 59–65%.
  expect(heading.centerY, `${viewportLabel}: title in header strip`)
    .toBeGreaterThanOrEqual(top + height * 0.115)
  expect(heading.centerY, `${viewportLabel}: title in header strip`)
    .toBeLessThanOrEqual(top + height * 0.225)
  expect(heading.left, `${viewportLabel}: title not clipped left`).toBeGreaterThan(panel.left)
  expect(heading.right, `${viewportLabel}: title not clipped right`).toBeLessThan(panel.right)

  expect(copy.centerY, `${viewportLabel}: body in central blank`)
    .toBeGreaterThanOrEqual(top + height * 0.29)
  expect(copy.centerY, `${viewportLabel}: body in central blank`)
    .toBeLessThanOrEqual(top + height * 0.55)
  expect(copy.bottom, `${viewportLabel}: body clears Watch for`).toBeLessThan(watch.top)

  expect(watch.top, `${viewportLabel}: Watch for in lower band`)
    .toBeGreaterThanOrEqual(top + height * 0.57)
  expect(watch.bottom, `${viewportLabel}: Watch for in lower band`)
    .toBeLessThanOrEqual(top + height * 0.68)
  expect(watch.left, `${viewportLabel}: Watch for inset left`).toBeGreaterThan(panel.left)
  expect(watch.right, `${viewportLabel}: Watch for inset right`).toBeLessThan(panel.right)

  expect(geometry.labels, `${viewportLabel}: three labels`).toHaveLength(3)
  expect(geometry.labelFont, `${viewportLabel}: label text at least 13px`).toBeGreaterThanOrEqual(13)
  const labelTop = Math.min(...geometry.labels.map((label) => label.top))
  const labelBottom = Math.max(...geometry.labels.map((label) => label.bottom))
  // The approved icon medallions end around 86.6% of the panel height.
  expect(labelTop, `${viewportLabel}: labels below the artwork icons`).toBeGreaterThanOrEqual(top + height * 0.865)
  expect(labelBottom, `${viewportLabel}: labels stay inside panel`).toBeLessThanOrEqual(panel.bottom)
  expect(labelBottom, `${viewportLabel}: labels clear the wooden lower frame`).toBeLessThanOrEqual(top + height * 0.925)
  expect(Math.max(...geometry.labels.map((label) => label.right)), `${viewportLabel}: labels stay inside panel`)
    .toBeLessThanOrEqual(panel.right)

  const positions = [0.28, 0.5, 0.72]
  geometry.labels.forEach((label, index) => {
    expect(
      Math.abs(label.centerX - (panel.left + width * (positions[index] ?? 0.5))),
      `${viewportLabel}: label ${index + 1} maps to its icon column`,
    ).toBeLessThanOrEqual(width * 0.035)
  })

  if (geometry.art === 'pending') {
    expect(geometry.icons, `${viewportLabel}: fallback icons present`).toHaveLength(3)
    const iconBottom = Math.max(...geometry.icons.map((icon) => icon.bottom))
    expect(labelTop, `${viewportLabel}: labels are below the fallback icons`).toBeGreaterThanOrEqual(iconBottom - 1)
    expect(geometry.imageCount, `${viewportLabel}: no missing art request`).toBe(0)
  } else {
    expect(geometry.imageCount, `${viewportLabel}: integrated approved art`).toBe(1)
    expect(geometry.artSource, `${viewportLabel}: contracted art path`)
      .toBe(`/assets/ui/${ART_FILES[chapterIndex]}`)
    expect(geometry.artNaturalWidth, `${viewportLabel}: approved image width`).toBe(1672)
    expect(geometry.artNaturalHeight, `${viewportLabel}: approved image height`).toBe(941)
  }

  expect(button.top, `${viewportLabel}: action below the panel`).toBeGreaterThanOrEqual(panel.bottom - 1)
  expect(button.bottom, `${viewportLabel}: action inside viewport`).toBeLessThanOrEqual(viewport.height)
  expect(button.left, `${viewportLabel}: action inside viewport left`).toBeGreaterThanOrEqual(0)
  expect(button.right, `${viewportLabel}: action inside viewport right`).toBeLessThanOrEqual(viewport.width)
}

test.describe('woodland briefing panel', () => {
  test.beforeAll(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test('keeps chapter-specific icons and HTML labels when a generated image fails', async ({ page }) => {
    await page.route('**/woodland-briefing-2011.png', route => route.abort())
    await page.goto('/', { waitUntil: 'networkidle' })
    await openBriefing(page, 1)
    await expect(page.locator('.woodland-panel')).toHaveAttribute('data-art', 'pending')
    await expect(page.locator('.woodland-art')).toBeHidden()
    await expect(page.locator('.woodland-label')).toHaveText([...LABELS[1]])
    for (const icon of ['graphics', 'tablet', 'handheld']) {
      await expect(page.locator(`[data-icon="${icon}"] svg`)).toBeVisible()
    }
    await page.getByRole('button', { name: 'Convene the board' }).click()
    await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors')
  })

  for (const viewport of VIEWPORTS) {
    test.describe(viewport.label, () => {
      test.use({ viewport })

      test('keeps the warm panel, exact labels, and readable composition', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' })
        await page.waitForFunction(() => window.__GAME_READY__ === true)
        const evidence: Array<{ chapter: number; title: string; geometry: Geometry }> = []

        for (let index = 0; index < CHAPTERS.length; index += 1) {
          await openBriefing(page, index)
          const chapter = CHAPTERS[index]
          if (!chapter) continue

          // Removed clutter must not be reintroduced.
          for (const selector of [
            '.screen-header',
            '.chapter-counter',
            '.vote-promise',
            '.watch-card',
            '.sealed-small',
            '.footer-note',
            '.briefing-grid',
          ]) {
            await expect(page.locator(selector), `${viewport.label}: ${selector} removed`).toHaveCount(0)
          }

          await expect(page.locator('.woodland-label')).toHaveText([...LABELS[index]!])
          await expect(page.getByRole('button', { name: 'Convene the board' })).toBeVisible()
          const bodyText = (await page.locator('.woodland-copy').innerText()).replace(/\s+/g, ' ')
          expect(bodyText, `${viewport.label}: no pre-archive product leak`)
            .not.toMatch(/\bWii\b|Wii U|Nintendo Switch|Joy-Con|GamePad|101\.63|13\.56|156\.59/)

          const geometry = await readGeometry(page)
          assertGeometry(geometry, `${viewport.label} chapter ${index + 1}`, index)
          evidence.push({ chapter: index + 1, title: chapter.title, geometry })

          await page.screenshot({
            path: path.join(SHOT_DIR, `briefing-c${index + 1}-${viewport.label}.png`),
            fullPage: false,
          })
        }

        // The one native action must still enter the existing advisor beat.
        await page.getByRole('button', { name: 'Convene the board' }).click()
        await page.waitForFunction(() => window.__GAME_STATE__?.phase === 'advisors')

        await writeFile(
          path.join(SHOT_DIR, `geometry-${viewport.label}.json`),
          `${JSON.stringify({ viewport, evidence }, null, 2)}\n`,
          'utf8',
        )
      })
    })
  }
})
