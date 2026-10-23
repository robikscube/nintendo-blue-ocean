import type { GameState } from '../../core/types'
import {
  ACTUAL_HISTORY,
  DECISION_ORDER,
  DISCUSSION_QUESTION,
  FINAL_CAVEAT,
  FINALE_INTRO,
  INTERPRETIVE_SOURCES,
  SALES_AS_OF,
  SALES_SOURCE,
  SOURCE_NOTE,
  getDecisionLabel,
  getOption,
} from '../../core/story'
import { MUSIC_CREDIT } from '../../audio/music'
import { escapeHtml, musicCreditTitles, productSilhouette } from './shared'
import { museumSpecs } from '../../scene/museum-exhibit'

export function renderMuseumTourScreen(state: GameState): string {
  return `<section class="screen museum-tour" aria-labelledby="museum-heading">
    <div class="museum-tour-heading"><span class="eyebrow">MADE BY YOUR BOARD</span>
      <h2 id="museum-heading">Look what you built.</h2></div>
    <button class="secondary-button museum-skip" type="button" data-action="skip-museum">Skip tour <span aria-hidden="true">↗</span></button>
    <div class="museum-captions" role="list" aria-label="Your three console concepts">
      ${museumSpecs(state.choices).map((spec, index) => `<div role="listitem"><span>CONCEPT ${index + 1}</span><strong>${escapeHtml(spec?.title ?? 'No concept built')}</strong></div>`).join('')}
    </div>
    <p class="museum-simulation">SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT</p>
  </section>`
}

const CONSOLE_PHOTOS: Record<string, { file: string; width: number; height: number; alt: string }> = {
  wii: { file: 'Wii-Console.png', width: 1280, height: 1280, alt: 'White Wii console with its stand and Wii Remote' },
  'wii-u': { file: 'Wii_U_Console_and_Gamepad.png', width: 1920, height: 927, alt: 'White Wii U console and touchscreen GamePad' },
  switch: { file: 'Nintendo-Switch-wJoyCons-BlRd-Standing-FL.png', width: 1920, height: 1060, alt: 'Nintendo Switch with blue and red Joy-Con controllers' },
}

export function renderFinaleIntroScreen(museum = false): string {
  return `
    <section class="screen finale-intro${museum ? ' museum-reveal' : ''}" aria-labelledby="finale-heading">
      <span class="eyebrow">${escapeHtml(FINALE_INTRO.eyebrow)}</span>
      <h2 id="finale-heading">${escapeHtml(FINALE_INTRO.title)}</h2>
      <p class="lead">${escapeHtml(FINALE_INTRO.lead)}</p>
      <button class="primary-button large" type="button" data-action="open-archive">
        Reveal the consoles <span aria-hidden="true">▸</span>
      </button>
      ${museum ? '<button class="museum-replay" type="button" data-action="replay-museum">Take another look around</button>' : ''}
    </section>
  `
}

export function renderArchiveScreen(state: GameState): string {
  return `
    <section class="screen archive-screen" aria-labelledby="archive-heading">
      <header class="archive-header">
        <div>
          <span class="eyebrow">FINAL REPORT · HISTORY VS. HYPOTHESIS</span>
          <h2 id="archive-heading">The historical record</h2>
        </div>
        <div class="archive-stamp">
          <span>OFFICIAL FIGURES</span>
          <strong>${escapeHtml(SALES_AS_OF)}</strong>
          <button class="archive-jump" type="button" data-action="scroll-discussion">Evidence &amp; discussion ↓</button>
        </div>
      </header>

      <div class="class-path" aria-label="Your board’s choices">
        <span class="mini-label">YOUR BOARD’S CHOICES</span>
        <div role="list" aria-label="Four board decisions">
          ${DECISION_ORDER.map((decision) => {
            const option = getOption(decision, state.choices[decision])
            return `
            <span class="path-chip${option ? ' has-detail' : ''}" role="listitem">
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
          const photo = CONSOLE_PHOTOS[product.id]
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
              <div class="product-silhouette${photo ? ' product-photo' : ` silhouette-${escapeHtml(product.id)}`}"${photo ? '' : ' aria-hidden="true"'}>
                ${photo ? `<img class="console-photo" src="${import.meta.env.BASE_URL}assets/ui/${escapeHtml(photo.file)}" alt="${escapeHtml(photo.alt)}" width="${photo.width}" height="${photo.height}" decoding="async">` : productSilhouette(product.id)}
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

      <section class="discussion-card" aria-labelledby="discussion-heading">
        <h3 id="discussion-heading">${escapeHtml(DISCUSSION_QUESTION)}</h3>
        <div class="discussion-actions">
          <button class="primary-button" type="button" data-action="reset-from-archive">Run the case again</button>
          <button class="secondary-button" type="button" data-action="close-archive">Back to the finale</button>
        </div>
      </section>

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
          <p class="source-date">Music: <a href="${escapeHtml(MUSIC_CREDIT.sourceUrl)}" target="_blank" rel="noopener noreferrer">${musicCreditTitles()} by ${escapeHtml(MUSIC_CREDIT.artist)}</a> from <em>${escapeHtml(MUSIC_CREDIT.album)}</em>, used under <a href="${escapeHtml(MUSIC_CREDIT.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(MUSIC_CREDIT.license)}</a> (looped, attenuated under dialogue).</p>
        </div>
      </section>
    </section>
  `
}
