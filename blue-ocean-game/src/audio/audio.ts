import type { CharacterId } from '../core/types'
import { MumbleVoiceEngine } from './mumble-voice'
import {
  BackgroundMusic,
  MUSIC_DEFAULT_VOLUME,
  MUSIC_VOLUME_KEY,
  type MusicMode,
} from './music'
import type { SpeechSyllable } from './speech-timeline'

const VOLUME_KEY = 'nintendo-next-blue-ocean:volume'

/**
 * Original, synthesized paper-toy babble. No samples, recognizable character
 * voices, speech synthesis, or network audio are used anywhere in the project.
 */
export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private speech: MumbleVoiceEngine | null = null
  private music: BackgroundMusic | null = null
  private musicMode: MusicMode = 'silent'
  private musicVolume: number
  private speechRequest = 0
  private muted: boolean
  private volume: number
  private unlocked = false

  constructor(muted: boolean) {
    this.muted = muted
    this.volume = this.loadVolume()
    this.musicVolume = this.loadMusicVolume()
  }

  async unlock(): Promise<void> {
    if (this.unlocked) {
      await this.resume()
      return
    }
    try {
      const AudioContextCtor = window.AudioContext
      if (!AudioContextCtor) return
      const context = new AudioContextCtor()
      const master = context.createGain()
      master.gain.value = this.targetGain()
      master.connect(context.destination)
      this.context = context
      this.master = master
      this.speech = new MumbleVoiceEngine(context, master)
      this.speech.setMuted(this.muted)
      this.music = new BackgroundMusic(context, master, this.musicVolume)
      this.music.setMode(this.musicMode)
      this.unlocked = true
      if (context.state === 'suspended') await context.resume()
    } catch {
      // Audio is optional; an unavailable Web Audio context must not block play.
      this.speech?.dispose()
      this.music?.dispose()
      this.speech = null
      this.music = null
      this.context = null
      this.master = null
    }
  }

  private async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      try {
        await this.context.resume()
      } catch {
        // Ignore autoplay recovery failure.
      }
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.speech?.stop()
    this.speech?.setMuted(muted)
    this.applyGain()
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    try {
      window.localStorage.setItem(VOLUME_KEY, String(this.volume))
    } catch {
      // Ignore storage restrictions.
    }
    this.applyGain()
  }

  getVolume(): number {
    return this.volume
  }

  getMuted(): boolean {
    return this.muted
  }

  /** The UI maps phases to rooms; the engine remembers the mode before unlock. */
  setMusicMode(mode: MusicMode): void {
    this.musicMode = mode
    this.music?.setMode(mode)
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    try {
      window.localStorage.setItem(MUSIC_VOLUME_KEY, String(this.musicVolume))
    } catch {
      // Ignore storage restrictions.
    }
    this.music?.setVolume(this.musicVolume)
  }

  getMusicVolume(): number {
    return this.musicVolume
  }

  setMusicSuspended(suspended: boolean): void {
    this.music?.setSuspended(suspended)
  }

  getMusicDebug(): ReturnType<BackgroundMusic['getDebugInfo']> | null {
    return this.music?.getDebugInfo() ?? null
  }

  private loadVolume(): number {
    try {
      const raw = window.localStorage.getItem(VOLUME_KEY)
      const value = raw === null ? 0.62 : Number(raw)
      if (Number.isFinite(value)) return Math.max(0, Math.min(1, value))
    } catch {
      // Ignore storage restrictions.
    }
    return 0.62
  }

  private loadMusicVolume(): number {
    try {
      const raw = window.localStorage.getItem(MUSIC_VOLUME_KEY)
      const value = raw === null ? MUSIC_DEFAULT_VOLUME : Number(raw)
      if (Number.isFinite(value)) return Math.max(0, Math.min(1, value))
    } catch {
      // Ignore storage restrictions.
    }
    return MUSIC_DEFAULT_VOLUME
  }

  private targetGain(): number {
    return this.muted ? 0 : this.volume * 0.13
  }

  private applyGain(): void {
    if (!this.context || !this.master) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(this.targetGain(), now, 0.025)
  }

  /**
   * Start a vowel-gated mumble utterance for the speaker. Narrator and the
   * five advisors are distinct: only the advisors have formant profiles.
   */
  beginSpeech(character: CharacterId): void {
    if (this.muted || !this.context || !this.speech) return
    if (!this.speech.setVoiceProfileById(character)) return
    this.music?.setDucked(true)
    const request = ++this.speechRequest
    const start = (): void => {
      if (request !== this.speechRequest || this.muted) return
      if (!this.context || this.context.state !== 'running') return
      this.speech?.beginLine()
    }
    if (this.context.state === 'suspended') {
      // A tab/OS suspension can outlive the one-time gesture unlock. A later
      // presenter click is still a valid gesture, so retry before starting.
      void this.resume().then(start)
      return
    }
    start()
  }

  /** Called only for a visible vowel-cluster start from the typewriter plan. */
  triggerSpeech(event: SpeechSyllable): void {
    if (this.muted) return
    this.speech?.triggerSyllable(event)
  }

  /** Let the final short syllable tail finish naturally. */
  finishSpeech(): void {
    // Invalidate a begin that is still waiting on a suspended context from
    // resuming, so a finished line cannot open an empty utterance bus later.
    this.speechRequest += 1
    this.speech?.finishLine()
    this.music?.setDucked(false)
  }

  /** Skip, new line, hidden tab, mute, restart, or reset. */
  stopSpeech(): void {
    this.speechRequest += 1
    this.speech?.stop()
    this.music?.setDucked(false)
  }

  /** Stable, non-rendering probe used by the browser integration test. */
  getSpeechDebug(): ReturnType<MumbleVoiceEngine['getDebugInfo']> | null {
    return this.speech?.getDebugInfo() ?? null
  }

  private tone(
    frequency: number,
    start: number,
    duration: number,
    wave: OscillatorType,
    gainAmount: number,
    destination?: AudioNode,
  ): void {
    if (!this.context || !this.master) return
    const context = this.context
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.92), start + duration)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1700, start)
    filter.Q.value = 0.7
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(gainAmount, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(destination ?? this.master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
    oscillator.onended = () => {
      oscillator.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }

  async sting(kind: 'select' | 'commit' | 'start' | 'stamp' | 'reveal' | 'archive'): Promise<void> {
    if (this.muted || !this.context || !this.master) return
    await this.resume()
    const context = this.context
    if (!context || context.state !== 'running') return
    const t = context.currentTime + 0.015
    if (kind === 'select') {
      this.tone(520, t, 0.07, 'sine', 0.1)
      this.tone(660, t + 0.055, 0.07, 'sine', 0.075)
    } else if (kind === 'commit') {
      this.tone(196, t, 0.24, 'triangle', 0.17)
      this.tone(293.7, t + 0.04, 0.25, 'sine', 0.12)
      this.tone(392, t + 0.09, 0.28, 'sine', 0.08)
    } else if (kind === 'start') {
      this.tone(260, t, 0.18, 'sine', 0.12)
      this.tone(390, t + 0.1, 0.22, 'triangle', 0.1)
      this.tone(520, t + 0.22, 0.3, 'sine', 0.08)
    } else if (kind === 'stamp') {
      this.tone(78, t, 0.34, 'sine', 0.4)
      this.tone(112, t, 0.2, 'triangle', 0.17)
    } else if (kind === 'reveal') {
      this.tone(392, t, 0.18, 'triangle', 0.1)
      this.tone(523.25, t + 0.11, 0.25, 'triangle', 0.11)
      this.tone(659.25, t + 0.22, 0.36, 'sine', 0.1)
    } else {
      this.tone(146.83, t, 0.4, 'sine', 0.16)
      this.tone(220, t + 0.12, 0.45, 'triangle', 0.12)
      this.tone(293.66, t + 0.24, 0.55, 'sine', 0.09)
    }
  }
}
