import { describe, expect, it } from 'vitest'
import {
  ACTUAL_HISTORY,
  CHAPTERS,
  CHARACTERS,
  DECISIONS,
  DISCUSSION_FOLLOWUP,
  DISCUSSION_QUESTION,
  FINAL_CAVEAT,
  FINALE_INTRO,
  OPENING_LINES,
  SALES_AS_OF,
  SIMULATED_LABEL,
  getBossLines,
  getFeedbackLines,
} from '../src/core/story'
import type { DialogueLine } from '../src/core/types'

function allPreFinaleText(): string {
  const data = {
    characters: CHARACTERS,
    chapters: CHAPTERS,
    decisions: DECISIONS,
    opening: OPENING_LINES,
    sealedFinale: FINALE_INTRO,
    generatedDialogue: collectDialogueLines(),
    caveat: FINAL_CAVEAT,
    discussion: DISCUSSION_QUESTION,
  }
  return JSON.stringify(data)
}

function collectDialogueLines(): DialogueLine[] {
  const lines: DialogueLine[] = [...OPENING_LINES]
  for (const [chapterIndex, chapter] of CHAPTERS.entries()) {
    lines.push(...chapter.advisorLines)
    for (const decision of chapter.decisions) {
      for (const option of DECISIONS[decision].options) {
        lines.push(option.feedback, { speaker: 'shell', text: option.boss })
      }
    }
    // Presenter jumps and partial checkpoints also have authored fallback lines.
    lines.push(...getBossLines(chapterIndex, {}))
  }
  for (const d1 of ['A', 'B', 'C'] as const) {
    lines.push(...getFeedbackLines(0, { d1 }), ...getBossLines(0, { d1 }))
  }
  for (const d2 of ['A', 'B', 'C'] as const) {
    lines.push(...getFeedbackLines(1, { d2 }), ...getBossLines(1, { d2 }))
  }
  for (const d3 of ['A', 'B', 'C'] as const) {
    for (const d4 of ['A', 'B', 'C'] as const) {
      lines.push(...getFeedbackLines(2, { d3, d4 }), ...getBossLines(2, { d3, d4 }))
    }
  }
  return lines
}

describe('story contract', () => {
  it('has three chapters, four decisions, and exactly three choices each', () => {
    expect(CHAPTERS).toHaveLength(3)
    expect(CHAPTERS.map((chapter) => chapter.year)).toEqual([2005, 2011, 2016])
    expect(CHAPTERS.flatMap((chapter) => chapter.decisions)).toEqual(['d1', 'd2', 'd3', 'd4'])
    for (const decision of Object.values(DECISIONS)) {
      expect(decision.options).toHaveLength(3)
      expect(decision.options.map((option) => option.id)).toEqual(['A', 'B', 'C'])
      expect(new Set(decision.options.map((option) => option.title)).size).toBe(3)
    }
  })

  it('keeps all dialogue lines concise and assigned to an original character', () => {
    const lines = collectDialogueLines()
    expect(lines.length).toBeGreaterThan(10)
    for (const line of lines) {
      expect(line.text.trim().length).toBeGreaterThan(10)
      expect(line.text.split(/\s+/).length, line.text).toBeGreaterThanOrEqual(10)
      expect(line.text.split(/\s+/).length, line.text).toBeLessThanOrEqual(28)
      expect(CHARACTERS[line.speaker]).toBeDefined()
    }
  })

  it('labels audience prototypes exactly', () => {
    expect(SIMULATED_LABEL).toBe('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')
  })

  it('uses exactly the documented, cited sales figures and date', () => {
    expect(SALES_AS_OF).toBe('As of June 30, 2026')
    expect(ACTUAL_HISTORY.map((product) => [product.name, product.units])).toEqual([
      ['Wii', '101.63 million'],
      ['Wii U', '13.56 million'],
      ['Original Nintendo Switch', '156.59 million'],
    ])
    expect(ACTUAL_HISTORY.map((product) => product.launchYear)).toEqual([2006, 2012, 2017])
  })

  it('does not leak historical product names, launch years, or sales before the finale', () => {
    const text = allPreFinaleText()
    for (const forbidden of [
      'Wii U',
      'Wii',
      'Nintendo Switch',
      'Joy-Con',
      'GamePad',
      '101.63',
      '13.56',
      '156.59',
      '2006',
      '2012',
      '2017',
    ]) {
      expect(text, `pre-finale content leaked: ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('never presents a vote as a pass/fail question', () => {
    const text = allPreFinaleText().toLowerCase()
    expect(text).not.toContain('correct answer')
    expect(text).not.toContain('you win')
    expect(text).not.toContain('market share')
    expect(text).not.toContain('success probability')
  })

  it('states the limits of the historical evidence', () => {
    expect(FINAL_CAVEAT).toContain('not unique players')
    expect(FINAL_CAVEAT).toContain('proof of causal strategy')
    expect(FINAL_CAVEAT).toContain('fictional teaching simulations')
    expect(DISCUSSION_QUESTION).toContain('building a better machine')
    expect(DISCUSSION_FOLLOWUP).toContain('Why didn’t its first success automatically guarantee the next?')
  })

  it('does not repeat the Chapter 3 synthesis line in the boss phase', () => {
    for (const d3 of ['A', 'B', 'C'] as const) {
      for (const d4 of ['A', 'B', 'C'] as const) {
        const feedback = getFeedbackLines(2, { d3, d4 }).map((line) => line.text)
        const boss = getBossLines(2, { d3, d4 }).map((line) => line.text)
        const overlap = feedback.filter((text) => boss.includes(text))
        expect(overlap, `duplicate line for ${d3}${d4}`).toEqual([])
        expect(boss.length).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
