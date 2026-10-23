import type { CharacterId } from '../core/types'
import { buildSpeechTimeline, type SpeechSyllable, type SpeechTimeline } from './speech-timeline'
import {
  getVoiceProfile,
  VOWEL_FORMANTS,
  VOICE_PROFILES,
  type VoiceProfile,
} from './voice-profiles'

type TimerHandle = ReturnType<typeof setTimeout>

const FORMANT_GAINS = [1, 0.68, 0.38] as const
const FORMANT_Q_SCALE = [1, 0.9, 0.8] as const
const MIN_SYLLABLE_SECONDS = 0.045
const STOP_FADE_SECONDS = 0.015
const OUTPUT_TAIL_MS = 240

/**
 * The three narrow formant bands pass only a small slice of the sawtooth
 * spectrum, so a syllable peaks far below its nominal profile gain. Measured
 * in Chromium at the game's default master volume, uncompensated speech peaked
 * around -45 dBFS (effectively inaudible on classroom speakers). This bus trim
 * lifts it to roughly -20 dBFS while leaving ample headroom before clipping.
 */
export const VOICE_BUS_GAIN = 10

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

/**
 * Zero-sample procedural mumble synthesizer.
 *
 * One sawtooth vocal-fold source feeds three parallel band-pass formant
 * resonators. A generated noise loop adds a small breath component, and a
 * per-syllable gain envelope provides attack/hold/decay. Only vowel-cluster
 * starts trigger notes, so consonants advance the typewriter silently.
 *
 * The engine owns the nodes for each syllable and disconnects them on
 * `ended`; `stop()` additionally fades the utterance bus and stops any
 * scheduled sources, which makes skip/restart/mute click-free.
 */
export class MumbleVoiceEngine {
  private readonly context: AudioContext | null
  private readonly destination: AudioNode | null
  private readonly random: () => number
  private profile: VoiceProfile = VOICE_PROFILES.mori
  private output: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false
  private running = false
  private outputCleanup: TimerHandle | null = null
  private outputCleanupTarget: GainNode | null = null
  private typewriterTimers: TimerHandle[] = []
  private typewriterResolve: (() => void) | null = null
  private typewriterToken = 0
  private activeSources = new Set<AudioScheduledSourceNode>()
  private activeNodes = new Set<AudioNode>()

  constructor(
    audioContext: AudioContext | null = null,
    destination: AudioNode | null = null,
    random: () => number = Math.random,
  ) {
    this.context = audioContext
    this.destination = destination ?? audioContext?.destination ?? null
    this.random = random
  }

  setVoiceProfile(profile: VoiceProfile): void {
    this.profile = profile
  }

  /** Convenience mapping used by the game's five advisor ids. */
  setVoiceProfileById(character: CharacterId): boolean {
    const profile = getVoiceProfile(character)
    if (!profile) return false
    this.setVoiceProfile(profile)
    return true
  }

  getProfile(): VoiceProfile {
    return this.profile
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop()
  }

  getMuted(): boolean {
    return this.muted
  }

  /** Lightweight state probe for automated presentational smoke tests. */
  getDebugInfo(): {
    profileId: string
    running: boolean
    muted: boolean
    activeSources: number
    contextState: AudioContextState | 'unavailable'
  } {
    return {
      profileId: this.profile.id,
      running: this.running,
      muted: this.muted,
      activeSources: this.activeSources.size,
      contextState: this.context?.state ?? 'unavailable',
    }
  }

  /** Create a fresh utterance bus. Calling it again safely cancels the old one. */
  beginLine(): boolean {
    this.stop()
    if (!this.context || !this.destination || this.muted) return false
    if (this.context.state !== 'running') return false
    const output = this.context.createGain()
    output.gain.setValueAtTime(VOICE_BUS_GAIN, this.context.currentTime)
    output.connect(this.destination)
    this.output = output
    this.running = true
    return true
  }

