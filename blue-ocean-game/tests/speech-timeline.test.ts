import { describe, expect, it } from 'vitest'
import {
  buildSpeechTimeline,
  ELLIPSIS_INTERVAL_MS,
  PRESENTATION_MIN_SYLLABLE_GAP_MS,
  revealedCharacterCount,
  selectAudibleSyllables,
} from '../src/audio/speech-timeline'
import { VOICE_PROFILES } from '../src/audio/voice-profiles'

describe('speech timeline', () => {
  it('gates notes only at the start of a vowel cluster', () => {
    const timeline = buildSpeechTimeline('Mama made a map.', VOICE_PROFILES.pip)
    expect(timeline.syllables.map((syllable) => syllable.vowel)).toEqual(['A', 'A', 'A', 'E', 'A', 'A'])
    expect(timeline.syllables.map((syllable) => syllable.charIndex)).toEqual([1, 3, 6, 8, 10, 13])
    for (let index = 0; index < timeline.syllables.length; index += 1) {
      const charIndex = timeline.syllables[index]?.charIndex ?? -1
      expect('aeiouAEIOU').toContain(timeline.text[charIndex] ?? '')
      expect(index === 0 || !'aeiouAEIOU'.includes(timeline.text[charIndex - 1] ?? '')).toBe(true)
    }
  })

  it('does not emit notes for consonants or a narrator-style silent string', () => {
    expect(buildSpeechTimeline('Hmm, psst — brr.', VOICE_PROFILES.grumble).syllables).toHaveLength(0)
    expect(buildSpeechTimeline('', VOICE_PROFILES.shell).syllables).toHaveLength(0)
  })

  it('slows after commas and sentence ends relative to ordinary letters', () => {
    const timeline = buildSpeechTimeline('A, b. C', VOICE_PROFILES.pip)
    const comma = timeline.boundaries.find((boundary) => boundary.kind === 'comma')
    const sentence = timeline.boundaries.find((boundary) => boundary.kind === 'sentence')
    expect(comma).toBeDefined()
    expect(sentence).toBeDefined()

    const commaIndex = comma?.charIndex ?? -1
    const commaToNext = (timeline.revealAtMs[commaIndex + 1] ?? 0) - (timeline.revealAtMs[commaIndex] ?? 0)
    const letterToNext = (timeline.revealAtMs[1] ?? 0) - (timeline.revealAtMs[0] ?? 0)
    expect(commaToNext).toBeGreaterThan(letterToNext * 2.5)

    const sentenceIndex = sentence?.charIndex ?? -1
    const sentenceToNext = (timeline.revealAtMs[sentenceIndex + 1] ?? 0) - (timeline.revealAtMs[sentenceIndex] ?? 0)
    expect(sentenceToNext).toBeGreaterThan(commaToNext)
  })

  it('applies one extended ellipsis pause, not one per dot', () => {
    const timeline = buildSpeechTimeline('Wait... now', VOICE_PROFILES.mori)
    const ellipses = timeline.boundaries.filter((boundary) => boundary.kind === 'ellipsis')
    expect(ellipses).toHaveLength(1)
    expect(ellipses[0]?.charIndex).toBe(6)
    expect(ellipses[0]?.silenceAfterMs).toBeGreaterThanOrEqual(Math.round(ELLIPSIS_INTERVAL_MS / 2))
    const before = timeline.revealAtMs[6] ?? 0
    const after = timeline.revealAtMs[7] ?? 0
    expect(after - before).toBeGreaterThan(150)
  })

  it('bends the final syllable of a question upward', () => {
    const timeline = buildSpeechTimeline('Are you sure?', VOICE_PROFILES.pip)
    const last = timeline.syllables[timeline.syllables.length - 1]
    expect(last?.pitchBend).toBeGreaterThan(1)
    expect(timeline.boundaries.some((boundary) => boundary.kind === 'question')).toBe(true)
  })

  it('lifts all-caps and exclamatory speech', () => {
    const timeline = buildSpeechTimeline('GO now!', VOICE_PROFILES.pip)
    const go = timeline.syllables.find((syllable) => syllable.charIndex === 1)
    const now = timeline.syllables.find((syllable) => syllable.charIndex === 4)
    expect(go).toBeDefined()
    expect(now).toBeDefined()
    expect(go?.pitchScale ?? 0).toBeGreaterThan(1.3)
    expect(go?.gainScale ?? 0).toBeGreaterThan(1.2)
    expect(now?.pitchScale ?? 0).toBeGreaterThan(1.1)
  })

  it('preserves punctuation relationships when compressed to the presentation cap', () => {
    const timeline = buildSpeechTimeline('This is a longer teaching line, with a pause.', VOICE_PROFILES.shell, {
      targetDurationMs: 500,
    })
    expect(timeline.compressed).toBe(true)
    expect(timeline.totalDurationMs).toBe(500)
    expect(timeline.revealAtMs[timeline.revealAtMs.length - 1]).toBeLessThanOrEqual(500)
    expect(revealedCharacterCount(timeline, 0)).toBe(1)
    expect(revealedCharacterCount(timeline, 500)).toBe(timeline.text.length)
    expect(revealedCharacterCount(timeline, 250)).toBeGreaterThan(1)
  })

  it('thins a compressed presentation line to a comfortable note rate', () => {
    const text = 'One two three four five six seven eight nine ten eleven twelve thirteen.'
    const timeline = buildSpeechTimeline(text, VOICE_PROFILES.pip, { targetDurationMs: 900 })
    const audible = selectAudibleSyllables(timeline.syllables)
    expect(audible.length).toBeGreaterThan(0)
    expect(audible.length).toBeLessThanOrEqual(
      Math.ceil(timeline.totalDurationMs / PRESENTATION_MIN_SYLLABLE_GAP_MS) + 1,
    )
    expect(audible[0]).toBe(timeline.syllables[0])
    expect(audible[audible.length - 1]).toBe(timeline.syllables[timeline.syllables.length - 1])
    for (let index = 1; index < audible.length; index += 1) {
      const previous = audible[index - 1]
      const current = audible[index]
      if (previous && current && index < audible.length - 1) {
        expect(current.atMs - previous.atMs).toBeGreaterThanOrEqual(PRESENTATION_MIN_SYLLABLE_GAP_MS)
      }
    }
  })

  it('uses profile pace for the standalone cadence', () => {
    const fast = buildSpeechTimeline('Same words here.', VOICE_PROFILES.pip)
    const slow = buildSpeechTimeline('Same words here.', VOICE_PROFILES.shell)
    expect(slow.totalDurationMs).toBeGreaterThan(fast.totalDurationMs)
  })

  it('slows to a natural speaking pace while preserving punctuation ratios', () => {
    const text = 'A normal line. Another, pause.'
    const prd = buildSpeechTimeline(text, VOICE_PROFILES.pip)
    const natural = buildSpeechTimeline(text, VOICE_PROFILES.pip, { baseIntervalMs: 62 })
    expect(natural.totalDurationMs).toBeGreaterThan(prd.totalDurationMs * 1.8)

    const gapAfter = (timeline: typeof prd, kind: 'comma' | 'sentence') => {
      const boundary = timeline.boundaries.find((item) => item.kind === kind)
      const index = boundary?.charIndex ?? -1
      return (timeline.revealAtMs[index + 1] ?? 0) - (timeline.revealAtMs[index] ?? 0)
    }
    const letterGap = (timeline: typeof prd) => (timeline.revealAtMs[1] ?? 0) - (timeline.revealAtMs[0] ?? 0)
    expect(gapAfter(natural, 'comma') / letterGap(natural)).toBeCloseTo(
      gapAfter(prd, 'comma') / letterGap(prd),
      1,
    )
    expect(gapAfter(natural, 'sentence') / letterGap(natural)).toBeCloseTo(
      gapAfter(prd, 'sentence') / letterGap(prd),
      1,
    )
  })
})
