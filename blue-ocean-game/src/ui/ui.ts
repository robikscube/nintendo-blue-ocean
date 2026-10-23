import type {
  ChoiceId,
  DialogueLine,
  GameState,
} from '../core/types'
import {
  CHAPTERS,
  CHARACTERS,
  DECISION_ORDER,
  DECISIONS,
} from '../core/story'
import {
  getActiveDecision,
  getCurrentLine,
} from '../core/state'
import type { GameStore } from '../core/store'
import { buildPrototypeSpec } from '../scene/prototype-model'
import type { SceneDirector } from '../scene/scene-director'
import type { AudioEngine } from '../audio/audio'
import { musicModeForPhase } from '../audio/music'
import {
  buildSpeechTimeline,
  revealedCharacterCount,
  selectAudibleSyllables,
} from '../audio/speech-timeline'
import { getVoiceProfile } from '../audio/voice-profiles'
import { renderTitleScreen } from './screens/title'
import { renderDialoguePanel } from './screens/dialogue-panel'
import { renderBriefingScreen } from './screens/briefing'
import { renderVotingScreen } from './screens/voting'
import { renderFactoryScreen } from './screens/factory'
import { renderTransitionScreen } from './screens/transition'
import { renderFinaleIntroScreen, renderArchiveScreen, renderMuseumTourScreen } from './screens/finale'
import { renderPresenterDrawer } from './screens/presenter'
import { escapeHtml } from './screens/shared'

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
  finale: 'THE GRAND FINALE',
}

/**
 * Reveal pacing. Text and synthesized vowels share one clock: the natural
 * 62 ms-per-character pace runs at 2× at the presenter's request. The text is
 * accelerated with the voice so the mumble can never run ahead of the visible
 * line. Clicking while it types still completes it instantly.
 */
