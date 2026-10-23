import type {
  ChoiceId,
  DialogueLine,
  GameState,
  PrototypeSpec,
} from '../core/types'
import {
  ACTUAL_HISTORY,
  CHAPTERS,
  CHARACTERS,
  DECISION_ORDER,
  DECISIONS,
  DISCUSSION_FOLLOWUP,
  DISCUSSION_QUESTION,
  FINAL_CAVEAT,
  FINALE_INTRO,
  INTERPRETIVE_SOURCES,
  SALES_AS_OF,
  SALES_SOURCE,
  SIMULATED_LABEL,
  SOURCE_NOTE,
  getDecisionLabel,
  getOption,
} from '../core/story'
import {
  getActiveDecision,
  getCurrentLine,
} from '../core/state'
import type { GameStore } from '../core/store'
import { buildPrototypeSpec } from '../scene/prototype-model'
import type { SceneDirector } from '../scene/scene-director'
import type { AudioEngine } from '../audio/audio'

type PhaseKind = GameState['phase']

interface UIDependencies {
  store: GameStore
  scene: SceneDirector | null
  audio: AudioEngine
  root: HTMLElement
}

const PHASE_LABELS: Record<PhaseKind, string> = {
  title: 'FICTIONAL CASE',
  opening: 'WELCOME',
  briefing: 'CHAPTER BRIEFING',
  advisors: 'ADVISOR BRIEFING',
  voting: 'BOARD VOTE',
  factory: 'FACTORY FLOOR',
  feedback: 'BOARD CONSEQUENCE',
  boss: 'THE CHAIR SPEAKS',
  transition: 'TRANSITION',
  finale: 'THE SEALED ARCHIVE',
}

/**
 * Reveal pacing. The prose is authored data, so this is purely presentation:
 * roughly 215 visible characters per second keeps ordinary lines readable but
 * complete in well under a second. The wall-clock deadline is a safety net for
 * throttled timers / hidden tabs and is deliberately independent of frame count.
 */
const REVEAL_CHARS_PER_SECOND = 215
const REVEAL_MIN_MS = 260
const REVEAL_MAX_MS = 1000
// Wall-clock hard cap: any line (including a full 200-character ordinary line)
// is fully visible before 1.0 s even if animation frames are throttled.
const REVEAL_DEADLINE_MS = 950
const REVEAL_BLIP_INTERVAL_MS = 150
// A click that completes a line starts this cooldown so the second half of the
// same gesture cannot also advance. It stays below the existing 180 ms
// deliberate-click contract in tests/e2e/interactions.spec.ts.
const DIALOGUE_ADVANCE_GUARD_MS = 160
// P2 owns the exit transition; the panel stays mounted for this long so the
// CSS fade can actually paint before `hidden` removes it from the tree.
const DIALOGUE_EXIT_MS = 210

export class UI {
  private readonly store: GameStore
  private readonly scene: SceneDirector | null
  private readonly audio: AudioEngine
  private readonly root: HTMLElement
  private readonly view: HTMLElement
  private readonly dialoguePanel: HTMLElement
  private readonly dialogueText: HTMLElement
  private readonly dialogueAccessible: HTMLElement
  private readonly speakerName: HTMLElement
  private readonly muteButton: HTMLButtonElement
  private readonly presenterButton: HTMLButtonElement
  private readonly fullscreenButton: HTMLButtonElement
  private readonly chapterLabel: HTMLElement
  private readonly hudPhase: HTMLElement
  private readonly voteTrack: HTMLElement
  private readonly sealIndicator: HTMLElement
  private readonly presenterLayer: HTMLElement
  private readonly toast: HTMLElement
  private readonly liveRegion: HTMLElement
  private readonly fallbackNote: HTMLElement
  private readonly reducedMotion: boolean
  private readonly unsubscribe: () => void

  private viewSignature = ''
  private dialogueKey = ''
  private revealFrame: number | null = null
  private revealDeadline: number | null = null
  private typing = false
  private fullLine = ''
  private blipInFlight = false
  private lastDialogueAdvance = 0
  private dialogueLeaving = false
  private dialogueLeaveTimer: number | null = null
  private presenterOpen = false
  private archiveOpen = false
  private lastFinaleRevision: number | null = null
  private factoryRunKey = ''
  private toastTimer: number | null = null
  private starting = false
  private disposed = false

  constructor({ store, scene, audio, root }: UIDependencies) {
    this.store = store
    this.scene = scene
    this.audio = audio
    this.root = root
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.buildShelldon()

    const byId = <T extends HTMLElement>(id: string): T => {
      const element = document.getElementById(id)
      if (!element) throw new Error(`Missing UI node #${id}`)
      return element as T
    }

    this.view = byId('view')
    this.dialoguePanel = byId('dialogue-panel')
    this.dialogueText = byId('dialogue-text')
    this.dialogueAccessible = byId('dialogue-accessible')
    this.speakerName = byId('speaker-name')
    // Validate the stable P1/P2 contract node exists even though pointer
    // handling is delegated (the whole bubble advances the line).
    byId<HTMLButtonElement>('dialogue-continue')
    this.muteButton = byId<HTMLButtonElement>('mute-button')
    this.presenterButton = byId<HTMLButtonElement>('presenter-button')
    this.fullscreenButton = byId<HTMLButtonElement>('fullscreen-button')
    this.chapterLabel = byId('chapter-label')
    this.hudPhase = byId('hud-phase')
    this.voteTrack = byId('vote-track')
    this.sealIndicator = byId('seal-indicator')
    this.presenterLayer = byId('presenter-layer')
    this.toast = byId('toast')
    this.liveRegion = byId('live-region')
    this.fallbackNote = byId('fallback-note')

    if (!scene) {
      this.root.classList.add('no-webgl')
      this.fallbackNote.hidden = false
    }
    if (scene) {
      scene.onContextLost = () => {
        this.root.classList.add('no-webgl')
        this.fallbackNote.hidden = false
        this.showToast('3D preview lost its graphics context. The story remains playable.', 6500)
      }
    }

    this.root.addEventListener('click', this.handleClick)
    this.root.addEventListener('input', this.handleInput)
    window.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    const unlock = (): void => {
      void this.audio.unlock()
      this.audio.setMuted(this.store.state.muted)
    }
    this.root.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    const canvas = document.getElementById('scene')
    canvas?.addEventListener('click', this.handleCanvasClick)

    this.unsubscribe = store.subscribe((state, previous) => this.render(state, previous))
    this.render(store.state)
  }

