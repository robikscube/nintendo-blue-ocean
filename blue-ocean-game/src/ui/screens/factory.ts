import type { GameState, PrototypeSpec } from '../../core/types'
import { SIMULATED_LABEL, getDecisionLabel } from '../../core/story'
import { escapeHtml } from './shared'

function describeChoices(state: GameState): string {
  if (state.chapterIndex === 0) return `Built from Chapter 1 vote: ${getDecisionLabel('d1', state.choices.d1)}`
  if (state.chapterIndex === 1) return `Built from Chapter 2 vote: ${getDecisionLabel('d2', state.choices.d2)}`
  return `Built from two votes: ${getDecisionLabel('d3', state.choices.d3)} + ${getDecisionLabel('d4', state.choices.d4)}`
}

/**
 * The 3D factory timeline finishes at about 6.1 seconds. The three caption
 * sweeps occupy its first ~5.5 seconds; the final caption then holds until
 * the real factory completion event replaces the build card.
 *
 * Rendering all phases up front lets CSS run each letter's small magnifying
 * pulse without any JS timers or extra state changes. Skip/replay and restored
 * checkpoints therefore keep using the authoritative factory progress state.
 */
const FACTORY_CAPTION_STEPS = [
  'Gathering materials',
  'Building parts',
  'Assembling object',
] as const
const FACTORY_CAPTION_STEP_SECONDS = 1.83

function renderFactoryAssemblyHeading(): string {
  const phases = FACTORY_CAPTION_STEPS.map((caption, phaseIndex) => {
    const letterInterval = 1.43 / Math.max(1, caption.length - 1)
    const letters = [...caption].map((letter, letterIndex) => {
      const delay = (0.16 + letterIndex * letterInterval).toFixed(3)
      return `<span class="factory-caption-letter" style="--letter-delay:${delay}s">${letter === ' ' ? '&nbsp;' : escapeHtml(letter)}</span>`
    }).join('')
    const phaseOffset = (phaseIndex * FACTORY_CAPTION_STEP_SECONDS).toFixed(2)
    return `<span class="factory-caption-phase" data-build-step="${phaseIndex + 1}" style="--phase-offset:${phaseOffset}s" aria-hidden="true">${letters}</span>`
  }).join('')

  return `<h2 class="factory-assembly-heading" aria-label="${FACTORY_CAPTION_STEPS.join('. ')}">${phases}</h2>`
}

export function renderFactoryScreen(state: GameState, spec: PrototypeSpec | null): string {
  if (!spec) return ''
  const building = state.factoryProgress !== 'done'
  const chosen = describeChoices(state)
  return `
    <section class="factory-screen" aria-label="Fictional factory">
      <aside class="factory-card${building ? ' is-building' : ' is-revealed'}">
        ${building ? `
          ${renderFactoryAssemblyHeading()}
          <p class="factory-source sr-only">${escapeHtml(chosen)}</p>
          <div class="build-actions">
            <button class="secondary-button" type="button" data-action="skip-factory">Skip animation <kbd>S</kbd></button>
          </div>
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
