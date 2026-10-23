import type { VoiceProfile, Vowel } from './voice-profiles'

/** The PRD's authored base cadence, before the presentation's duration cap. */
export const SPEECH_BASE_INTERVAL_MS = 33
export const COMMA_INTERVAL_MS = 99
export const SENTENCE_INTERVAL_MS = 198
export const ELLIPSIS_INTERVAL_MS = 300

export type SpeechBoundaryKind = 'comma' | 'sentence' | 'question' | 'exclamation' | 'ellipsis'

export interface SpeechSyllable {
  /** Index of the first vowel in the cluster, i.e. the visible vowel gate. */
  readonly charIndex: number
  readonly vowel: Vowel
  readonly atMs: number
  readonly durationMs: number
  readonly pitchScale: number
  readonly gainScale: number
  /** Multiplier reached by the end of a final question syllable, if any. */
  readonly pitchBend: number | null
}

export interface SpeechBoundary {
  readonly charIndex: number
  readonly atMs: number
  readonly kind: SpeechBoundaryKind
  readonly silenceAfterMs: number
}

export interface SpeechTimeline {
  readonly text: string
  /** Times at which each visible character becomes available. */
  readonly revealAtMs: readonly number[]
  readonly syllables: readonly SpeechSyllable[]
  readonly boundaries: readonly SpeechBoundary[]
  readonly totalDurationMs: number
  /** True when a caller compressed the PRD cadence to fit a presentation cap. */
  readonly compressed: boolean
}

export interface SpeechTimelineOptions {
  /**
   * Optional compression for demos and tests. The classroom presentation uses
   * a natural speaking cadence and does not set this.
   */
  targetDurationMs?: number
  /** Milliseconds per character before the speaker's speed multiplier. */
  baseIntervalMs?: number
}

type PhraseKind = 'none' | SpeechBoundaryKind

interface Phrase {
  readonly start: number
  readonly end: number
  readonly kind: PhraseKind
}

const VOWELS = 'AEIOUaeiou'
const LETTER = /[A-Za-z]/

function isVowel(value: string | undefined): boolean {
  return value !== undefined && VOWELS.includes(value)
}

function isLetter(value: string | undefined): boolean {
  return value !== undefined && LETTER.test(value)
}

function isEllipsisEnd(text: string, index: number): boolean {
  if (text[index] === '…') return true
  if (text[index] !== '.') return false
  // Only the final dot owns the long pause; the earlier dots are ordinary.
  if (text[index + 1] === '.') return false
  let count = 1
  for (let cursor = index - 1; text[cursor] === '.'; cursor -= 1) count += 1
  return count >= 3
}

function boundaryKind(value: string): SpeechBoundaryKind | null {
  if (value === ',' || value === ';' || value === ':') return 'comma'
  if (value === '.') return 'sentence'
  if (value === '…') return 'ellipsis'
  if (value === '?') return 'question'
  if (value === '!') return 'exclamation'
  return null
}

function splitPhrases(text: string): Phrase[] {
  const phrases: Phrase[] = []
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === undefined) continue
    let kind: PhraseKind | null = boundaryKind(character)
    if (character === '.') {
      if (text[index + 1] === '.' || text[index - 1] === '.') {
        // A dot run is one punctuation mark. Only its final dot closes a phrase.
        if (!isEllipsisEnd(text, index)) continue
        kind = 'ellipsis'
      }
    }
    if (kind === null) continue
    phrases.push({ start, end: index, kind })
    start = index + 1
  }
  if (start < text.length) phrases.push({ start, end: Math.max(start, text.length - 1), kind: 'none' })
  return phrases
}

function phraseForCharacter(text: string, phrases: readonly Phrase[]): (Phrase | null)[] {
  const byCharacter = new Array<Phrase | null>(text.length).fill(null)
  for (const phrase of phrases) {
    for (let index = phrase.start; index <= phrase.end && index < byCharacter.length; index += 1) {
      byCharacter[index] = phrase
    }
  }
  return byCharacter
}

function allCapsWordAt(text: string, index: number): boolean {
  let start = index
  while (start > 0 && isLetter(text[start - 1])) start -= 1
  let end = index + 1
  while (end < text.length && isLetter(text[end])) end += 1
  if (end - start < 2) return false
  for (let cursor = start; cursor < end; cursor += 1) {
    const character = text[cursor]
    if (character === undefined || character !== character.toUpperCase()) return false
  }
  return true
}

function intervalAfter(text: string, index: number, baseIntervalMs: number): number {
  const character = text[index]
  if (character === undefined) return baseIntervalMs
  // Punctuation pauses keep their authored multipliers when the presenter
  // chooses a slower speaking pace instead of the PRD's 33 ms cadence.
  const paceScale = baseIntervalMs / SPEECH_BASE_INTERVAL_MS
  if (isEllipsisEnd(text, index)) {
    return Math.max(baseIntervalMs, ELLIPSIS_INTERVAL_MS * paceScale)
  }
  if (character === ',' || character === ';' || character === ':') {
    return Math.max(baseIntervalMs, COMMA_INTERVAL_MS * paceScale)
  }
  if (character === '.' || character === '?' || character === '!') {
    return Math.max(baseIntervalMs, SENTENCE_INTERVAL_MS * paceScale)
  }
  return baseIntervalMs
}

function kindForPrevious(text: string, index: number): SpeechBoundaryKind | null {
  const character = text[index]
  if (character === undefined) return null
  if (character === '.') {
    if (text[index + 1] === '.' || text[index - 1] === '.') {
      return isEllipsisEnd(text, index) ? 'ellipsis' : null
    }
    return 'sentence'
  }
  if (character === '…') return 'ellipsis'
  if (character === ',' || character === ';' || character === ':') return 'comma'
  if (character === '?') return 'question'
  if (character === '!') return 'exclamation'
  return null
}

