import { MUSIC_CREDIT } from '../../audio/music'
import { escapeHtml } from './shared'

/** Approved title badge: 1672 × 941 RGBA. Do not alter or replace the file. */
const TITLE_ART_WIDTH = 1672
const TITLE_ART_HEIGHT = 941

/**
 * Welcome screen. Composition follows the approved Animal Crossing-inspired
 * reference: the wooden title badge sits high and centered, one Start action
 * sits low and centered, and the music credit stays quietly bottom-left.
 * All welcome-stage copy beyond those pieces is intentionally removed.
 */
export function renderTitleScreen(): string {
  return `
    <section class="screen title-screen" aria-labelledby="title-heading">
      <h1 id="title-heading" class="sr-only">Nintendo: The Next Blue Ocean</h1>
      <img
        id="title-art"
        class="title-art"
        src="${import.meta.env.BASE_URL}assets/ui/the_next_blue_ocean_badge.png"
        width="${TITLE_ART_WIDTH}"
        height="${TITLE_ART_HEIGHT}"
        alt="The Next Blue Ocean — Nintendo"
        draggable="false"
      />
      <button class="primary-button large start-button" type="button" data-action="start">Start</button>
      <p class="title-credit">Music: <a href="${escapeHtml(MUSIC_CREDIT.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(MUSIC_CREDIT.artist)}</a> · <a href="${escapeHtml(MUSIC_CREDIT.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(MUSIC_CREDIT.license)}</a></p>
    </section>
  `
}