  private buildShelldon(): void {
    this.root.innerHTML = `
      <header class="hud" id="hud">
        <div class="hud-brand">
          <span class="hud-mark" aria-hidden="true">N</span>
          <span class="hud-brand-copy">
            <strong>NINTENDO</strong>
            <span>THE NEXT BLUE OCEAN</span>
          </span>
        </div>
        <div class="hud-current">
          <span class="hud-chapter" id="chapter-label">FICTIONAL CASE</span>
          <span class="hud-phase" id="hud-phase">PRESENTATION READY</span>
          <span class="seal-indicator" id="seal-indicator">HISTORICAL RECORD SEALED</span>
        </div>
        <nav class="vote-track" id="vote-track" aria-label="Board votes"></nav>
        <div class="hud-actions">
          <button class="hud-button icon-button" id="fullscreen-button" type="button" data-action="fullscreen" title="Toggle fullscreen (F)" aria-label="Toggle fullscreen">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
            </svg>
          </button>
          <button class="hud-button icon-button" id="mute-button" type="button" data-action="mute" title="Mute (M)" aria-label="Mute sound">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 9h3.5L13 5v14l-5.5-4H4z" />
              <path class="sound-wave" d="M16.5 8.2c1.6 1.7 1.6 5.9 0 7.6M19.2 5.8c2.8 2.9 2.8 9.5 0 12.4" />
              <path class="sound-slash" d="M16.5 9l5 6M21.5 9l-5 6" />
            </svg>
          </button>
          <button class="hud-button presenter-button" id="presenter-button" type="button" data-action="open-presenter" title="Presenter controls (P)">
            Presenter
          </button>
        </div>
      </header>

      <div class="scene-vignette" aria-hidden="true"></div>
      <section id="view" class="view" aria-label="Presentation content"></section>

      <section class="dialogue-panel" id="dialogue-panel" aria-label="Dialogue" hidden>
        <div class="dialogue-nameplate" id="dialogue-nameplate">
          <span class="speaker-name" id="speaker-name">Hootley</span>
        </div>
        <div class="dialogue-copy">
          <p class="dialogue-text" id="dialogue-text" aria-hidden="true"></p>
          <span class="sr-only" id="dialogue-accessible" aria-live="polite"></span>
          <div class="dialogue-footer">
            <button class="dialogue-continue" id="dialogue-continue" type="button" aria-label="Continue to the next line">
              <span class="continue-marker" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        <span class="dialogue-shortcut" aria-hidden="true">Click / Space</span>
      </section>

      <div class="fallback-note" id="fallback-note" hidden>
        <strong>Story mode</strong>
        <span>The 3D preview is unavailable, but the complete case is still playable.</span>
      </div>

      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <div class="sr-only" id="live-region" aria-live="polite"></div>
      <div class="presenter-layer" id="presenter-layer" hidden></div>
    `
  }

  private render(state: GameState, previous?: GameState): void {
    if (this.disposed) return
    this.root.dataset.phase = state.phase
    this.root.dataset.presenterMode = state.presenterMode ? 'on' : 'off'
    if (state.phase === 'finale') {
      if (this.lastFinaleRevision !== state.sceneRevision) {
        this.archiveOpen = false
        this.lastFinaleRevision = state.sceneRevision
      }
    } else {
      this.lastFinaleRevision = null
    }

    this.updateHud(state)
    this.scene?.applyState(state)
    this.renderView(state)
    this.renderDialogue(state)
    this.renderPresenter(state)

    if (state.phase === 'factory' && state.factoryProgress === 'idle') {
      this.ensureFactoryStarted(state)
    }

    if (
      previous &&
      state.phase === 'factory' &&
      state.factoryProgress === 'done' &&
      previous.factoryProgress !== 'done'
    ) {
      void this.audio.sting('reveal')
    }
  }

  private updateHud(state: GameState): void {
    const chapter = CHAPTERS[state.chapterIndex]
    if (state.phase === 'title') {
      this.chapterLabel.textContent = 'FICTIONAL CLASSROOM CASE'
      this.hudPhase.textContent = '2005 — 2016'
    } else if (state.chapterIndex >= 3) {
      this.chapterLabel.textContent = 'HISTORICAL ARCHIVE'
      this.hudPhase.textContent = state.phase === 'finale' && this.archiveOpen ? 'RECORD OPEN' : 'RECORD SEALED'
    } else {
      this.chapterLabel.textContent = `CHAPTER ${chapter?.number ?? 1} / 3 · ${chapter?.year ?? 2005}`
      this.hudPhase.textContent = PHASE_LABELS[state.phase]
    }

    this.voteTrack.innerHTML = DECISION_ORDER.map((decisionId) => {
      const choice = state.choices[decisionId]
      const active = state.phase === 'voting' && getActiveDecision(state) === decisionId
      const label = DECISIONS[decisionId].options.find((option) => option.id === choice)?.shortTitle
      return `
        <span
          class="vote-chip${choice ? ' is-done' : ''}${active ? ' is-active' : ''}"
          title="Decision ${decisionId.slice(1)}${label ? `: ${escapeHtml(label)}` : ''}"
          aria-label="Decision ${decisionId.slice(1)}${choice ? `: ${escapeHtml(choice)} ${escapeHtml(label ?? '')}` : ': not voted'}"
        >
          <span class="vote-chip-key">D${decisionId.slice(1)}</span>
          <span class="vote-chip-value">${choice ?? '·'}</span>
        </span>
      `
    }).join('')

    this.muteButton.classList.toggle('is-muted', state.muted)
    this.muteButton.setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound')
    this.muteButton.title = state.muted ? 'Unmute (M)' : 'Mute (M)'
    this.muteButton.setAttribute('aria-pressed', state.muted ? 'true' : 'false')

    this.presenterButton.classList.toggle('is-active', this.presenterOpen)
    this.presenterButton.setAttribute('aria-expanded', this.presenterOpen ? 'true' : 'false')

    const archiveOpen = state.phase === 'finale' && this.archiveOpen
    this.sealIndicator.textContent = archiveOpen ? 'HISTORICAL RECORD OPEN' : 'HISTORICAL RECORD SEALED'
    this.sealIndicator.classList.toggle('is-open', archiveOpen)
    this.root.classList.toggle('presenter-mode-on', state.presenterMode)
  }

  private renderView(state: GameState): void {
    let content = ''
    const active = getActiveDecision(state)
    const choiceSignature = DECISION_ORDER.map((decision) => state.choices[decision] ?? '-').join('')
    const factorySpec = state.phase === 'factory'
      ? buildPrototypeSpec(state.chapterIndex, state.choices)
      : null
    const signature = [
      state.phase,
      state.chapterIndex,
      state.sceneRevision,
      active ?? '-',
      state.selectedChoice ?? '-',
      choiceSignature,
      state.factoryProgress,
      factorySpec?.key ?? '-',
      this.archiveOpen ? 'archive-open' : 'archive-closed',
      state.started ? 'started' : 'title',
    ].join('|')

    if (signature === this.viewSignature) {
      this.updateHud(state)
      return
    }
    this.viewSignature = signature

    switch (state.phase) {
      case 'title':
        content = this.renderTitle()
        break
      case 'briefing':
        content = this.renderBriefing(state)
        break
      case 'voting':
        content = this.renderVoting(state)
        break
      case 'factory':
        content = this.renderFactory(state, factorySpec)
        break
      case 'transition':
        content = this.renderTransition(state)
        break
      case 'finale':
        content = this.archiveOpen ? this.renderArchive(state) : this.renderFinaleIntro()
        break
      default:
        content = ''
        break
    }

    this.view.innerHTML = content
    this.view.setAttribute('aria-hidden', content ? 'false' : 'true')
    if (state.phase === 'finale' && this.archiveOpen) {
      const archive = this.view.querySelector<HTMLElement>('.archive-screen')
      if (archive) archive.scrollTop = 0
      this.announce('The historical archive is open. Official lifetime hardware figures are displayed with sources.')
    } else if (content) {
      this.announce(this.view.querySelector('h1, h2')?.textContent ?? PHASE_LABELS[state.phase])
    }
  }

