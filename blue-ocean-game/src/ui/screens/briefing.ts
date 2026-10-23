import type { Chapter, GameState } from '../../core/types'
import { CHAPTERS } from '../../core/story'
import { escapeHtml } from './shared'

/**
 * The first chapter's original text-free woodland panel is verified at
 * `public/assets/ui/woodland-briefing-panel.png` (1672 x 941 RGBA, SHA-256
 * 0b2fef8d7a70c99a18b4d561683ce972e4f1c625322255a712c812f34888b88c).
 * Later chapters use matching text-free art with chapter-specific icons.
 * Matching SVG fallbacks are restored automatically if an image fails to decode.
 */
const WOODLAND_ART_INTEGRATED = true

interface BriefingCopy {
  body: string
  watch: string
}

/** Base-path-safe URL for each chapter's text-free panel art. */
export function woodlandArtUrl(chapterId: Chapter['id'] = 'c2005'): string {
  const file = {
    c2005: 'woodland-briefing-panel.png',
    c2011: 'woodland-briefing-2011.png',
    c2016: 'woodland-briefing-2016.png',
  }[chapterId]
  return `${import.meta.env.BASE_URL}assets/ui/${file}`
}

// A gentle two-to-four sentence brief, condensed from the authored chapter
// lead/brief/watchFor. No historical product, outcome, or sales figure appears
// before the sealed archive. See story.ts for the canonical source copy.
const BRIEFING_COPY = {
  c2005: {
    body:
      'It is 2005. Nintendo’s last home console struggled against its rivals. Better graphics could attract keen players, but many people still find games hard to get into. Should the next machine offer more power, easier family play, or games to carry?',
    watch: 'who would want each machine, and what it would take to build.',
  },
  c2011: {
    body:
      'By 2011, Nintendo’s real family-friendly system has brought more people into gaming. Rivals offer motion controls too, and phones have quick, inexpensive games. What would persuade someone to buy another console: sharper graphics, a screen in the controller, or a standalone handheld?',
    watch: 'what the new games let people do that makes buying another machine worthwhile.',
  },
  c2016: {
    body:
      'It is 2016. Nintendo’s real successor struggled to sell, and the company needs to try again. First choose a TV console, a handheld, or a machine that does both. Then choose its main focus: better graphics, easy shared play, or motion controls.',
    watch: 'how your two choices would work together in one machine.',
  },
} as const satisfies Record<Chapter['id'], BriefingCopy>

interface Theme {
  id: string
  label: string
  position: string
  icon: string
}

