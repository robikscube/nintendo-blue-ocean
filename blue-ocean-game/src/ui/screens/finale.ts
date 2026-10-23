import type { GameState } from '../../core/types'
import {
  ACTUAL_HISTORY,
  DECISION_ORDER,
  DISCUSSION_FOLLOWUP,
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

export function renderFinaleIntroScreen(): string {
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

export function renderArchiveScreen(state: GameState): string {
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
          <p class="source-date">Music: <a href="${escapeHtml(MUSIC_CREDIT.sourceUrl)}" target="_blank" rel="noopener noreferrer">${musicCreditTitles()} by ${escapeHtml(MUSIC_CREDIT.artist)}</a> from <em>${escapeHtml(MUSIC_CREDIT.album)}</em>, used under <a href="${escapeHtml(MUSIC_CREDIT.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(MUSIC_CREDIT.license)}</a> (looped, attenuated under dialogue).</p>
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