/**
 * Turn authored prose into a visible character rhythm and vowel-gated audio
 * events. All cadence in this module is pure and deterministic so it can be
 * tested without an AudioContext or a browser.
 */
export function buildSpeechTimeline(
  text: string,
  profile: VoiceProfile | null,
  options: SpeechTimelineOptions = {},
): SpeechTimeline {
  const baseIntervalMs = Math.max(4, options.baseIntervalMs ?? SPEECH_BASE_INTERVAL_MS)
  const speed = Math.max(0.5, profile?.speedMultiplier ?? 1)
  const rawRevealAt: number[] = new Array<number>(text.length)
  let cursor = 0
  for (let index = 0; index < text.length; index += 1) {
    rawRevealAt[index] = cursor
    if (index < text.length - 1) {
      cursor += intervalAfter(text, index, baseIntervalMs) * speed
    }
  }

  const rawDuration = text.length > 0 ? Math.max(1, rawRevealAt[text.length - 1] ?? 0) : 0
  const target = options.targetDurationMs
  const compressed = target !== undefined && target > 0 && rawDuration > 0
  const scale = compressed ? Math.max(0.0001, target / rawDuration) : 1
  const revealAtMs = rawRevealAt.map((time) => Math.round(time * scale))
  const totalDurationMs = compressed ? Math.round(target) : Math.round(rawDuration)

  const phrases = splitPhrases(text)
  const phraseAt = phraseForCharacter(text, phrases)
  const lastSyllableByPhrase = new Map<number, number>()
  const syllables: SpeechSyllable[] = []

  for (let index = 0; index < text.length; index += 1) {
    if (!isVowel(text[index])) continue
    if (index > 0 && isVowel(text[index - 1])) continue
    const phrase = phraseAt[index]
    if (!phrase) continue
    const phraseIndex = phrases.indexOf(phrase)
    const span = Math.max(1, phrase.end - phrase.start)
    const progress = Math.min(1, Math.max(0, (index - phrase.start) / span))
    const vowel = text[index]?.toUpperCase()
    if (vowel !== 'A' && vowel !== 'E' && vowel !== 'I' && vowel !== 'O' && vowel !== 'U') continue

    const caps = allCapsWordAt(text, index)
    let pitchScale = 1 - progress * 0.04
    if (phrase.kind === 'exclamation') pitchScale *= 1.2
    if (caps) pitchScale *= 1.15
    let gainScale = caps ? 1.25 : 1
    if (phrase.kind === 'ellipsis') gainScale *= 0.82

    const baseDuration = profile?.syllableMs ?? 78
    syllables.push({
      charIndex: index,
      vowel,
      atMs: revealAtMs[index] ?? 0,
      durationMs: Math.round(baseDuration),
      pitchScale,
      gainScale,
      pitchBend: null,
    })
    lastSyllableByPhrase.set(phraseIndex, syllables.length - 1)
  }

  for (const [phraseIndex, syllableIndex] of lastSyllableByPhrase) {
    const phrase = phrases[phraseIndex]
    const syllable = syllables[syllableIndex]
    if (!phrase || !syllable) continue
    if (phrase.kind === 'question') {
      syllables[syllableIndex] = {
        ...syllable,
        durationMs: Math.round(syllable.durationMs * 1.18),
        pitchBend: 1.24,
      }
    } else if (phrase.kind === 'ellipsis') {
      syllables[syllableIndex] = {
        ...syllable,
        durationMs: Math.round(syllable.durationMs * 1.15),
        gainScale: syllable.gainScale * 0.65,
      }
    }
  }

  const boundaries: SpeechBoundary[] = []
  for (let index = 0; index < text.length; index += 1) {
    const kind = kindForPrevious(text, index)
    if (!kind) continue
    boundaries.push({
      charIndex: index,
      atMs: revealAtMs[index] ?? 0,
      kind,
      silenceAfterMs: Math.round(intervalAfter(text, index, baseIntervalMs) * speed * scale),
    })
  }

  return {
    text,
    revealAtMs,
    syllables,
    boundaries,
    totalDurationMs,
    compressed,
  }
}

/**
 * A fast speaker or a dense run of vowel clusters can otherwise fire
 * overlapping notes. Keep at most one vowel hand-off per ~100 ms while
 * preserving the first and final vowels (the final one may carry a question
 * bend).
 */
export const PRESENTATION_MIN_SYLLABLE_GAP_MS = 100

export function selectAudibleSyllables(
  syllables: readonly SpeechSyllable[],
  minGapMs = PRESENTATION_MIN_SYLLABLE_GAP_MS,
): readonly SpeechSyllable[] {
  if (syllables.length <= 1) return syllables
  const selected: SpeechSyllable[] = []
  let lastAt = Number.NEGATIVE_INFINITY
  for (const syllable of syllables) {
    if (syllable.atMs - lastAt < minGapMs) continue
    selected.push(syllable)
    lastAt = syllable.atMs
  }
  const final = syllables[syllables.length - 1]
  if (final && selected[selected.length - 1] !== final) {
    const penultimate = selected[selected.length - 2]
    if (!penultimate || final.atMs - penultimate.atMs >= minGapMs * 0.5) selected.push(final)
    else selected[selected.length - 1] = final
  }
  return selected
}

/** Binary search used by the rAF typewriter to avoid scanning the timeline. */
export function revealedCharacterCount(timeline: SpeechTimeline, elapsedMs: number): number {
  let low = 0
  let high = timeline.revealAtMs.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    const reveal = timeline.revealAtMs[middle]
    if (reveal !== undefined && reveal <= elapsedMs) low = middle + 1
    else high = middle
  }
  return low
}