  /**
   * Synthesize one vowel event. Returns false when audio is unavailable,
   * suspended, muted, or no line is active, so callers can remain headless.
   */
  triggerSyllable(event: SpeechSyllable): boolean {
    if (!this.running || this.muted || !this.context || !this.output) return false
    if (this.context.state !== 'running') return false
    const context = this.context
    const output = this.output
    const start = context.currentTime + 0.004
    const duration = Math.max(MIN_SYLLABLE_SECONDS, event.durationMs / 1000)
    const end = start + duration
    const pitch = clamp(
      this.profile.basePitch * event.pitchScale + (this.random() - 0.5) * 2 * this.profile.pitchJitter,
      28,
      1200,
    )
    const peak = clamp(this.profile.gain * event.gainScale, 0.015, 0.42)
    const nodes: AudioNode[] = []
    const sources: AudioScheduledSourceNode[] = []
    let cleaned = false

    const cleanup = (): void => {
      if (cleaned) return
      cleaned = true
      for (const node of nodes) {
        node.disconnect()
        this.activeNodes.delete(node)
      }
      for (const source of sources) this.activeSources.delete(source)
    }

    try {
      const oscillator = context.createOscillator()
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(pitch, start)
      if (event.pitchBend !== null) {
        oscillator.frequency.exponentialRampToValueAtTime(
          clamp(pitch * event.pitchBend, 28, 1600),
          start + duration * 0.82,
        )
      } else {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(24, pitch * 0.975),
          end,
        )
      }
      nodes.push(oscillator)
      sources.push(oscillator)
      this.activeNodes.add(oscillator)
      this.activeSources.add(oscillator)

      const envelope = context.createGain()
      envelope.gain.setValueAtTime(0.0001, start)
      envelope.gain.linearRampToValueAtTime(peak, start + Math.min(0.014, duration * 0.25))
      envelope.gain.setValueAtTime(peak, start + duration * 0.45)
      envelope.gain.exponentialRampToValueAtTime(0.0001, end)
      envelope.connect(output)
      nodes.push(envelope)
      this.activeNodes.add(envelope)

      const formants = VOWEL_FORMANTS[event.vowel]
      for (let band = 0; band < formants.length; band += 1) {
        const formant = formants[band]
        if (formant === undefined) continue
        const filter = context.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(formant * this.profile.tubeScale, start)
        filter.Q.setValueAtTime(
          this.profile.formantQ * (FORMANT_Q_SCALE[band] ?? 0.8),
          start,
        )
        const bandGain = context.createGain()
        bandGain.gain.setValueAtTime(FORMANT_GAINS[band] ?? 0.5, start)
        oscillator.connect(filter)
        filter.connect(bandGain)
        bandGain.connect(envelope)
        nodes.push(filter, bandGain)
        this.activeNodes.add(filter)
        this.activeNodes.add(bandGain)
      }

      if (this.profile.breath > 0) {
        const noiseBuffer = this.getNoiseBuffer()
        if (noiseBuffer) {
          const noise = context.createBufferSource()
          noise.buffer = noiseBuffer
          noise.loop = true
          const noiseFilter = context.createBiquadFilter()
          noiseFilter.type = 'bandpass'
          noiseFilter.frequency.setValueAtTime(1250, start)
          noiseFilter.Q.setValueAtTime(0.7, start)
          const noiseGain = context.createGain()
          noiseGain.gain.setValueAtTime(this.profile.breath * 0.55, start)
          noise.connect(noiseFilter)
          noiseFilter.connect(noiseGain)
          noiseGain.connect(envelope)
          nodes.push(noise, noiseFilter, noiseGain)
          this.activeNodes.add(noise)
          this.activeNodes.add(noiseFilter)
          this.activeNodes.add(noiseGain)
          sources.push(noise)
          this.activeSources.add(noise)
          noise.start(start)
          noise.stop(end + 0.025)
          noise.onended = cleanup
        }
      }

      if (this.profile.wobbleFreq > 0 && this.profile.wobbleAmount > 0) {
        const lfo = context.createOscillator()
        const lfoGain = context.createGain()
        lfo.type = 'sine'
        lfo.frequency.setValueAtTime(this.profile.wobbleFreq, start)
        lfoGain.gain.setValueAtTime(this.profile.wobbleAmount, start)
        lfo.connect(lfoGain)
        lfoGain.connect(oscillator.frequency)
        nodes.push(lfo, lfoGain)
        this.activeNodes.add(lfo)
        this.activeNodes.add(lfoGain)
        sources.push(lfo)
        this.activeSources.add(lfo)
        lfo.start(start)
        lfo.stop(end + 0.02)
      }

      oscillator.start(start)
      oscillator.stop(end + 0.025)
      oscillator.onended = cleanup
      return true
    } catch {
      cleanup()
      return false
    }
  }

  /** Natural end: let the last syllable's short tail finish, then clean up. */
  finishLine(): void {
    this.running = false
    this.releaseOutput(OUTPUT_TAIL_MS)
    // Backstop for throttled/an interrupted context: real node `ended`
    // callbacks normally release these much sooner.
    this.disconnectActiveNodes(OUTPUT_TAIL_MS + 60)
  }

  /** Immediate skip/restart/mute: cancel trailing tones and release nodes. */
  stop(): void {
    this.typewriterToken += 1
    this.clearTypewriterTimers()
    const resolve = this.typewriterResolve
    this.typewriterResolve = null
    this.running = false
    const context = this.context
    const now = context?.currentTime ?? 0
    const output = this.output
    this.output = null

    if (output) {
      try {
        output.gain.cancelScheduledValues(now)
        output.gain.setValueAtTime(output.gain.value, now)
        output.gain.linearRampToValueAtTime(0.0001, now + STOP_FADE_SECONDS)
      } catch {
        // Some test/older Web Audio implementations do not expose ramping.
      }
    }
    for (const source of this.activeSources) {
      try {
        source.stop(now + STOP_FADE_SECONDS)
      } catch {
        // Already stopped/ended; the remaining cleanup still applies.
      }
    }
    this.releaseOutput(STOP_FADE_SECONDS * 1000 + 24, output)
    this.disconnectActiveNodes(STOP_FADE_SECONDS * 1000 + 30)
    resolve?.()
  }

  async resumeContext(): Promise<void> {
    if (!this.context || this.context.state !== 'suspended') return
    try {
      await this.context.resume()
    } catch {
      // Audio remains optional; an autoplay refusal must not block the story.
    }
  }

  /**
   * Standalone PRD typewriter + speech API. The presentation UI uses its own
   * rAF renderer and calls `triggerSyllable`, but this API is useful for
   * isolated demos/tests and uses the literal 33 ms authored cadence.
   */
  typeText(
    text: string,
    onCharTyped?: (character: string, index: number) => void,
    onComplete?: () => void,
  ): Promise<void> {
    this.stop()
    const timeline: SpeechTimeline = buildSpeechTimeline(text, this.profile)
    this.beginLine()
    const token = this.typewriterToken
    return new Promise<void>((resolve) => {
      let settled = false
      let eventIndex = 0
      const settle = (): void => {
        if (settled) return
        settled = true
        if (this.typewriterResolve === settle) this.typewriterResolve = null
        resolve()
      }
      this.typewriterResolve = settle

      const schedule = (delayMs: number, callback: () => void): void => {
        const timer = setTimeout(() => {
          if (token !== this.typewriterToken) return
          callback()
        }, delayMs)
        this.typewriterTimers.push(timer)
      }

      timeline.revealAtMs.forEach((atMs, index) => {
        schedule(atMs, () => {
          onCharTyped?.(text[index] ?? '', index)
          while (eventIndex < timeline.syllables.length) {
            const event = timeline.syllables[eventIndex]
            if (!event || event.atMs > atMs) break
            this.triggerSyllable(event)
            eventIndex += 1
          }
        })
      })

      schedule(timeline.totalDurationMs + 20, () => {
        this.clearTypewriterTimers()
        this.typewriterToken += 1
        if (this.typewriterResolve === settle) this.typewriterResolve = null
        this.running = false
        onComplete?.()
        this.finishLine()
        settle()
      })
    })
  }

  dispose(): void {
    this.stop()
    this.output?.disconnect()
    this.output = null
    this.activeNodes.clear()
    this.activeSources.clear()
    this.noiseBuffer = null
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (this.noiseBuffer) return this.noiseBuffer
    if (!this.context) return null
    try {
      const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(this.context.sampleRate * 0.35)), this.context.sampleRate)
      const channel = buffer.getChannelData(0)
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = this.random() * 2 - 1
      }
      this.noiseBuffer = buffer
      return buffer
    } catch {
      return null
    }
  }

  private releaseOutput(delayMs: number, output: GainNode | null = this.output): void {
    // A detached output still owns its scheduled disconnect. Returning early
    // keeps a later beginLine() stop() from cancelling that timer and
    // orphaning the previous utterance bus.
    if (!output) return
    if (this.outputCleanup !== null && this.outputCleanupTarget === output) {
      clearTimeout(this.outputCleanup)
      this.outputCleanup = null
      this.outputCleanupTarget = null
    }
    const timer = setTimeout(() => {
      if (this.outputCleanup === timer) {
        this.outputCleanup = null
        this.outputCleanupTarget = null
      }
      if (this.output === output) this.output = null
      try {
        output.disconnect()
      } catch {
        // Already disconnected.
      }
    }, delayMs)
    this.outputCleanup = timer
    this.outputCleanupTarget = output
  }

  private disconnectActiveNodes(delayMs: number): void {
    const nodes = [...this.activeNodes]
    if (nodes.length === 0) return
    setTimeout(() => {
      for (const node of nodes) {
        try {
          node.disconnect()
        } catch {
          // Already disconnected by its own ended cleanup.
        }
        this.activeNodes.delete(node)
      }
    }, delayMs)
  }

  private clearTypewriterTimers(): void {
    for (const timer of this.typewriterTimers) clearTimeout(timer)
    this.typewriterTimers = []
  }
}