const THEMES: readonly Theme[] = [
  {
    id: 'benchmark',
    label: 'Hardware benchmark',
    position: '28%',
    icon: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="7" y="27" width="8" height="14" rx="2.5" />
        <rect x="20" y="18" width="8" height="23" rx="2.5" />
        <rect x="33" y="9" width="8" height="32" rx="2.5" />
        <path d="M6 44h36" />
      </svg>
    `,
  },
  {
    id: 'families',
    label: 'Families and non-players',
    position: '50%',
    icon: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="14" r="7.2" />
        <path d="M16.8 24.2c-3.1 4.5-4.2 9.4-2.1 15.3h18.6c2.1-5.9 1-10.8-2.1-15.3" />
        <path d="M19.8 22.6c1.1 2.4 7.3 2.4 8.4 0" />
        <path d="M17.2 31.5h13.6" />
        <circle cx="21.2" cy="13.8" r=".9" fill="currentColor" stroke="none" />
        <circle cx="26.8" cy="13.8" r=".9" fill="currentColor" stroke="none" />
      </svg>
    `,
  },
  {
    id: 'spending',
    label: 'Spending race',
    position: '72%',
    icon: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="17" cy="31" rx="9.5" ry="4.8" />
        <path d="M7.5 31v5.2c0 2.7 4.3 4.8 9.5 4.8s9.5-2.1 9.5-4.8V31" />
        <ellipse cx="17" cy="26" rx="9.5" ry="4.8" />
        <path d="M7.5 26v5.2" />
        <ellipse cx="31" cy="20" rx="8.5" ry="4.3" />
        <path d="M22.5 20v4.8c0 2.4 3.8 4.3 8.5 4.3s8.5-1.9 8.5-4.3V20" />
      </svg>
    `,
  },
] as const

const GLASSES = '<circle cx="13" cy="25" r="9"/><circle cx="35" cy="25" r="9"/><path d="M22 25c1-3 3-3 4 0M4 25l3-13M44 25l-3-13"/>'

// These summarize each fixed chapter brief, not the preceding simulated vote.
const CHAPTER_THEMES: Record<Chapter['id'], readonly Theme[]> = {
  c2005: THEMES,
  c2011: [
    { id: 'graphics', label: 'Sharper graphics', position: '28%', icon: `<svg viewBox="0 0 48 48" aria-hidden="true">${GLASSES}</svg>` },
    { id: 'tablet', label: 'Screen controller', position: '50%', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="8" width="36" height="32" rx="5"/><path d="M12 14h24v18H12zM22 36h4"/></svg>' },
    { id: 'handheld', label: 'Standalone handheld', position: '72%', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="13" width="28" height="20" rx="3"/><path d="M17 18h14v10H17zM10 21l-3-3c-3-1-5 1-4 4l3 12 8 7M38 21l3-3c3-1 5 1 4 4l-3 12-8 7"/></svg>' },
  ],
  c2016: [
    { id: 'graphics-plus', label: 'Better graphics', position: '28%', icon: `<svg viewBox="0 0 48 48" aria-hidden="true">${GLASSES}<path d="M38 32v12M32 38h12" style="stroke:#4c9854;stroke-width:5"/></svg>` },
    { id: 'shared-play', label: 'Shared play', position: '50%', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="10" r="5"/><circle cx="36" cy="10" r="5"/><path d="M5 24l4-7h6l7 10h4l7-10h6l4 7M9 18v13l-3 11M15 18v13l3 11M33 18v13l-3 11M39 18v13l3 11"/></svg>' },
    { id: 'motion', label: 'Motion controls', position: '72%', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 33h30l4 9H5zM24 33V19"/><circle cx="24" cy="13" r="6"/><path d="M9 10l-4 7 5 5M39 10l4 7-5 5M5 17h8M43 17h-8"/></svg>' },
  ],
}

const ORNAMENT = `
  <svg viewBox="0 0 160 96" aria-hidden="true">
    <path class="woodland-ornament-stem" d="M7 88C36 82 61 63 82 27" />
    <path class="woodland-ornament-leaf" d="M31 70C14 67 7 56 10 42c15 1 25 11 21 28Z" />
    <path class="woodland-ornament-leaf" d="M50 55c-4-16 4-27 18-32 5 14-1 27-18 32Z" />
    <path class="woodland-ornament-leaf" d="M72 34c2-15 12-23 26-22-1 14-11 22-26 22Z" />
  </svg>
`

export function renderBriefingScreen(state: GameState): string {
  const chapter = CHAPTERS[state.chapterIndex]
  if (!chapter) return ''
  const copy = BRIEFING_COPY[chapter.id]
  const artUrl = woodlandArtUrl(chapter.id)
  const chapterThemes = CHAPTER_THEMES[chapter.id]
  const artState = WOODLAND_ART_INTEGRATED ? 'integrated' : 'pending'

  const art = WOODLAND_ART_INTEGRATED
    ? `
      <img
        class="woodland-art"
        src="${escapeHtml(artUrl)}"
        alt=""
        aria-hidden="true"
        width="1672"
        height="941"
        decoding="async"
        onerror="this.hidden=true;this.closest('.woodland-panel').dataset.art='pending'"
      />
    `
    : ''

  const themes = chapterThemes.map(
    (theme) => `
      <li
        class="woodland-label woodland-label--${theme.id}"
        style="--theme-x: ${theme.position};"
        data-theme="${theme.id}"
      >${escapeHtml(theme.label)}</li>
    `,
  ).join('')

  const icons = chapterThemes.map(
    (theme) => `
      <span
        class="woodland-icon woodland-icon--${theme.id}"
        style="--theme-x: ${theme.position};"
        data-icon="${theme.id}"
      >${theme.icon}</span>
    `,
  ).join('')

  return `
    <section class="screen briefing-screen woodland-briefing" aria-labelledby="briefing-heading">
      <div class="woodland-shell">
        <div class="woodland-panel" data-art="${artState}" data-chapter="${escapeHtml(chapter.id)}">
          ${art}
          <span class="woodland-ornament woodland-ornament--left" aria-hidden="true">${ORNAMENT}</span>
          <span class="woodland-ornament woodland-ornament--right" aria-hidden="true">${ORNAMENT}</span>
          <div class="woodland-heading-zone">
            <h2 id="briefing-heading">${escapeHtml(chapter.title)}</h2>
          </div>
          <div class="woodland-copy-zone">
            <p class="woodland-copy">${escapeHtml(copy.body)}</p>
          </div>
          <p class="woodland-watch">
            <span class="woodland-watch-label">Watch for</span><span aria-hidden="true">:</span>
            <span>${escapeHtml(copy.watch)}</span>
          </p>
          <div class="woodland-icon-layer" aria-hidden="true">${icons}</div>
          <ul class="woodland-label-row" aria-label="Chapter themes">${themes}</ul>
        </div>
        <div class="woodland-actions">
          <button class="primary-button woodland-begin" type="button" data-action="begin-chapter">
            Convene the board <span aria-hidden="true">▸</span>
          </button>
        </div>
      </div>
    </section>
  `
}
