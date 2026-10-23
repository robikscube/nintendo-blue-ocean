import type { GameState } from '../../core/types'
import { CHAPTERS } from '../../core/story'
import { escapeHtml } from './shared'

export function renderBriefingScreen(state: GameState): string {
  const chapter = CHAPTERS[state.chapterIndex]
  if (!chapter) return ''
  const voteCount = chapter.decisions.length
  return `
    <section class="screen briefing-screen" aria-labelledby="briefing-heading">
      <header class="screen-header">
        <span class="eyebrow">${escapeHtml(chapter.eyebrow)}</span>
        <span class="chapter-counter">CHAPTER ${chapter.number} OF 3</span>
      </header>
      <div class="briefing-grid">
        <div class="briefing-main">
          <h2 id="briefing-heading">${escapeHtml(chapter.title)}</h2>
          <p class="lead">${escapeHtml(chapter.lead)}</p>
          <p class="body-copy">${escapeHtml(chapter.brief)}</p>
          <div class="vote-promise">
            <span class="promise-mark" aria-hidden="true">${voteCount === 2 ? '2' : '1'}</span>
            <span><strong>${voteCount === 2 ? 'Two connected votes' : 'One board vote'}</strong> before this chapter’s factory reveal.</span>
          </div>
        </div>
        <aside class="watch-card">
          <span class="mini-label">WATCH FOR</span>
          <ul>
            ${chapter.watchFor.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
          <div class="sealed-small">
            <span aria-hidden="true">✦</span>
            <p>Historical product outcomes remain sealed. Product names and official figures appear only in the final archive.</p>
          </div>
        </aside>
      </div>
      <footer class="screen-footer">
        <span class="footer-note">The board’s prototype is a design exercise, not a prediction.</span>
        <button class="primary-button" type="button" data-action="begin-chapter">Convene the board <span aria-hidden="true">▸</span></button>
      </footer>
    </section>
  `
}
