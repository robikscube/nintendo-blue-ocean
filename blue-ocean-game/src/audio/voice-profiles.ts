import type { CharacterId } from '../core/types'

export type AdvisorVoiceId = Exclude<CharacterId, 'narrator'>
export type Vowel = 'A' | 'E' | 'I' | 'O' | 'U'

/**
 * Original formant targets for the five advisors. These are vocal-tract
 * resonances, not samples or imitations of any existing character voice.
 */
export const VOWEL_FORMANTS: Readonly<Record<Vowel, readonly [number, number, number]>> = {
  A: [730, 1090, 2440],
  E: [270, 2290, 3010],
  I: [300, 2200, 2900],
  O: [570, 840, 2410],
  U: [300, 870, 2240],
}

export interface VoiceProfile {
  readonly id: AdvisorVoiceId
  readonly name: string
  readonly species: string
  /** Fundamental frequency of the sawtooth vocal-fold source, in hertz. */
  readonly basePitch: number
  /** Scales all three formants together; larger = shorter vocal tract. */
  readonly tubeScale: number
  /** Random fundamental-frequency deviation per syllable, in hertz. */
  readonly pitchJitter: number
  readonly wobbleFreq: number
  readonly wobbleAmount: number
  /** > 1 is slower; applied to standalone typewriter pacing. */
  readonly speedMultiplier: number
  readonly gain: number
  /** Relative amount of generated white-noise breath. */
  readonly breath: number
  readonly formantQ: number
  /**
   * Envelope duration for one vowel cluster, in milliseconds. Tuned to the
   * presentation's 2× dialogue pace so notes read as syllables.
   */
  readonly syllableMs: number
}

/**
 * Five deliberately separated timbres. Turtle and bear sit an octave-ish
 * below the fox; owl and beaver fill distinct breathy and dry middle ranges.
 */
export const VOICE_PROFILES: Readonly<Record<AdvisorVoiceId, VoiceProfile>> = {
  mori: {
    id: 'mori',
    name: 'Hootley',
    species: 'Owl',
    basePitch: 196,
    tubeScale: 1.06,
    pitchJitter: 3.5,
    wobbleFreq: 0.45,
    wobbleAmount: 1.1,
    speedMultiplier: 1.02,
    gain: 0.23,
    breath: 0.15,
    formantQ: 8.5,
    syllableMs: 83,
  },
  pip: {
    id: 'pip',
    name: 'Slyvester',
    species: 'Fox',
    basePitch: 305,
    tubeScale: 1.24,
    pitchJitter: 6.5,
    wobbleFreq: 0,
    wobbleAmount: 0,
    speedMultiplier: 0.82,
    gain: 0.2,
    breath: 0.08,
    formantQ: 9.5,
    syllableMs: 67,
  },
  bolt: {
    id: 'bolt',
    name: 'Damian',
    species: 'Beaver',
    basePitch: 138,
    tubeScale: 0.96,
    pitchJitter: 2.5,
    wobbleFreq: 0,
    wobbleAmount: 0,
    speedMultiplier: 1.07,
    gain: 0.25,
    breath: 0.08,
    formantQ: 7.2,
    syllableMs: 77,
  },
  grumble: {
    id: 'grumble',
    name: 'Pawson',
    species: 'Bear',
    basePitch: 88,
    tubeScale: 0.72,
    pitchJitter: 1.8,
    wobbleFreq: 0.7,
    wobbleAmount: 1.2,
    speedMultiplier: 1.18,
    gain: 0.31,
    breath: 0.14,
    formantQ: 6.8,
    syllableMs: 90,
  },
  shell: {
    id: 'shell',
    name: 'Shelldon',
    species: 'Turtle',
    basePitch: 68,
    tubeScale: 0.66,
    pitchJitter: 2.2,
    wobbleFreq: 2.3,
    wobbleAmount: 4.5,
    speedMultiplier: 1.34,
    gain: 0.3,
    breath: 0.18,
    formantQ: 6.4,
    syllableMs: 97,
  },
}

export const ADVISOR_VOICE_IDS = ['mori', 'pip', 'bolt', 'grumble', 'shell'] as const

export function getVoiceProfile(character: CharacterId): VoiceProfile | null {
  if (character === 'narrator') return null
  return VOICE_PROFILES[character]
}

export function isAdvisorVoiceId(value: string): value is AdvisorVoiceId {
  return value !== 'narrator' && Object.prototype.hasOwnProperty.call(VOICE_PROFILES, value)
}
