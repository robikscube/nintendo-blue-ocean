import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CONTEXT_MUSIC,
  FACTORY_MUSIC,
  FINALE_MUSIC,
  LICENSED_MUSIC,
  MUSIC_CREDIT,
  MUSIC_DEFAULT_VOLUME,
  musicGainForVolume,
  musicModeForPhase,
  OFFICE_MUSIC,
  TITLE_MUSIC,
} from '../src/audio/music'

describe('background music cues', () => {
  it('plays the office theme in the dialogue boardroom phases', () => {
    for (const phase of ['opening', 'advisors', 'feedback', 'boss', 'transition'] as const) {
      expect(musicModeForPhase(phase)).toBe('office')
    }
  })

  it('uses the calmer context theme for briefing and voting', () => {
    for (const phase of ['briefing', 'voting'] as const) {
      expect(musicModeForPhase(phase)).toBe('context')
    }
  })

  it('gives the factory floor, title and finale their own tracks', () => {
    expect(musicModeForPhase('factory')).toBe('factory')
    expect(musicModeForPhase('title')).toBe('title')
    expect(musicModeForPhase('finale')).toBe('finale')
  })

  it('gives every authored phase a cue', () => {
    for (const phase of [
      'title',
      'opening',
      'briefing',
      'advisors',
      'voting',
      'factory',
      'feedback',
      'boss',
      'transition',
      'finale',
    ] as const) {
      expect(musicModeForPhase(phase)).not.toBe('silent')
    }
  })

  it('gives the presenter a useful, monotonic volume curve', () => {
    expect(MUSIC_DEFAULT_VOLUME).toBeGreaterThan(0)
    expect(MUSIC_DEFAULT_VOLUME).toBeLessThanOrEqual(1)
    expect(musicGainForVolume(0, false)).toBe(0)
    expect(musicGainForVolume(0, true)).toBe(0)
    expect(musicGainForVolume(1, false)).toBeGreaterThan(musicGainForVolume(0.5, false))
    expect(musicGainForVolume(0.5, false)).toBeGreaterThan(musicGainForVolume(0.25, false))
    expect(musicGainForVolume(0.7, true)).toBeLessThan(musicGainForVolume(0.7, false))
    expect(musicGainForVolume(2, false)).toBe(musicGainForVolume(1, false))
    expect(musicGainForVolume(-1, false)).toBe(0)
  })

  it('records the verified CC BY attribution for all five tracks', () => {
    expect(TITLE_MUSIC.title).toBe('1am')
    expect(OFFICE_MUSIC.title).toBe('7am')
    expect(CONTEXT_MUSIC.title).toBe('6pm')
    expect(FACTORY_MUSIC.title).toBe('10pm')
    expect(FINALE_MUSIC.title).toBe('5am - Goodbye')
    for (const track of LICENSED_MUSIC) {
      expect(track.album).toBe("Towball's Crossing")
      expect(track.artist).toBe('Towball')
      expect(track.license).toBe('CC BY 4.0')
      expect(track.licenseUrl).toContain('creativecommons.org/licenses/by/4.0')
      expect(track.sourceUrl).toContain('towball.itch.io/towballs-crossing')
    }
    expect(MUSIC_CREDIT.titles).toEqual(['1am', '7am', '6pm', '10pm', '5am - Goodbye'])
    expect(MUSIC_CREDIT.artist).toBe('Towball')
  })

  it('ships all licensed assets at a reasonable web size', () => {
    for (const track of LICENSED_MUSIC) {
      const asset = resolve(process.cwd(), 'public', track.src)
      expect(existsSync(asset)).toBe(true)
      const size = statSync(asset).size
      expect(size).toBeGreaterThan(1_000_000)
      expect(size).toBeLessThan(8_000_000)
    }
  })
})