const DIALOGUE_SPEED_MULTIPLIER = 2
const SPEECH_BASE_INTERVAL_MS = 62 / DIALOGUE_SPEED_MULTIPLIER
// Wall-clock safety net for throttled animation frames. It is deliberately
// generous so it never cuts off a normally-paced line.
const REVEAL_DEADLINE_GRACE_MS = 400
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
      scene.onMuseumReady = () => {
        if (!this.disposed && this.store.state.phase === 'finale') this.renderView(this.store.state)
      }
      scene.onContextLost = () => {
        this.root.classList.add('no-webgl')
        this.fallbackNote.hidden = false
        scene.skipMuseumTour()
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
        <div class="hud-current sr-only">
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
          <button class="hud-button icon-button presenter-button" id="presenter-button" type="button" data-action="open-presenter" title="Presenter settings (P)" aria-label="Presenter settings">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.2 13.2a7.7 7.7 0 0 0 .06-1.2 7.7 7.7 0 0 0-.06-1.2l2.02-1.57-1.9-3.28-2.4.98a7.5 7.5 0 0 0-2.08-1.2L14.5 3.2h-3.8l-.34 2.53a7.5 7.5 0 0 0-2.08 1.2l-2.4-.98-1.9 3.28L6 10.8a7.7 7.7 0 0 0 0 2.4L3.98 14.77l1.9 3.28 2.4-.98a7.5 7.5 0 0 0 2.08 1.2l.34 2.53h3.8l.34-2.53a7.5 7.5 0 0 0 2.08-1.2l2.4.98 1.9-3.28-2.02-1.57z" />
            </svg>
          </button>
        </div>
      </header>

      <div class="scene-vignette" aria-hidden="true"></div>
      <section id="view" class="view" aria-label="Presentation content"></section>

      ${renderDialoguePanel()}

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
    this.audio.setMusicMode(musicModeForPhase(state.phase))
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
      this.chapterLabel.textContent = 'THE GRAND FINALE'
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
    const touring = state.phase === 'finale' && Boolean(this.scene && !this.scene.museumTourReady)
    this.root.dataset.finaleStage = this.archiveOpen ? 'facts' : touring ? 'tour' : 'prompt'
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
      touring ? 'museum-tour' : 'museum-ready',
      state.started ? 'started' : 'title',
    ].join('|')

    if (signature === this.viewSignature) {
      this.updateHud(state)
      return
    }
    this.viewSignature = signature

    switch (state.phase) {
      case 'title':
        content = renderTitleScreen()
        break
      case 'briefing':
        content = renderBriefingScreen(state)
        break
      case 'voting':
        content = renderVotingScreen(state)
        break
      case 'factory':
        content = renderFactoryScreen(state, factorySpec)
        break
      case 'transition':
        content = renderTransitionScreen(state)
        break
      case 'finale':
        content = this.archiveOpen ? renderArchiveScreen(state) : touring ? renderMuseumTourScreen(state) : renderFinaleIntroScreen(Boolean(this.scene))
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
      this.announce('Nintendo’s real consoles are revealed. Sales figures and sources are now displayed.')
    } else if (content) {
      this.announce(this.view.querySelector('h1, h2')?.textContent ?? PHASE_LABELS[state.phase])
    }
  }

  private renderDialogue(state: GameState): void {
    const line = getCurrentLine(state)
    if (!line) {
      this.hideDialogue()
      return
    }

    this.showDialogue()
    const profile = CHARACTERS[line.speaker]
    // Speaker colour is presentation-only. The canonical CharacterProfile
    // colours continue to drive the 3D materials and voice timbres.
    this.dialoguePanel.dataset.speaker = line.speaker
    this.dialoguePanel.setAttribute('aria-label', `${profile.name} dialogue`)
    this.speakerName.textContent = profile.name

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

    // One shared natural-speaking clock drives both the typewriter and the
    // vowel events, so a vowel can never speak before its character is visible.
    // Punctuation pauses and the speaker's speed multiplier produce the pace.
    const timeline = buildSpeechTimeline(line.text, getVoiceProfile(line.speaker), {
      baseIntervalMs: SPEECH_BASE_INTERVAL_MS,
    })
    const audibleSyllables = selectAudibleSyllables(timeline.syllables)

    this.typing = true
    this.dialoguePanel.setAttribute('aria-busy', 'true')
    this.dialoguePanel.classList.add('is-typing')
    this.audio.beginSpeech(line.speaker)

    let shown = 0
    let nextSyllable = 0
    const startedAt = performance.now()
    const revealDuration = timeline.totalDurationMs

    const tick = (now: number): void => {
      this.revealFrame = null
      if (!this.typing || this.disposed) return
      const elapsed = now - startedAt
      const nextShown = revealedCharacterCount(timeline, elapsed)
      if (nextShown !== shown) {
        shown = nextShown
        this.dialogueText.textContent = this.fullLine.slice(0, shown)
      }

      // One note per vowel-cluster onset. If a throttled frame skips ahead,
      // consume the due events rather than letting the audio lag behind.
      while (nextSyllable < audibleSyllables.length) {
        const syllable = audibleSyllables[nextSyllable]
        if (!syllable || syllable.atMs > elapsed) break
        if (shown > syllable.charIndex) this.audio.triggerSpeech(syllable)
        nextSyllable += 1
      }

      if (elapsed >= revealDuration) {
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
    }, timeline.totalDurationMs + REVEAL_DEADLINE_GRACE_MS)
  }

  private completeLine(interruptAudio = false): void {
    const wasTyping = this.typing
    this.clearRevealTimers()
    this.typing = false
    this.dialogueText.textContent = this.fullLine
    this.dialoguePanel.classList.remove('is-typing')
    this.dialoguePanel.classList.add('is-complete')
    this.dialoguePanel.setAttribute('aria-busy', 'false')
    if (interruptAudio) this.audio.stopSpeech()
    else if (wasTyping) this.audio.finishSpeech()
  }

  private stopTyping(): void {
    this.clearRevealTimers()
    this.typing = false
    this.audio.stopSpeech()
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
    if (document.hidden && this.typing) this.completeLine(true)
    this.audio.setMusicSuspended(document.hidden)
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
    this.dialoguePanel.classList.remove('is-complete', 'is-typing')
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
      this.completeLine(true)
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

    this.presenterLayer.innerHTML = renderPresenterDrawer(state, {
      volume: this.audio.getVolume(),
      musicVolume: this.audio.getMusicVolume(),
      archiveOpen: this.archiveOpen,
      presenterOpen: this.presenterOpen,
    })
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
    // HUD controls contain SVG icons; SVGElement is not an HTMLElement, so a
    // click on the gear/mute/fullscreen glyph must still reach its button.
    if (!(target instanceof Element)) return

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
        // The factory card itself now shows the assembly stage. Avoid a
        // redundant toast obscuring the moving 3D parts on replay.
        break
      case 'continue-factory':
        this.store.dispatch({ type: 'CONTINUE_TO_FACTORY' })
        break
      case 'transition-next':
        void this.audio.sting(this.store.state.chapterIndex >= 2 ? 'archive' : 'select')
        this.store.dispatch({ type: 'COMPLETE_TRANSITION' })
        break
      case 'open-archive':
        if (this.scene && !this.scene.museumTourReady) {
          this.scene.skipMuseumTour()
          break
        }
        this.archiveOpen = true
        void this.audio.sting('archive')
        this.renderView(this.store.state)
        this.updateHud(this.store.state)
        break
      case 'skip-museum':
        this.scene?.skipMuseumTour()
        break
      case 'replay-museum':
        this.scene?.replayMuseumTour()
        this.renderView(this.store.state)
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
        // Instant jump. Smooth scrolling is driven by animation frames, which
        // software WebGL can starve on classroom laptops; the evidence jump
        // must always land even when the 3D preview is using the frame budget.
        this.view.querySelector('.discussion-card')?.scrollIntoView({ behavior: 'auto', block: 'start' })
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
        this.showToast('Showing the grand finale only.')
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
    if (target.matches('[data-music-volume]')) {
      const value = Number(target.value) / 100
      this.audio.setMusicVolume(value)
      const label = document.getElementById('music-volume-value')
      if (label) label.textContent = `${Math.round(value * 100)}%`
      return
    }
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
    if (key === 's' && this.store.state.phase === 'finale' && !this.archiveOpen) {
      event.preventDefault()
      this.scene?.skipMuseumTour()
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
      if (this.scene && !this.scene.museumTourReady) {
        this.scene.skipMuseumTour()
        return true
      }
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
      this.showToast('Jumped to the grand finale.')
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
    if (this.scene) this.scene.onMuseumReady = null
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
