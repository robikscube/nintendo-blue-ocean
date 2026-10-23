import type { Phase } from '../core/types'

/**
 * Licensed background music.
 *
 * "1am" (title), "7am" (boardroom), "6pm" (briefing and voting), "10pm"
 * (factory) and "5am - Goodbye" (finale) by Towball, from the album Towball's
 * Crossing, are used under CC BY 4.0. Source and licence links live in
 * MUSIC_LICENSE.md and are shown in the title screen, presenter drawer and
 * finale archive.
 */
export type MusicMode = 'silent' | 'title' | 'office' | 'context' | 'factory' | 'finale'

export interface MusicTrack {
  readonly src: string
  readonly title: string
  readonly album: string
  readonly artist: string
  readonly license: string
  readonly licenseUrl: string
  readonly sourceUrl: string
}

const OFFICE_TRACK: MusicTrack = {
  src: 'audio/towball-7am.mp3',
  title: '7am',
  album: "Towball's Crossing",
  artist: 'Towball',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://towball.itch.io/towballs-crossing',
}

const FACTORY_TRACK: MusicTrack = {
  src: 'audio/towball-10pm.mp3',
  title: '10pm',
  album: "Towball's Crossing",
  artist: 'Towball',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://towball.itch.io/towballs-crossing',
}

const CONTEXT_TRACK: MusicTrack = {
  src: 'audio/towball-6pm.mp3',
  title: '6pm',
  album: "Towball's Crossing",
  artist: 'Towball',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://towball.itch.io/towballs-crossing',
}

const TITLE_TRACK: MusicTrack = {
  src: 'audio/towball-1am.mp3',
  title: '1am',
  album: "Towball's Crossing",
  artist: 'Towball',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://towball.itch.io/towballs-crossing',
}

const FINALE_TRACK: MusicTrack = {
  src: 'audio/towball-5am-goodbye.mp3',
  title: '5am - Goodbye',
  album: "Towball's Crossing",
  artist: 'Towball',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://towball.itch.io/towballs-crossing',
}

export const MUSIC_TRACKS: Readonly<Partial<Record<MusicMode, MusicTrack>>> = {
  title: TITLE_TRACK,
  office: OFFICE_TRACK,
  context: CONTEXT_TRACK,
  factory: FACTORY_TRACK,
  finale: FINALE_TRACK,
}

export const TITLE_MUSIC: MusicTrack = TITLE_TRACK
export const OFFICE_MUSIC: MusicTrack = OFFICE_TRACK
export const CONTEXT_MUSIC: MusicTrack = CONTEXT_TRACK
export const FACTORY_MUSIC: MusicTrack = FACTORY_TRACK
export const FINALE_MUSIC: MusicTrack = FINALE_TRACK
export const LICENSED_MUSIC: readonly MusicTrack[] = [
  TITLE_TRACK,
  OFFICE_TRACK,
  CONTEXT_TRACK,
  FACTORY_TRACK,
  FINALE_TRACK,
]

/** Shared album attribution used by the title, drawer and archive credits. */
export const MUSIC_CREDIT = {
  titles: LICENSED_MUSIC.map((track) => track.title),
  artist: OFFICE_TRACK.artist,
  album: OFFICE_TRACK.album,
  license: OFFICE_TRACK.license,
  licenseUrl: OFFICE_TRACK.licenseUrl,
  sourceUrl: OFFICE_TRACK.sourceUrl,
} as const

export const MUSIC_VOLUME_KEY = 'nintendo-next-blue-ocean:music-volume'
export const MUSIC_DEFAULT_VOLUME = 0.7

/** Perceptual headroom: the source track is mastered hot (mean about -18.6 dBFS). */
const MUSIC_MAX_GAIN = 4
const MUSIC_DUCK_FACTOR = 0.35
const FADE_IN_SECONDS = 1.2
const FADE_OUT_SECONDS = 0.8
const DUCK_SECONDS = 0.18
const RESUME_SECONDS = 0.5
const SLIDER_SECONDS = 0.12

const CONTEXT_PHASES: ReadonlySet<Phase> = new Set<Phase>(['briefing', 'voting'])

const OFFICE_PHASES: ReadonlySet<Phase> = new Set<Phase>([
  'opening',
  'advisors',
  'feedback',
  'boss',
  'transition',
])

