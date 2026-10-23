import { describe, expect, it } from 'vitest'
import {
  ADVISOR_VOICE_IDS,
  getVoiceProfile,
  isAdvisorVoiceId,
  VOICE_PROFILES,
  VOWEL_FORMANTS,
} from '../src/audio/voice-profiles'

describe('procedural voice profiles', () => {
  it('provides exactly five distinct advisor profiles and no narrator voice', () => {
    expect(ADVISOR_VOICE_IDS).toHaveLength(5)
    expect(new Set(ADVISOR_VOICE_IDS).size).toBe(5)
    for (const id of ADVISOR_VOICE_IDS) {
      expect(VOICE_PROFILES[id].id).toBe(id)
      expect(getVoiceProfile(id)).toBe(VOICE_PROFILES[id])
    }
    expect(getVoiceProfile('narrator')).toBeNull()
    expect(isAdvisorVoiceId('narrator')).toBe(false)
    expect(isAdvisorVoiceId('shell')).toBe(true)
  })

  it('keeps the turtle and bear notably low and the fox high', () => {
    const turtle = VOICE_PROFILES.shell
    const bear = VOICE_PROFILES.grumble
    const fox = VOICE_PROFILES.pip
    const owl = VOICE_PROFILES.mori
    const beaver = VOICE_PROFILES.bolt

    expect(turtle.basePitch).toBeLessThan(bear.basePitch)
    expect(bear.basePitch).toBeLessThan(beaver.basePitch)
    expect(fox.basePitch).toBeGreaterThan(owl.basePitch)
    expect(turtle.basePitch).toBeLessThan(100)
    expect(bear.basePitch).toBeLessThan(100)
    expect(fox.basePitch).toBeGreaterThan(250)
    expect(new Set(ADVISOR_VOICE_IDS.map((id) => VOICE_PROFILES[id].basePitch)).size).toBe(5)
  })

  it('gives owl and beaver separate breath, tube, and timbre signatures', () => {
    const owl = VOICE_PROFILES.mori
    const beaver = VOICE_PROFILES.bolt
    expect(owl.basePitch).not.toBe(beaver.basePitch)
    expect(owl.tubeScale).not.toBe(beaver.tubeScale)
    expect(owl.breath).toBeGreaterThan(beaver.breath)
    expect(owl.formantQ).toBeGreaterThan(beaver.formantQ)
    expect(owl.wobbleFreq).toBeGreaterThan(0)
    expect(beaver.wobbleFreq).toBe(0)
  })

  it('keeps every voice in a safe, audible synthesis range', () => {
    for (const id of ADVISOR_VOICE_IDS) {
      const profile = VOICE_PROFILES[id]
      expect(profile.basePitch).toBeGreaterThanOrEqual(55)
      expect(profile.basePitch).toBeLessThanOrEqual(500)
      expect(profile.tubeScale).toBeGreaterThanOrEqual(0.6)
      expect(profile.tubeScale).toBeLessThanOrEqual(1.5)
      expect(profile.formantQ).toBeGreaterThanOrEqual(6)
      expect(profile.formantQ).toBeLessThanOrEqual(12)
      expect(profile.gain).toBeGreaterThan(0)
      // Tuned to the 2x dialogue pace without becoming a click.
      expect(profile.syllableMs).toBeGreaterThanOrEqual(60)
      expect(profile.syllableMs).toBeLessThanOrEqual(100)
    }
  })

  it('uses the PRD vowel formant targets', () => {
    expect(VOWEL_FORMANTS.A).toEqual([730, 1090, 2440])
    expect(VOWEL_FORMANTS.E).toEqual([270, 2290, 3010])
    expect(VOWEL_FORMANTS.I).toEqual([300, 2200, 2900])
    expect(VOWEL_FORMANTS.O).toEqual([570, 840, 2410])
    expect(VOWEL_FORMANTS.U).toEqual([300, 870, 2240])
  })
})
