import type { GameState } from '../../core/types'
import { CHAPTERS } from '../../core/story'
import { MUSIC_CREDIT } from '../../audio/music'
import { escapeHtml, musicCreditTitles } from './shared'

export interface PresenterDrawerOptions {
  volume: number
  musicVolume: number
  archiveOpen: boolean
  presenterOpen: boolean
}

/** Markup for the presenter drawer. Focus trap/inert/state stay in UI. */
export function renderPresenterDrawer(state: GameState, opts: PresenterDrawerOptions): string {
  const canJump = state.presenterMode
  const chapter = CHAPTERS[state.chapterIndex]
  const location = state.phase === 'title'
    ? 'Title screen'
    : state.chapterIndex >= 3
      ? 'Grand finale'
      : `Chapter ${chapter?.number ?? 1} · ${state.phase === 'voting' ? 'voting' : state.phase}`
  const dialogueIndex = state.phase === 'opening' || state.phase === 'advisors' || state.phase === 'feedback' || state.phase === 'boss'
    ? state.dialogueIndex
    : 0
  const volume = Math.round(opts.volume * 100)
  const musicVolume = Math.round(opts.musicVolume * 100)

  return `
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
          <span>Nintendo’s real choices</span>
          <strong>${state.phase === 'finale' && opts.archiveOpen ? 'OPEN' : 'SEALED'}</strong>
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
            <strong>The big reveal</strong>
          </button>
        </div>
        <p class="drawer-hint">A jump re-opens that chapter and clears its votes and later ones. Chapters you skip are shown as “Not voted” in the final comparison.</p>
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
          <span>Volume <small id="volume-value">${volume}%</small></span>
          <input id="volume" data-volume type="range" min="0" max="100" step="1" value="${volume}" />
        </label>
        <label class="volume-row" for="music-volume">
          <span>Music <small id="music-volume-value">${musicVolume}%</small></span>
          <input id="music-volume" data-music-volume type="range" min="0" max="100" step="1" value="${musicVolume}" />
        </label>
        <p class="drawer-hint">Babble and cues are original synthesis. Music: <a href="${escapeHtml(MUSIC_CREDIT.sourceUrl)}" target="_blank" rel="noopener noreferrer">${musicCreditTitles()} by ${escapeHtml(MUSIC_CREDIT.artist)}</a> · <a href="${escapeHtml(MUSIC_CREDIT.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(MUSIC_CREDIT.license)}</a>. Sound stays off until the first user gesture.</p>
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