/**
 * Every authored phase has its own cue now. The boardroom dialogue uses
 * "7am", background context and voting use "6pm", the factory uses "10pm",
 * the title uses "1am", and the finale uses "5am - Goodbye".
 */
export function musicModeForPhase(phase: Phase): MusicMode {
  if (phase === 'title') return 'title'
  if (phase === 'finale') return 'finale'
  if (phase === 'factory') return 'factory'
  if (CONTEXT_PHASES.has(phase)) return 'context'
  return OFFICE_PHASES.has(phase) ? 'office' : 'silent'
}

/** Quadratic slider curve keeps low settings useful. */
export function musicGainForVolume(volume: number, ducked: boolean): number {
  const clamped = Math.min(1, Math.max(0, volume))
  return clamped * clamped * MUSIC_MAX_GAIN * (ducked ? MUSIC_DUCK_FACTOR : 1)
}

function resolveAsset(src: string): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? `${base}${src}` : `${base}/${src}`
}

function hasTrack(mode: MusicMode): boolean {
  return MUSIC_TRACKS[mode] !== undefined
}

/**
 * Streams a licensed file through the existing master bus. Everything is
 * optional: if the element or Web Audio graph cannot be created, the game
 * continues silently.
 */
export class BackgroundMusic {
  private readonly context: AudioContext
  private bus: GainNode | null = null
  private element: HTMLAudioElement | null = null
  private source: MediaElementAudioSourceNode | null = null
  private loadedSrc = ''
  private mode: MusicMode = 'silent'
  private volume: number
  private ducked = false
  private suspended = false
  private disposed = false
  private playToken = 0
  private pauseToken = 0
  private pauseTimer: ReturnType<typeof setTimeout> | null = null
  private retryArmed = false
  private retryHandler: (() => void) | null = null

  constructor(context: AudioContext, destination: AudioNode, volume = MUSIC_DEFAULT_VOLUME) {
    this.context = context
    this.volume = Math.min(1, Math.max(0, volume))
    this.bus = context.createGain()
    this.bus.gain.value = 0
    this.bus.connect(destination)
  }

  setMode(mode: MusicMode): void {
    if (this.disposed) return
    if (this.mode === mode) {
      // Renders happen on every dialogue advance; only retry a stalled element.
      if (hasTrack(mode) && !this.suspended && this.element?.paused !== false) void this.start()
      return
    }
    this.mode = mode
    const track = MUSIC_TRACKS[mode]
    if (!track) {
      this.fadeOutAndPause()
      return
    }
    if (!this.attachTrack(track)) return
    this.cancelPause()
    this.rampTo(this.targetGain(), FADE_IN_SECONDS)
    void this.start()
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    if (hasTrack(this.mode)) this.rampTo(this.targetGain(), SLIDER_SECONDS)
  }

  getVolume(): number {
    return this.volume
  }

  /** Duck under an advisor's mumble, then return after the line. */
  setDucked(ducked: boolean): void {
    if (this.ducked === ducked) return
    this.ducked = ducked
    if (hasTrack(this.mode) && !this.suspended) this.rampTo(this.targetGain(), DUCK_SECONDS)
  }