  private renderTitle(): string {
    return `
      <section class="screen title-screen" aria-labelledby="title-heading">
        <div class="title-column">
          <span class="eyebrow">A PRESENTER-LED STRATEGY CASE · 10–15 MINUTES</span>
          <h1 id="title-heading" class="title-lockup">
            <span>NINTENDO</span>
            <strong>The Next<br />Blue Ocean</strong>
          </h1>
          <p class="title-dek">You are the board. Four votes decide where play happens, who it reaches, and what the next machine is for.</p>
          <div class="title-actions">
            <button class="primary-button large" type="button" data-action="start">
              Enter the boardroom <span aria-hidden="true">▸</span>
            </button>
            <button class="text-button" type="button" data-action="open-presenter">Presenter guide</button>
          </div>
          <p class="title-note">Fictional executive dialogue. Audience concepts are hypothetical. Real products, official figures, and outcomes stay sealed until the finale.</p>
        </div>
        <aside class="title-aside" aria-label="Session overview">
          <div class="session-card">
            <span class="session-number">12<span>min</span></span>
            <span class="session-caption">roughly, at a brisk classroom pace</span>
          </div>
          <dl class="session-list">
            <div><dt>3</dt><dd>chapters</dd></div>
            <div><dt>4</dt><dd>hands-up votes</dd></div>
            <div><dt>3</dt><dd>fictional prototype reveals</dd></div>
            <div><dt>1</dt><dd>sealed historical archive</dd></div>
          </dl>
          <div class="how-to">
            <span class="mini-label">IN THE ROOM</span>
            <p>Count hands. The presenter clicks the majority and records it with <kbd>V</kbd>. No score, no pass/fail.</p>
          </div>
        </aside>
      </section>
    `
  }

