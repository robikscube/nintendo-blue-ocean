import type { GameState } from '../../core/types'
import { CHAPTERS } from '../../core/story'
import { escapeHtml } from './shared'

export function renderTransitionScreen(state: GameState): string {
  const chapter = CHAPTERS[state.chapterIndex]
  if (!chapter) return ''
  // Chapter-to-chapter transitions share the one-word Continue action. The
  // final transition keeps its authored "Open the sealed archive" label so
  // the last step into the historical reveal stays explicit.
  const isChapterTransition = state.chapterIndex < CHAPTERS.length - 1
  const actionLabel = isChapterTransition ? 'Continue' : chapter.transition.nextLabel
  return `
    <section class="screen transition-screen" aria-labelledby="transition-heading">
      <div class="transition-line" aria-hidden="true"></div>
      <span class="eyebrow">${escapeHtml(chapter.transition.eyebrow)}</span>
      <h2 id="transition-heading">${escapeHtml(chapter.transition.title)}</h2>
      <p class="transition-copy">${escapeHtml(chapter.transition.text)}</p>
      <button class="primary-button" type="button" data-action="transition-next">${escapeHtml(actionLabel)}</button>
    </section>
  `
}
