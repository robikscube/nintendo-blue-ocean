import type { GameState } from '../../core/types'
import { CHAPTERS, DECISIONS } from '../../core/story'
import { getActiveDecision } from '../../core/state'
import { escapeHtml } from './shared'

export function renderVotingScreen(state: GameState): string {
  const decisionId = getActiveDecision(state)
  if (!decisionId) {
    // Defensive fallback: a complete chapter should never sit on a blank
    // voting screen, even if a checkpoint or presenter jump produced one.
    return `
      <section class="screen voting-screen" aria-labelledby="votes-recorded-heading">
        <header class="vote-header">
          <span class="eyebrow">BOARD VOTE COMPLETE</span>
          <h2 id="votes-recorded-heading">The votes are already recorded.</h2>
          <p>This chapter’s decisions are in the record. Continue to the fictional factory reveal.</p>
        </header>
        <footer class="vote-footer">
          <button class="primary-button" type="button" data-action="continue-factory">Continue to the factory <span aria-hidden="true">▸</span></button>
        </footer>
      </section>
    `
  }
  const decision = DECISIONS[decisionId]
  const chapter = CHAPTERS[state.chapterIndex]
  if (!chapter) return ''
  const chapterVotes = chapter.decisions
  const voteNumber = chapterVotes.indexOf(decisionId) + 1
  const selected = state.selectedChoice
  return `
    <section class="screen voting-screen" aria-labelledby="decision-heading">
      <header class="vote-header">
        <span class="eyebrow">BOARD VOTE · VOTE ${voteNumber} OF ${chapterVotes.length}</span>
        <h2 id="decision-heading">${escapeHtml(decision.prompt)}</h2>
      </header>
      <div class="choice-grid" role="group" aria-label="${escapeHtml(decision.prompt)}">
        ${decision.options.map((option, index) => `
          <button
            class="choice-card${selected === option.id ? ' is-selected' : ''}"
            type="button"
            data-action="select-choice"
            data-choice="${option.id}"
            aria-pressed="${selected === option.id ? 'true' : 'false'}"
          >
            <span class="choice-topline">
              <span class="choice-key" aria-hidden="true">${index + 1}</span>
              <span class="choice-id">OPTION ${option.id}</span>
              <span class="choice-check" aria-hidden="true">${selected === option.id ? '✓' : ''}</span>
            </span>
            <span class="choice-title">${escapeHtml(option.title)}</span>
            <span class="choice-detail">${escapeHtml(option.detail)}</span>
            <span class="choice-tradeoff">
              <span><strong>Benefit</strong>${escapeHtml(option.benefit)}</span>
              <span><strong>Trade-off</strong>${escapeHtml(option.tradeoff)}</span>
            </span>
          </button>
        `).join('')}
      </div>
      <footer class="vote-footer">
        <button class="primary-button" type="button" data-action="commit-choice" ${selected ? '' : 'disabled'}>Confirm</button>
      </footer>
    </section>
  `
}