  private renderBriefing(state: GameState): string {
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

  private renderVoting(state: GameState): string {
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
            <p>The board’s path can be reviewed from the presenter drawer.</p>
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
          <span class="eyebrow">BOARD VOTE · CHAPTER ${chapter.number} · VOTE ${voteNumber} OF ${chapterVotes.length}</span>
          <h2 id="decision-heading">${escapeHtml(decision.prompt)}</h2>
          <p>${escapeHtml(decision.context)}</p>
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
          <p><strong>Audience votes by hand.</strong> Presenter selects the majority with <kbd>1</kbd>–<kbd>3</kbd>, then records with <kbd>V</kbd>. There is no scoring or “correct” card.</p>
          <button class="primary-button" type="button" data-action="commit-choice" ${selected ? '' : 'disabled'}>
            Record the board’s vote <span aria-hidden="true">▸</span>
          </button>
        </footer>
      </section>
    `
  }

  private renderFactory(state: GameState, spec: PrototypeSpec | null): string {
    if (!spec) return ''
    const chapter = CHAPTERS[state.chapterIndex]
    const building = state.factoryProgress !== 'done'
    const chosen = this.describeChoices(state)
    return `
      <div class="factory-banner">
        <span class="factory-live"><span class="live-dot" aria-hidden="true"></span>${building ? 'ASSEMBLY IN PROGRESS' : 'ASSEMBLY COMPLETE'}</span>
        <span class="factory-year">${chapter?.eyebrow ?? ''}</span>
        <span class="factory-label">AUDIENCE CONCEPT · NOT HISTORICAL</span>
      </div>
      <section class="factory-screen" aria-label="Fictional factory">
        <aside class="factory-card${building ? ' is-building' : ' is-revealed'}">
          ${building ? `
            <span class="eyebrow">FACTORY FLOOR · PROTOTYPE 0${state.chapterIndex + 1}</span>
            <h2>The line is moving.</h2>
            <p class="factory-lede">Two arms. One stamp. A machine assembled from the board’s choices — not from Nintendo’s history.</p>
            <div class="assembly-rail" aria-hidden="true"><span></span></div>
            <p class="factory-source">${escapeHtml(chosen)}</p>
            <div class="build-actions">
              <button class="secondary-button" type="button" data-action="skip-factory">Skip animation <kbd>S</kbd></button>
            </div>
            <span class="simulated-stamp">${escapeHtml(SIMULATED_LABEL)}</span>
          ` : `
            <span class="eyebrow">FICTIONAL DESIGN EXERCISE · CHAPTER ${state.chapterIndex + 1}</span>
            <span class="prototype-number">CONCEPT PROTOTYPE 0${state.chapterIndex + 1}</span>
            <h2>${escapeHtml(spec.title)}</h2>
            <p class="factory-lede">${escapeHtml(spec.description)}</p>
            <div class="prototype-readout">
              <div><span class="mini-label">PRIORITIZES</span><p>${escapeHtml(spec.priorities)}</p></div>
              <div><span class="mini-label">TRADE-OFFS</span><p>${escapeHtml(spec.risks)}</p></div>
            </div>
            <p class="factory-source">${escapeHtml(chosen)}</p>
            <div class="build-actions">
              <button class="secondary-button" type="button" data-action="replay-factory">Replay build</button>
              <button class="primary-button" type="button" data-action="leave-factory">Face the board <span aria-hidden="true">▸</span></button>
            </div>
            <span class="simulated-stamp">${escapeHtml(SIMULATED_LABEL)}</span>
            <p class="fine-print">A fictional composition, not a prediction. No sales, demand, or market outcome is implied.</p>
          `}
        </aside>
      </section>
    `
  }

  private describeChoices(state: GameState): string {
    if (state.chapterIndex === 0) return `Built from Chapter 1 vote: ${getDecisionLabel('d1', state.choices.d1)}`
    if (state.chapterIndex === 1) return `Built from Chapter 2 vote: ${getDecisionLabel('d2', state.choices.d2)}`
    return `Built from two votes: ${getDecisionLabel('d3', state.choices.d3)} + ${getDecisionLabel('d4', state.choices.d4)}`
  }

  private renderTransition(state: GameState): string {
    const chapter = CHAPTERS[state.chapterIndex]
    if (!chapter) return ''
    return `
      <section class="screen transition-screen" aria-labelledby="transition-heading">
        <div class="transition-line" aria-hidden="true"></div>
        <span class="eyebrow">${escapeHtml(chapter.transition.eyebrow)}</span>
        <h2 id="transition-heading">${escapeHtml(chapter.transition.title)}</h2>
        <p class="transition-copy">${escapeHtml(chapter.transition.text)}</p>
        <button class="primary-button" type="button" data-action="transition-next">${escapeHtml(chapter.transition.nextLabel)} <span aria-hidden="true">▸</span></button>
        <p class="sealed-small single">Historical products and figures are still sealed.</p>
      </section>
    `
  }

  private renderFinaleIntro(): string {
    return `
      <section class="screen finale-intro" aria-labelledby="finale-heading">
        <div class="archive-seal" aria-hidden="true">
          <span class="seal-orbit orbit-one"></span>
          <span class="seal-orbit orbit-two"></span>
          <span class="seal-core">N</span>
        </div>
        <span class="eyebrow">${escapeHtml(FINALE_INTRO.eyebrow)}</span>
        <h2 id="finale-heading">${escapeHtml(FINALE_INTRO.title)}</h2>
        <p class="lead">${escapeHtml(FINALE_INTRO.lead)}</p>
        <p class="finale-note">${escapeHtml(FINALE_INTRO.note)}</p>
        <button class="primary-button large" type="button" data-action="open-archive">
          Break the seal <span aria-hidden="true">▸</span>
        </button>
        <span class="fine-print">Official worldwide lifetime hardware figures, with source links, appear on the next screen.</span>
      </section>
    `
  }

  private renderArchive(state: GameState): string {
    return `
      <section class="screen archive-screen" aria-labelledby="archive-heading">
        <header class="archive-header">
          <div>
            <span class="eyebrow">FINAL REPORT · HISTORY VS. HYPOTHESIS</span>
            <h2 id="archive-heading">The historical record</h2>
            <p class="lead">Three real platforms, set beside the board’s fictional choices. No grade: compare the reasoning, then interrogate the outcome.</p>
          </div>
          <div class="archive-stamp">
            <span>OFFICIAL FIGURES</span>
            <strong>${escapeHtml(SALES_AS_OF)}</strong>
            <button class="archive-jump" type="button" data-action="scroll-discussion">Evidence &amp; discussion ↓</button>
          </div>
        </header>

        <div class="class-path" aria-label="The board's path">
          <span class="mini-label">YOUR BOARD’S PATH</span>
          <div>
            ${DECISION_ORDER.map((decision) => {
              const option = getOption(decision, state.choices[decision])
              return `
              <span class="path-chip${option ? ' has-detail' : ''}">
                <span class="path-chip-head">
                  <span>D${decision.slice(1)}</span>
                  <strong>${escapeHtml(getDecisionLabel(decision, state.choices[decision]))}</strong>
                </span>
                ${option ? `<small>${escapeHtml(option.detail)}</small>` : ''}
              </span>
            `}).join('')}
          </div>
          <span class="path-note">Simulation only · never a historical prediction</span>
        </div>

        <div class="archive-grid">
          ${ACTUAL_HISTORY.map((product) => {
            const classChoice = product.id === 'wii'
              ? getDecisionLabel('d1', state.choices.d1)
              : product.id === 'wii-u'
                ? getDecisionLabel('d2', state.choices.d2)
                : `${getDecisionLabel('d3', state.choices.d3)} + ${getDecisionLabel('d4', state.choices.d4)}`
            return `
              <article class="history-card history-${escapeHtml(product.id)}">
                <div class="history-top">
                  <span class="history-year">${product.launchYear}</span>
                  <span class="history-launch">LAUNCHED</span>
                </div>
                <div class="product-silhouette silhouette-${escapeHtml(product.id)}" aria-hidden="true">
                  ${productSilhouette(product.id)}
                </div>
                <h3>${escapeHtml(product.name)}</h3>
                <p class="history-pitch">${escapeHtml(product.proposition)}</p>
                <div class="lifetime-figure">
                  <strong>${escapeHtml(product.units)}</strong>
                  <span>${escapeHtml(product.unitsNote)}</span>
                </div>
                <p class="history-detail">${escapeHtml(product.detail)}</p>
                <div class="class-comparison">
                  <span>${escapeHtml(product.comparison)}</span>
                  <strong>${escapeHtml(classChoice)}</strong>
                  <em>No pass/fail</em>
                </div>
                <p class="history-caution">${escapeHtml(product.caution)}</p>
              </article>
            `
          }).join('')}
        </div>

        <section class="evidence-panel" aria-labelledby="evidence-heading">
          <div>
            <span class="mini-label">READ THE EVIDENCE CAREFULLY</span>
            <h3 id="evidence-heading">Commercial scale is not causal proof.</h3>
            <p>${escapeHtml(FINAL_CAVEAT)}</p>
          </div>
          <div class="sources">
            <span class="mini-label">SOURCES</span>
            <a href="${escapeHtml(SALES_SOURCE.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(SALES_SOURCE.label)} <span aria-hidden="true">↗</span></a>
            ${INTERPRETIVE_SOURCES.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a>`).join('')}
            <p class="source-date">${escapeHtml(SALES_SOURCE.asOf)} for the three lifetime hardware totals. Figures are official Nintendo IR values.</p>
            <p class="source-date">${escapeHtml(SOURCE_NOTE)}</p>
          </div>
        </section>

        <section class="discussion-card" aria-labelledby="discussion-heading">
          <span class="eyebrow">DISCUSSION · 15–20 SECONDS</span>
          <h3 id="discussion-heading">${escapeHtml(DISCUSSION_QUESTION)}</h3>
          <p class="discussion-followup">${escapeHtml(DISCUSSION_FOLLOWUP)}</p>
          <p>Ask the room before revealing your own view. The exhibit is designed to leave the argument open.</p>
          <div class="discussion-actions">
            <button class="primary-button" type="button" data-action="reset-from-archive">Run the case again</button>
            <button class="secondary-button" type="button" data-action="close-archive">Return to the seal</button>
          </div>
        </section>
      </section>
    `
  }

  private renderDialogue(state: GameState): void {
    const line = getCurrentLine(state)
    const isDialogue = state.phase === 'opening' || state.phase === 'advisors' || state.phase === 'feedback' || state.phase === 'boss'
    if (!line || !isDialogue) {
      this.hideDialogue()
      return
    }

    this.showDialogue()
    const profile = CHARACTERS[line.speaker]
    this.dialoguePanel.style.setProperty('--speaker-color', profile.color)
    this.dialoguePanel.style.setProperty('--speaker-accent', profile.accent)
    this.speakerName.textContent = profile.name
    this.dialoguePanel.classList.toggle('is-narrator', line.speaker === 'narrator')

    const key = `${state.phase}:${state.chapterIndex}:${state.dialogueIndex}:${state.sceneRevision}:${line.text}`
    if (key === this.dialogueKey) return
    this.dialogueKey = key
    this.startLine(line)
  }

  private startLine(line: DialogueLine): void {
    this.stopTyping()
    this.fullLine = line.text
    this.dialogueText.textContent = ''
    this.dialogueAccessible.textContent = `${CHARACTERS[line.speaker].name}: ${line.text}`
    this.dialoguePanel.classList.remove('is-complete')
    this.lastDialogueAdvance = 0

    // Narrator lines and reduced-motion viewers get the complete line at once.
    if (this.reducedMotion || line.speaker === 'narrator' || line.text.length === 0) {
      this.completeLine()
      return
    }

    const length = line.text.length
    const linearDuration = (length / REVEAL_CHARS_PER_SECOND) * 1000
    const duration = Math.min(REVEAL_MAX_MS, Math.max(REVEAL_MIN_MS, linearDuration))

    this.typing = true
    this.dialoguePanel.setAttribute('aria-busy', 'true')
    this.dialoguePanel.classList.add('is-typing')

    let shown = 0
    let nextBlipAt = 80
    const startedAt = performance.now()

    const tick = (now: number): void => {
      this.revealFrame = null
      if (!this.typing || this.disposed) return
      const elapsed = now - startedAt
      const progress = Math.min(1, elapsed / duration)
      const nextShown = Math.min(length, Math.ceil(progress * length))
      if (nextShown !== shown) {
        shown = nextShown
        this.dialogueText.textContent = this.fullLine.slice(0, shown)
      }
      // Babble follows the reveal clock, never a separate glyph interval.
      // At most one AudioEngine call is in flight, and the engine itself caps
      // the rate; both stop as soon as the line is complete or skipped.
      if (shown < length && elapsed >= nextBlipAt) {
        nextBlipAt += REVEAL_BLIP_INTERVAL_MS
        this.blip(line.speaker)
      }
      if (progress >= 1 || elapsed >= duration) {
        this.completeLine()
        return
      }
      this.revealFrame = window.requestAnimationFrame(tick)
    }
    this.revealFrame = window.requestAnimationFrame(tick)

    // Independent wall-clock safety net. Even if requestAnimationFrame and
    // timers are throttled (hidden tab, backgrounded browser), the line is
    // forced to its full text rather than sitting partially typed forever.
    this.revealDeadline = window.setTimeout(() => {
      if (this.typing) this.completeLine()
    }, Math.min(duration + 150, REVEAL_DEADLINE_MS))
  }

  private completeLine(): void {
    this.clearRevealTimers()
    this.typing = false
    this.dialogueText.textContent = this.fullLine
    this.dialoguePanel.classList.remove('is-typing')
    this.dialoguePanel.classList.add('is-complete')
    this.dialoguePanel.setAttribute('aria-busy', 'false')
  }

  private blip(speaker: DialogueLine['speaker']): void {
    if (!this.typing || speaker === 'narrator' || this.blipInFlight) return
    this.blipInFlight = true
    void this.audio.blip(speaker).then(
      () => {
        this.blipInFlight = false
      },
      () => {
        this.blipInFlight = false
      },
    )
  }

  private stopTyping(): void {
    this.clearRevealTimers()
    this.typing = false
    this.dialoguePanel.classList.remove('is-typing', 'is-complete')
  }

  private clearRevealTimers(): void {
    if (this.revealFrame !== null) {
      window.cancelAnimationFrame(this.revealFrame)
      this.revealFrame = null
    }
    if (this.revealDeadline !== null) {
      window.clearTimeout(this.revealDeadline)
      this.revealDeadline = null
    }
  }

  private handleVisibilityChange = (): void => {
    // Do not leave a partial line on screen while the tab is hidden. The next
    // frame after returning will hold the complete line until the presenter
    // deliberately advances it.
    if (document.hidden && this.typing) this.completeLine()
  }

  private showDialogue(): void {
    if (this.dialogueLeaveTimer !== null) {
      window.clearTimeout(this.dialogueLeaveTimer)
      this.dialogueLeaveTimer = null
    }
    this.dialogueLeaving = false
    this.dialoguePanel.classList.remove('is-leaving')
    this.dialoguePanel.style.pointerEvents = ''
    this.dialoguePanel.hidden = false
  }

  private hideDialogue(): void {
    this.stopTyping()
    this.dialoguePanel.classList.remove('is-complete', 'is-narrator', 'is-typing')
    this.dialoguePanel.setAttribute('aria-busy', 'false')
    this.dialogueKey = ''

    if (this.dialoguePanel.hidden) {
      if (this.dialogueLeaveTimer !== null) {
        window.clearTimeout(this.dialogueLeaveTimer)
        this.dialogueLeaveTimer = null
      }
      this.dialogueLeaving = false
      this.dialoguePanel.classList.remove('is-leaving')
      this.dialoguePanel.style.pointerEvents = ''
      return
    }
    if (this.reducedMotion) {
      this.finishHideDialogue()
      return
    }
    if (this.dialogueLeaving) return

    // P2's exit transition needs the panel painted for ~210 ms. Disable input
    // immediately so the fading bubble cannot eat a click meant for the next
    // screen; the next dialogue line cancels the fade instead of hiding.
    this.dialogueLeaving = true
    this.dialoguePanel.classList.add('is-leaving')
    this.dialoguePanel.style.pointerEvents = 'none'
    this.dialogueLeaveTimer = window.setTimeout(() => {
      this.dialogueLeaveTimer = null
      if (this.dialogueLeaving) this.finishHideDialogue()
    }, DIALOGUE_EXIT_MS)
  }

  private finishHideDialogue(): void {
    if (this.dialogueLeaveTimer !== null) {
      window.clearTimeout(this.dialogueLeaveTimer)
      this.dialogueLeaveTimer = null
    }
    this.dialogueLeaving = false
    this.dialoguePanel.classList.remove('is-leaving')
    this.dialoguePanel.style.pointerEvents = ''
    this.dialoguePanel.hidden = true
  }

  private handleDialogueAction(): void {
    if (this.dialogueLeaving || this.dialoguePanel.hidden) return
    if (this.typing) {
      this.completeLine()
      // Treat the skip and an immediate second click as one gesture. The
      // next deliberate click still advances the line.
      this.lastDialogueAdvance = performance.now()
      return
    }
    const now = performance.now()
    if (now - this.lastDialogueAdvance < DIALOGUE_ADVANCE_GUARD_MS) return
    this.lastDialogueAdvance = now
    this.store.dispatch({ type: 'ADVANCE_DIALOGUE' })
  }

  private renderPresenter(state: GameState): void {
    this.presenterLayer.hidden = !this.presenterOpen
    this.presenterButton.classList.toggle('is-active', this.presenterOpen)
    this.presenterButton.setAttribute('aria-expanded', this.presenterOpen ? 'true' : 'false')
    if (!this.presenterOpen) {
      this.presenterLayer.innerHTML = ''
      return
    }

    const canJump = state.presenterMode
    const chapter = CHAPTERS[state.chapterIndex]
    const location = state.phase === 'title'
      ? 'Title screen'
      : state.chapterIndex >= 3
        ? 'Historical archive'
        : `Chapter ${chapter?.number ?? 1} · ${state.phase === 'voting' ? 'voting' : state.phase}`
    const dialogueIndex = state.phase === 'opening' || state.phase === 'advisors' || state.phase === 'feedback' || state.phase === 'boss'
      ? state.dialogueIndex
      : 0

    this.presenterLayer.innerHTML = `
      <button class="drawer-scrim" type="button" data-action="close-presenter" aria-label="Close presenter controls"></button>
      <aside class="presenter-drawer" role="dialog" aria-modal="true" aria-labelledby="presenter-heading">
        <header class="drawer-header">
          <div>
            <span class="eyebrow">CONTROL DESK</span>
            <h2 id="presenter-heading">Presenter</h2>
          </div>
          <button class="icon-button drawer-close" type="button" data-action="close-presenter" data-autofocus aria-label="Close presenter controls">×</button>
        </header>

        <div class="drawer-section">
          <span class="mini-label">NOW</span>
          <p class="drawer-location">${escapeHtml(location)}</p>
          <div class="drawer-row">
            <span>Historical archive</span>
            <strong>${state.phase === 'finale' && this.archiveOpen ? 'OPEN' : 'SEALED'}</strong>
          </div>
          <div class="drawer-row">
            <span>Factory</span>
            <strong>${state.phase === 'factory' ? state.factoryProgress.toUpperCase() : '—'}</strong>
          </div>
        </div>

        <div class="drawer-section">
          <button class="toggle-row" type="button" data-action="presenter-mode" aria-pressed="${state.presenterMode ? 'true' : 'false'}">
            <span>
              <strong>Presenter mode</strong>
              <small>Enables arrow-key chapter jumps. Leave off during class Q&amp;A.</small>
            </span>
            <span class="toggle-switch${state.presenterMode ? ' is-on' : ''}" aria-hidden="true"><span></span></span>
          </button>
          <p class="drawer-hint">${canJump ? 'Chapter jumps are unlocked.' : 'Chapter jumps are locked to prevent accidental audience navigation.'}</p>
        </div>

        <div class="drawer-section">
          <span class="mini-label">JUMP TO CHAPTER</span>
          <div class="jump-grid">
            ${CHAPTERS.map((item, index) => `
              <button class="jump-button${state.chapterIndex === index ? ' is-current' : ''}" type="button" data-action="jump-chapter" data-index="${index}" ${canJump ? '' : 'disabled'}>
                <span>${item.year}</span>
                <strong>${escapeHtml(item.title)}</strong>
              </button>
            `).join('')}
            <button class="jump-button${state.phase === 'finale' ? ' is-current' : ''}" type="button" data-action="show-finale" ${canJump ? '' : 'disabled'}>
              <span>Finale</span>
              <strong>Sealed archive</strong>
            </button>
          </div>
          <p class="drawer-hint">A jump re-opens that chapter and clears its votes and later ones. Chapters you skip are shown as “Not voted” in the archive.</p>
        </div>

        <div class="drawer-section">
          <span class="mini-label">SCENE CONTROL</span>
          <div class="control-grid">
            <button class="control-button" type="button" data-action="restart-scene" ${state.phase === 'title' ? 'disabled' : ''}>Restart scene <kbd>R</kbd></button>
            <button class="control-button" type="button" data-action="rewind" ${dialogueIndex > 0 ? '' : 'disabled'}>Rewind line</button>
            <button class="control-button" type="button" data-action="skip-animation" ${state.phase === 'factory' && state.factoryProgress !== 'done' ? '' : 'disabled'}>Skip animation <kbd>S</kbd></button>
            <button class="control-button" type="button" data-action="mute">${state.muted ? 'Unmute' : 'Mute'} <kbd>M</kbd></button>
            <button class="control-button" type="button" data-action="fullscreen">Fullscreen <kbd>F</kbd></button>
          </div>
        </div>

        <div class="drawer-section">
          <label class="volume-row" for="volume">
            <span>Volume <small id="volume-value">${Math.round(this.audio.getVolume() * 100)}%</small></span>
            <input id="volume" data-volume type="range" min="0" max="100" step="1" value="${Math.round(this.audio.getVolume() * 100)}" />
          </label>
          <p class="drawer-hint">Synthesized babble and cues are original. Sound stays off until the first user gesture.</p>
        </div>

        <div class="drawer-section drawer-shortcuts">
          <span class="mini-label">KEYBOARD</span>
          <div><kbd>Space</kbd><span>Complete / advance</span></div>
          <div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><span>Select vote</span></div>
          <div><kbd>V</kbd><span>Record vote</span></div>
          <div><kbd>←</kbd><kbd>→</kbd><span>Chapter jump when presenter mode is on</span></div>
          <div><kbd>Esc</kbd><span>Close this drawer</span></div>
        </div>

        <div class="drawer-danger">
          <button class="danger-button" type="button" data-action="reset-demo">Reset entire demo</button>
          <p>Requires confirmation. Clears all votes and returns to the title.</p>
        </div>
      </aside>
    `
  }

  private ensureFactoryStarted(state: GameState): void {
    const spec = buildPrototypeSpec(state.chapterIndex, state.choices)
    const key = `${state.sceneRevision}:${spec.key}:${state.chapterIndex}`
    if (this.factoryRunKey === key) return
    this.factoryRunKey = key
    const revision = state.sceneRevision
    if (!this.scene) {
      queueMicrotask(() => {
        const current = this.store.state
        if (current.phase !== 'factory' || current.sceneRevision !== revision) return
        if (current.factoryProgress === 'idle') this.store.dispatch({ type: 'FACTORY_STARTED' })
        if (this.store.state.factoryProgress === 'running') this.store.dispatch({ type: 'FACTORY_FINISHED' })
      })
      return
    }
    this.scene.startFactory(spec, () => {
      const current = this.store.state
      if (current.phase === 'factory' && current.sceneRevision === revision) {
        this.store.dispatch({ type: 'FACTORY_FINISHED' })
      }
    })
    void this.audio.sting('start')
    queueMicrotask(() => {
      const current = this.store.state
      if (
        current.phase === 'factory' &&
        current.factoryProgress === 'idle' &&
        current.sceneRevision === revision
      ) {
        this.store.dispatch({ type: 'FACTORY_STARTED' })
      }
    })
  }

  private handleClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    if (target.closest('.dialogue-panel') && !target.closest('[data-action]')) {
      event.preventDefault()
      this.handleDialogueAction()
      return
    }

    const actionElement = target.closest<HTMLElement>('[data-action]')
    if (!actionElement) return
    const action = actionElement.dataset.action
    if (!action) return

    switch (action) {
      case 'start':
        void this.beginDemo()
        break
      case 'begin-chapter':
        if (this.store.state.phase === 'briefing') {
          void this.audio.sting('select')
          this.store.dispatch({ type: 'BEGIN_CHAPTER' })
        }
        break
      case 'select-choice': {
        const choice = actionElement.dataset.choice as ChoiceId | undefined
        if (!choice) return
        if (this.store.state.selectedChoice !== choice) void this.audio.sting('select')
        this.store.dispatch({ type: 'SELECT_CHOICE', choice })
        break
      }
      case 'commit-choice':
        if (this.store.state.selectedChoice) {
          void this.audio.sting('commit')
          this.store.dispatch({ type: 'COMMIT_CHOICE' })
        }
        break
      case 'skip-factory':
        this.skipFactory()
        break
      case 'leave-factory':
        if (this.store.state.factoryProgress === 'done') {
          void this.audio.sting('select')
          this.store.dispatch({ type: 'LEAVE_FACTORY' })
        }
        break
      case 'replay-factory':
        // Re-enter the factory's idle state so the UI shows the build, the Skip
        // control returns, and reduced-motion is honored by startFactory().
        this.store.dispatch({ type: 'RESTART_SCENE' })
        this.showToast('Rebuilding the fictional prototype.')
        break
      case 'continue-factory':
        this.store.dispatch({ type: 'CONTINUE_TO_FACTORY' })
        break
      case 'transition-next':
        void this.audio.sting(this.store.state.chapterIndex >= 2 ? 'archive' : 'select')
        this.store.dispatch({ type: 'COMPLETE_TRANSITION' })
        break
      case 'open-archive':
        this.archiveOpen = true
        void this.audio.sting('archive')
        this.renderView(this.store.state)
        this.updateHud(this.store.state)
        break
      case 'close-archive':
        this.archiveOpen = false
        this.renderView(this.store.state)
        this.updateHud(this.store.state)
        break
      case 'reset-from-archive':
        this.resetDemo()
        break
      case 'scroll-discussion':
        this.view.querySelector('.discussion-card')?.scrollIntoView({ behavior: this.reducedMotion ? 'auto' : 'smooth', block: 'start' })
        break
      case 'open-presenter':
        this.openPresenter()
        break
      case 'close-presenter':
        this.closePresenter()
        break
      case 'mute':
        this.toggleMute()
        break
      case 'fullscreen':
        void this.toggleFullscreen()
        break
      case 'presenter-mode':
        this.store.dispatch({ type: 'SET_PRESENTER_MODE', enabled: !this.store.state.presenterMode })
        this.showToast(this.store.state.presenterMode ? 'Presenter mode on. Arrow-key jumps enabled.' : 'Presenter mode off. Chapter jumps locked.')
        requestAnimationFrame(() => {
          this.presenterLayer.querySelector<HTMLElement>('[data-action="presenter-mode"]')?.focus()
        })
        break
      case 'jump-chapter': {
        if (!this.store.state.presenterMode) return
        const index = Number(actionElement.dataset.index)
        if (!Number.isFinite(index)) return
        this.performJump(index)
        break
      }
      case 'show-finale':
        if (!this.store.state.presenterMode) return
        this.archiveOpen = false
        this.store.dispatch({ type: 'SHOW_FINALE' })
        this.showToast('Showing the historical archive only.')
        break
      case 'restart-scene':
        this.store.dispatch({ type: 'RESTART_SCENE' })
        this.showToast('Scene restarted at its current checkpoint.')
        break
      case 'rewind':
        this.store.dispatch({ type: 'REWIND_DIALOGUE' })
        break
      case 'skip-animation':
        this.skipFactory()
        break
      case 'reset-demo':
        this.resetDemo()
        break
      default:
        break
    }
  }

  private handleCanvasClick = (): void => {
    if (this.presenterOpen || this.dialogueLeaving) return
    if (!this.dialoguePanel.hidden) this.handleDialogueAction()
  }

  private handleInput = (event: Event): void => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (!target.matches('[data-volume]')) return
    const value = Number(target.value) / 100
    this.audio.setVolume(value)
    const label = document.getElementById('volume-value')
    if (label) label.textContent = `${Math.round(value * 100)}%`
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.disposed) return
    if (event.key === 'Escape') {
      if (this.presenterOpen) {
        event.preventDefault()
        this.closePresenter()
      } else if (this.archiveOpen) {
        event.preventDefault()
        this.archiveOpen = false
        this.renderView(this.store.state)
        this.updateHud(this.store.state)
      }
      return
    }
    if (this.presenterOpen) {
      if (event.key === 'Tab') {
        this.cyclePresenterFocus(event)
        return
      }
      return
    }
    if (event.defaultPrevented) return

