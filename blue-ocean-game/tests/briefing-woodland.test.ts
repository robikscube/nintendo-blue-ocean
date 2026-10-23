import { describe, expect, it } from 'vitest'
import { CHAPTERS } from '../src/core/story'
import { createInitialState } from '../src/core/state'
import type { GameState } from '../src/core/types'
import { renderBriefingScreen, woodlandArtUrl } from '../src/ui/screens/briefing'

const LABELS = ['Hardware benchmark', 'Families and non-players', 'Spending race'] as const

function briefingState(chapterIndex: number): GameState {
  return {
    ...createInitialState(),
    chapterIndex,
    phase: 'briefing',
  }
}

function briefedBody(html: string): string {
  return html.match(/<p class="woodland-copy">([\s\S]*?)<\/p>/)?.[1]?.trim() ?? ''
}

describe('woodland briefing panel', () => {
  it('renders every chapter title, a short brief, and one Watch for line', () => {
    CHAPTERS.forEach((chapter, index) => {
      const html = renderBriefingScreen(briefingState(index))
      const body = briefedBody(html)

      expect(html, chapter.id).toContain(`<h2 id="briefing-heading">${chapter.title}</h2>`)
      expect(body.length, `${chapter.id} has a brief`).toBeGreaterThan(120)
      const sentences = body.match(/[.!?](?=\s|$)/g)?.length ?? 0
      expect(sentences, `${chapter.id} stays within 2–4 sentences`).toBeGreaterThanOrEqual(2)
      expect(sentences, `${chapter.id} stays within 2–4 sentences`).toBeLessThanOrEqual(4)
      expect(html).toContain('class="woodland-watch"')
      expect(html).toContain('<span class="woodland-watch-label">Watch for</span>')
    })
  })

  it('keeps the three required icon labels in bar-chart / baby / coins order', () => {
    const html = renderBriefingScreen(briefingState(0))
    const labelMatches = [...html.matchAll(/<li[\s\S]*?data-theme="([^"]+)"[\s\S]*?>([^<]+)<\/li>/g)]

    expect(labelMatches.map((match) => match[2])).toEqual([...LABELS])
    expect(labelMatches.map((match) => match[1])).toEqual(['benchmark', 'families', 'spending'])

    const iconOrder = [...html.matchAll(/data-icon="([^"]+)"/g)].map((match) => match[1])
    expect(iconOrder).toEqual(['benchmark', 'families', 'spending'])
    expect(html).toContain('--theme-x: 28%')
    expect(html).toContain('--theme-x: 50%')
    expect(html).toContain('--theme-x: 72%')
  })

  it('removes the legacy modal clutter and keeps the one native action', () => {
    const html = renderBriefingScreen(briefingState(1))

    for (const legacy of [
      'screen-header',
      'chapter-counter',
      'vote-promise',
      'watch-card',
      'sealed-small',
      'footer-note',
      'briefing-grid',
    ]) {
      expect(html, `legacy ${legacy} removed`).not.toContain(legacy)
    }

    expect(html).toContain('data-action="begin-chapter"')
    expect(html).toContain('Convene the board')
    expect(html.match(/data-action="begin-chapter"/g)).toHaveLength(1)
    expect(html).toContain('aria-labelledby="briefing-heading"')
  })

  it('does not leak console names, outcomes, or sales figures before the archive', () => {
    CHAPTERS.forEach((_chapter, index) => {
      const text = renderBriefingScreen(briefingState(index))
      expect(text).not.toMatch(/\bWii\b|Wii U|Nintendo Switch|Joy-Con|GamePad/)
      expect(text).not.toContain('101.63')
      expect(text).not.toContain('13.56')
      expect(text).not.toContain('156.59')
    })
  })

  it('integrates the verified approved PNG through a base-aware URL', () => {
    expect(woodlandArtUrl()).toBe('/assets/ui/woodland-briefing-panel.png')

    const html = renderBriefingScreen(briefingState(0))
    expect(html).toContain('data-art="integrated"')
    expect(html).toContain('class="woodland-art"')
    expect(html).toContain('src="/assets/ui/woodland-briefing-panel.png"')
    expect(html).toContain('width="1672"')
    expect(html).toContain('height="941"')
    // The HTML fallback exists in the document so a decode failure can restore
    // it without a full re-render.
    expect(html).toContain('class="woodland-icon-layer"')
  })

  it('renders an empty string past the last chapter', () => {
    expect(renderBriefingScreen(briefingState(99))).toBe('')
  })

  it('gives the second and third chapters their own artwork and relevant accessible labels', () => {
    const expected = [
      ['Sharper graphics', 'Screen controller', 'Standalone handheld'],
      ['Better graphics', 'Shared play', 'Motion controls'],
    ]
    for (const index of [1, 2]) {
      const chapter = CHAPTERS[index]!
      const html = renderBriefingScreen(briefingState(index))
      expect(html).toContain(`src="${woodlandArtUrl(chapter.id)}"`)
      expect(html).not.toContain('src="/assets/ui/woodland-briefing-panel.png"')
      for (const label of expected[index - 1]!) expect(html).toContain(`>${label}</li>`)
      for (const label of LABELS) expect(html).not.toContain(`>${label}</li>`)
    }
  })

  it('keeps each chapter context identical for every preceding vote combination', () => {
    for (const index of [1, 2]) {
      const baseline = renderBriefingScreen(briefingState(index))
      for (const d1 of ['A', 'B', 'C'] as const)
        for (const d2 of ['A', 'B', 'C'] as const)
          expect(renderBriefingScreen({ ...briefingState(index), choices: { d1, d2 } })).toBe(baseline)
    }
  })
})
