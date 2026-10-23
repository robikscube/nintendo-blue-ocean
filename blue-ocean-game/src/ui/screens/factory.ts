import type { GameState, PrototypeSpec } from '../../core/types'
import { SIMULATED_LABEL, getDecisionLabel } from '../../core/story'
import { escapeHtml } from './shared'

function describeChoices(state: GameState): string {
  if (state.chapterIndex === 0) return `Built from Chapter 1 vote: ${getDecisionLabel('d1', state.choices.d1)}`
  if (state.chapterIndex === 1) return `Built from Chapter 2 vote: ${getDecisionLabel('d2', state.choices.d2)}`
  return `Built from two votes: ${getDecisionLabel('d3', state.choices.d3)} + ${getDecisionLabel('d4', state.choices.d4)}`
}

export function renderFactoryScreen(state: GameState, spec: PrototypeSpec | null): string {
  if (!spec) return ''
  const building = state.factoryProgress !== 'done'
  const chosen = describeChoices(state)
  return `
    <section class="factory-screen" aria-label="Fictional factory">
      <aside class="factory-card${building ? ' is-building' : ' is-revealed'}">
        ${building ? `
          <h2>The line is moving.</h2>
          <p class="factory-lede">Two arms. One stamp. A machine assembled from the board’s choices — not from Nintendo’s history.</p>
          <div class="assembly-rail" aria-hidden="true"><span></span></div>
          <p class="factory-source sr-only">${escapeHtml(chosen)}</p>
          <div class="build-actions">
            <button class="secondary-button" type="button" data-action="skip-factory">Skip animation <kbd>S</kbd></button>
          </div>
          <p class="factory-truth">${escapeHtml(SIMULATED_LABEL)}</p>
        ` : `
          <h2>${escapeHtml(spec.title)}</h2>
          <p class="factory-lede">${escapeHtml(spec.description)}</p>
          <div class="prototype-readout">
            <div><span class="mini-label">PRIORITIZES</span><p>${escapeHtml(spec.priorities)}</p></div>
            <div><span class="mini-label">TRADE-OFFS</span><p>${escapeHtml(spec.risks)}</p></div>
          </div>
          <p class="factory-source sr-only">${escapeHtml(chosen)}</p>
          <div class="build-actions">
            <button class="secondary-button" type="button" data-action="replay-factory">Replay build</button>
            <button class="primary-button" type="button" data-action="leave-factory">Confirm</button>
          </div>
          <p class="factory-truth">${escapeHtml(SIMULATED_LABEL)}</p>
        `}
      </aside>
    </section>
  `
}