    const target = event.target
    const inFormControl = target instanceof HTMLElement && Boolean(target.closest('button, a, input, select, textarea, [contenteditable="true"]'))
    const inEditable = target instanceof HTMLElement && Boolean(target.closest('input, select, textarea, [contenteditable="true"]'))
    const key = event.key.toLowerCase()

    if (key === 'p' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      this.openPresenter()
      return
    }
    if (key === 'm' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      this.toggleMute()
      return
    }
    if (key === 'f' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      void this.toggleFullscreen()
      return
    }

    if ((event.key === ' ' || event.key === 'Enter') && event.repeat) return
    if (!inFormControl && (event.key === ' ' || event.key === 'Enter')) {
      if (this.handlePrimaryKey()) {
        event.preventDefault()
      }
      return
    }

    if (event.repeat) return

    if (this.store.state.phase === 'voting') {
      if (key === '1' || key === '2' || key === '3') {
        event.preventDefault()
        const choice = (['A', 'B', 'C'] as const)[Number(key) - 1]
        if (choice) {
          if (this.store.state.selectedChoice !== choice) void this.audio.sting('select')
          this.store.dispatch({ type: 'SELECT_CHOICE', choice })
        }
        return
      }
      if (key === 'v') {
        event.preventDefault()
        if (this.store.state.selectedChoice) {
          void this.audio.sting('commit')
          this.store.dispatch({ type: 'COMMIT_CHOICE' })
        }
        return
      }
    }

