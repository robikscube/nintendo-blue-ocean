import {
  DIALOGUE_ART_HEIGHT,
  DIALOGUE_ART_WIDTH,
  NAME_TAG_PATH,
} from '../dialogue-art'

/**
 * Static shell for the approved image-backed dialogue bubble. The reveal
 * timing, speaker fill switch, and advance behaviour stay in UI.
 *
 * Contract: UI resolves #dialogue-panel, #dialogue-art, #speaker-name,
 * #dialogue-text, #dialogue-accessible and #dialogue-continue by ID. The
 * speaker cue is painted by .name-tag-tint and keyed by data-speaker.
 */
export function renderDialoguePanel(): string {
  return `
    <section class="dialogue-panel" id="dialogue-panel" aria-label="Dialogue" aria-busy="false" data-speaker="narrator" hidden>
      <img
        class="dialogue-art"
        id="dialogue-art"
        src="${import.meta.env.BASE_URL}assets/ui/dialogue-bubble.png"
        width="${DIALOGUE_ART_WIDTH}"
        height="${DIALOGUE_ART_HEIGHT}"
        alt=""
        aria-hidden="true"
        draggable="false"
        decoding="async"
      />
      <svg
        class="name-tag-tint"
        viewBox="0 0 ${DIALOGUE_ART_WIDTH} ${DIALOGUE_ART_HEIGHT}"
        aria-hidden="true"
        focusable="false"
      >
        <path d="${NAME_TAG_PATH}" />
      </svg>
      <span class="name-live" aria-hidden="true">
        <span class="speaker-name" id="speaker-name">Hootley</span>
      </span>
      <div class="dialogue-copy">
        <p class="dialogue-text" id="dialogue-text" aria-hidden="true"></p>
        <span class="sr-only" id="dialogue-accessible" role="status" aria-live="polite" aria-atomic="true"></span>
      </div>
      <span class="continue-pulse" aria-hidden="true"></span>
      <button class="dialogue-continue" id="dialogue-continue" type="button" aria-label="Continue to the next line" aria-keyshortcuts="Enter Space"></button>
    </section>
  `
}
