import { expect, test, type Page } from '@playwright/test'

interface Box {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

async function openGame(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__GAME_READY__ === true)
}

async function waitForPhase(page: Page, phase: string): Promise<void> {
  await page.waitForFunction((expected) => window.__GAME_STATE__?.phase === expected, phase, {
    timeout: 15_000,
  })
}

async function driveToChapterOneVoting(page: Page): Promise<void> {
  await page.evaluate(() => {
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
  })
  await waitForPhase(page, 'voting')
}

async function layoutSnapshot(page: Page) {
  return page.evaluate(() => {
    const boxOf = (selector: string): Box | null => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }
    }
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      cards: Array.from(document.querySelectorAll<HTMLElement>('.choice-card')).map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        }
      }),
      commit: boxOf('[data-action="commit-choice"]'),
      factoryCard: boxOf('.factory-card'),
      view: boxOf('#view'),
      archive: boxOf('.archive-screen'),
      archiveOverflowY: (() => {
        const element = document.querySelector<HTMLElement>('.archive-screen')
        return element ? getComputedStyle(element).overflowY : null
      })(),
      archiveScrollHeight: document.querySelector<HTMLElement>('.archive-screen')?.scrollHeight ?? 0,
      archiveClientHeight: document.querySelector<HTMLElement>('.archive-screen')?.clientHeight ?? 0,
    }
  })
}

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768-4x3', width: 1024, height: 768 },
] as const

for (const viewport of VIEWPORTS) {
  test.describe(`classroom layout at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('voting, factory reveal, and archive stay within the screen width', async ({ page }) => {
      test.setTimeout(150_000)
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))

      await openGame(page)
      await driveToChapterOneVoting(page)
      await expect(page.locator('.choice-card')).toHaveCount(3)

      const voting = await layoutSnapshot(page)
      expect(voting.innerWidth).toBe(viewport.width)
      expect(voting.documentScrollWidth).toBeLessThanOrEqual(voting.innerWidth + 1)
      expect(voting.bodyScrollWidth).toBeLessThanOrEqual(voting.innerWidth + 1)
      expect(voting.cards).toHaveLength(3)
      for (const card of voting.cards) {
        expect(card.width).toBeGreaterThan(180)
        expect(card.left).toBeGreaterThanOrEqual(-1)
        expect(card.right).toBeLessThanOrEqual(voting.innerWidth + 1)
      }
      expect(voting.commit).not.toBeNull()
      expect(voting.commit?.right ?? 0).toBeLessThanOrEqual(voting.innerWidth + 1)
      expect(voting.commit?.left ?? 0).toBeGreaterThanOrEqual(-1)

      // Commit through the keyboard so vertical scrolling cannot mask a layout issue.
      await page.keyboard.press('2')
      await page.keyboard.press('v')
      await waitForPhase(page, 'factory')
      await page.waitForFunction(() => window.__GAME_STATE__?.factoryProgress === 'done', null, {
        timeout: 20_000,
      })
      await expect(page.getByRole('heading', { name: 'The Hearth Box' })).toBeVisible()
      await expect(page.getByText('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')).toBeVisible()

      const factory = await layoutSnapshot(page)
      expect(factory.documentScrollWidth).toBeLessThanOrEqual(factory.innerWidth + 1)
      expect(factory.factoryCard).not.toBeNull()
      expect(factory.factoryCard?.left ?? 0).toBeGreaterThanOrEqual(-1)
      expect(factory.factoryCard?.right ?? 0).toBeLessThanOrEqual(factory.innerWidth + 1)
      expect(factory.factoryCard?.width ?? 0).toBeGreaterThan(240)

      // The finale and archive must also remain horizontally contained.
      await page.evaluate(() => {
        window.__GAME__?.store.dispatch({ type: 'SHOW_FINALE' })
      })
      await waitForPhase(page, 'finale')
      await page.evaluate(() => {
        document.querySelector<HTMLElement>('[data-action="open-archive"]')?.click()
      })
      await page.waitForSelector('.archive-screen')
      const archive = await layoutSnapshot(page)
      expect(archive.documentScrollWidth).toBeLessThanOrEqual(archive.innerWidth + 1)
      expect(archive.archive).not.toBeNull()
      expect(archive.archive?.left ?? 0).toBeGreaterThanOrEqual(-1)
      expect(archive.archive?.right ?? 0).toBeLessThanOrEqual(archive.innerWidth + 1)
      const verticalScrollAvailable =
        archive.documentScrollHeight > archive.innerHeight ||
        (archive.archiveScrollHeight > archive.archiveClientHeight &&
          (archive.archiveOverflowY === 'auto' || archive.archiveOverflowY === 'scroll'))
      expect(verticalScrollAvailable).toBe(true)
      expect(pageErrors).toEqual([])
    })
  })
}