    if (key === 's' && this.store.state.phase === 'factory') {
      event.preventDefault()
      this.skipFactory()
      return
    }

    if (key === 'r' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.shiftKey) {
        event.preventDefault()
        this.resetDemo()
      } else if (this.store.state.phase !== 'title') {
        event.preventDefault()
        this.store.dispatch({ type: 'RESTART_SCENE' })
        this.showToast('Scene restarted at its current checkpoint.')
      }
      return
    }

    if (this.store.state.presenterMode && !inEditable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      const current = this.store.state.phase === 'finale' ? 3 : this.store.state.chapterIndex
      const next = event.key === 'ArrowRight' ? Math.min(3, current + 1) : Math.max(0, current - 1)
      if (next !== current) this.performJump(next)
    }
  }

  private handlePrimaryKey(): boolean {
    const state = this.store.state
    if (state.phase === 'title') {
      void this.beginDemo()
      return true
    }
    if (!this.dialoguePanel.hidden && !this.dialogueLeaving) {
      this.handleDialogueAction()
      return true
    }
    if (state.phase === 'briefing') {
      this.store.dispatch({ type: 'BEGIN_CHAPTER' })
      return true
    }
    if (state.phase === 'voting' && !getActiveDecision(state)) {
      this.store.dispatch({ type: 'CONTINUE_TO_FACTORY' })
      return true
    }
    if (state.phase === 'factory' && state.factoryProgress === 'done') {
      this.store.dispatch({ type: 'LEAVE_FACTORY' })
      return true
    }
    if (state.phase === 'transition') {
      this.store.dispatch({ type: 'COMPLETE_TRANSITION' })
      return true
    }
    if (state.phase === 'finale' && !this.archiveOpen) {
      this.archiveOpen = true
      void this.audio.sting('archive')
      this.renderView(state)
      this.updateHud(state)
      return true
    }
    return false
  }

  private async beginDemo(): Promise<void> {
    if (this.starting) return
    if (this.store.state.phase !== 'title') return
    this.starting = true
    try {
      await this.audio.unlock()
      this.audio.setMuted(this.store.state.muted)
      await this.audio.sting('start')
      this.store.dispatch({ type: 'START' })
    } finally {
      this.starting = false
    }
  }

  private skipFactory(): void {
    if (this.store.state.phase !== 'factory') return
    if (this.scene) {
      this.scene.skipFactory()
    } else if (this.store.state.factoryProgress === 'idle') {
      this.store.dispatch({ type: 'FACTORY_STARTED' })
    }
    if (this.store.state.factoryProgress === 'running') {
      this.store.dispatch({ type: 'FACTORY_FINISHED' })
    }
  }

  private performJump(index: number): void {
    const state = this.store.state
    const decisionsByChapter = [['d1'], ['d2'], ['d3', 'd4']] as const
    let cleared = 0
    if (index < 3) {
      for (let chapter = index; chapter < decisionsByChapter.length; chapter += 1) {
        for (const decision of decisionsByChapter[chapter] ?? []) {
          if (state.choices[decision]) cleared += 1
        }
      }
    }
    this.archiveOpen = false
    this.store.dispatch({ type: 'JUMP_CHAPTER', chapterIndex: index })
    if (index >= 3) {
      this.showToast('Jumped to the sealed archive.')
    } else if (cleared > 0) {
      this.showToast(`Jumped to Chapter ${index + 1}. Cleared ${cleared} vote${cleared === 1 ? '' : 's'} from this chapter onward.`)
    } else {
      this.showToast(`Jumped to Chapter ${index + 1}.`)
    }
  }

  private resetDemo(): void {
    const confirmed = window.confirm('Reset the entire demo? This clears every board vote and returns to the title screen.')
    if (!confirmed) return
    this.archiveOpen = false
    this.factoryRunKey = ''
    this.dialogueKey = ''
    this.stopTyping()
    this.presenterOpen = false
    this.setPresenterBackgroundInert(false)
    this.renderPresenter(this.store.state)
    this.store.reset()
    this.scene?.showBoardroom()
    this.showToast('Demo reset. All votes cleared.')
  }

  private toggleMute(): void {
    const muted = !this.store.state.muted
    this.audio.setMuted(muted)
    this.store.dispatch({ type: 'SET_MUTED', muted })
    this.showToast(muted ? 'Sound muted.' : 'Sound on.')
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      this.showToast('Fullscreen was blocked by the browser. Cmd/Ctrl + F still works.', 5000)
    }
  }

  private handleFullscreenChange = (): void => {
    this.updateHud(this.store.state)
    this.renderPresenter(this.store.state)
    const active = Boolean(document.fullscreenElement)
    this.fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen')
  }

  private openPresenter(): void {
    if (this.presenterOpen) return
    this.presenterOpen = true
    this.setPresenterBackgroundInert(true)
    this.updateHud(this.store.state)
    this.renderPresenter(this.store.state)
    requestAnimationFrame(() => {
      this.presenterLayer.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    })
  }

  private closePresenter(): void {
    if (!this.presenterOpen) return
    this.presenterOpen = false
    this.setPresenterBackgroundInert(false)
    this.renderPresenter(this.store.state)
    this.updateHud(this.store.state)
    requestAnimationFrame(() => this.presenterButton.focus())
  }

  private setPresenterBackgroundInert(inert: boolean): void {
    for (const child of Array.from(this.root.children)) {
      if (child === this.presenterLayer) continue
      if (inert) child.setAttribute('inert', '')
      else child.removeAttribute('inert')
    }
    const canvas = document.getElementById('scene')
    if (canvas) {
      if (inert) canvas.setAttribute('inert', '')
      else canvas.removeAttribute('inert')
    }
  }

  private cyclePresenterFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.presenterLayer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null)
    if (focusable.length === 0) return
    event.preventDefault()
    const current = document.activeElement
    const index = focusable.indexOf(current as HTMLElement)
    const nextIndex = event.shiftKey
      ? (index <= 0 ? focusable.length - 1 : index - 1)
      : (index === -1 || index === focusable.length - 1 ? 0 : index + 1)
    focusable[nextIndex]?.focus()
  }

  private showToast(message: string, duration = 3200): void {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)
    this.toast.textContent = message
    this.toast.classList.add('is-visible')
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('is-visible')
      this.toastTimer = null
    }, duration)
  }

  private announce(message: string): void {
    this.liveRegion.textContent = ''
    window.setTimeout(() => {
      this.liveRegion.textContent = message
    }, 30)
  }

  dispose(): void {
    this.disposed = true
    this.unsubscribe()
    this.stopTyping()
    if (this.dialogueLeaveTimer !== null) window.clearTimeout(this.dialogueLeaveTimer)
    this.dialogueLeaveTimer = null
    this.dialogueLeaving = false
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)
    this.root.removeEventListener('click', this.handleClick)
    this.root.removeEventListener('input', this.handleInput)
    window.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    document.getElementById('scene')?.removeEventListener('click', this.handleCanvasClick)
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function productSilhouette(id: string): string {
  if (id === 'wii') {
    return `<span class="sil-wii-body"></span><span class="sil-wii-stand"></span><span class="sil-wii-slot"></span>`
  }
  if (id === 'wii-u') {
    return `<span class="sil-wiiu-console"></span><span class="sil-wiiu-gamepad"><span></span></span>`
  }
  return `<span class="sil-switch-console"><span></span></span><span class="sil-joycon sil-left"></span><span class="sil-joycon sil-right"></span>`
}