  /** Hidden tabs pause the media element rather than merely muting it. */
  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended || this.disposed) return
    this.suspended = suspended
    const element = this.element
    if (!element) return
    if (suspended) {
      this.playToken += 1
      this.cancelPause()
      try {
        element.pause()
      } catch {
        // Media element teardown is best-effort.
      }
      return
    }
    if (!hasTrack(this.mode)) return
    this.rampFromSilence(RESUME_SECONDS)
    void this.start()
  }

  getDebugInfo(): {
    mode: MusicMode
    title: string | null
    playing: boolean
    src: string
    volume: number
    ducked: boolean
    suspended: boolean
    gain: number
    currentTime: number
    contextState: AudioContextState | 'unavailable'
  } {
    const track = MUSIC_TRACKS[this.mode]
    return {
      mode: this.mode,
      title: track?.title ?? null,
      playing: Boolean(this.element && !this.element.paused && !this.element.ended),
      src: this.loadedSrc,
      volume: this.volume,
      ducked: this.ducked,
      suspended: this.suspended,
      gain: this.bus?.gain.value ?? 0,
      currentTime: this.element?.currentTime ?? 0,
      contextState: this.context.state,
    }
  }

  dispose(): void {
    this.disposed = true
    this.playToken += 1
    this.cancelPause()
    this.removeGestureRetry()
    const element = this.element
    if (element) {
      try {
        element.pause()
        element.removeAttribute('src')
        element.load()
        element.remove()
      } catch {
        // Ignore teardown failures.
      }
    }
    this.element = null
    try {
      this.source?.disconnect()
      this.bus?.disconnect()
    } catch {
      // Already disconnected.
    }
    this.source = null
    this.bus = null
  }

  private targetGain(): number {
    return hasTrack(this.mode) ? musicGainForVolume(this.volume, this.ducked) : 0
  }

  private attachTrack(track: MusicTrack): boolean {
    if (!this.bus) return false
    const element = this.ensureElement()
    if (!element) return false
    const src = resolveAsset(track.src)
    if (this.loadedSrc !== src) {
      this.loadedSrc = src
      element.src = src
      try {
        element.load()
      } catch {
        return false
      }
    }
    if (!this.source) {
      try {
        this.source = this.context.createMediaElementSource(element)
        this.source.connect(this.bus)
      } catch {
        return false
      }
    }
    return true
  }

  private ensureElement(): HTMLAudioElement | null {
    if (this.element) return this.element
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
    try {
      const element = new Audio()
      element.loop = true
      element.preload = 'auto'
      element.volume = 1
      element.style.display = 'none'
      element.setAttribute('aria-hidden', 'true')
      element.dataset.musicTrack = 'true'
      document.body.append(element)
      this.element = element
      return element
    } catch {
      return null
    }
  }

  private async start(): Promise<void> {
    const element = this.element
    if (
      !element ||
      this.disposed ||
      this.suspended ||
      !hasTrack(this.mode) ||
      this.context.state === 'closed'
    ) {
      return
    }
    const token = ++this.playToken
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume()
      } catch {
        return
      }
    }
    if (token !== this.playToken || this.suspended || this.disposed || !hasTrack(this.mode)) return
    try {
      await element.play()
      // A newer start() must not be paused by an older resolution; only the
      // current intent decides. A mode change during loading ends playback.
      if (this.disposed || this.suspended || !hasTrack(this.mode)) {
        element.pause()
        return
      }
      this.removeGestureRetry()
    } catch {
      // Autoplay can still refuse after a soft resume in some browsers.
      this.armGestureRetry()
    }
  }

  private fadeOutAndPause(): void {
    this.playToken += 1
    this.rampTo(0, FADE_OUT_SECONDS)
    const element = this.element
    if (!element) return
    this.cancelPause()
    const token = ++this.pauseToken
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null
      if (token !== this.pauseToken || hasTrack(this.mode)) return
      try {
        element.pause()
      } catch {
        // Ignore.
      }
    }, FADE_OUT_SECONDS * 1000 + 60)
  }

  private cancelPause(): void {
    this.pauseToken += 1
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer)
      this.pauseTimer = null
    }
  }

  private rampTo(value: number, seconds: number): void {
    if (!this.bus) return
    const now = this.context.currentTime
    const target = Math.max(0, value)
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setValueAtTime(this.bus.gain.value, now)
    this.bus.gain.linearRampToValueAtTime(target, now + Math.max(0.01, seconds))
  }

  private rampFromSilence(seconds: number): void {
    if (!this.bus) return
    const now = this.context.currentTime
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setValueAtTime(0, now)
    this.bus.gain.linearRampToValueAtTime(this.targetGain(), now + Math.max(0.01, seconds))
  }

  private armGestureRetry(): void {
    if (this.retryArmed || typeof window === 'undefined') return
    this.retryArmed = true
    const retry = (): void => {
      this.retryArmed = false
      this.retryHandler = null
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      if (!this.disposed && hasTrack(this.mode) && !this.suspended) void this.start()
    }
    this.retryHandler = retry
    window.addEventListener('pointerdown', retry, { once: true })
    window.addEventListener('keydown', retry, { once: true })
  }

  private removeGestureRetry(): void {
    if (!this.retryHandler || typeof window === 'undefined') return
    window.removeEventListener('pointerdown', this.retryHandler)
    window.removeEventListener('keydown', this.retryHandler)
    this.retryHandler = null
    this.retryArmed = false
  }
}
