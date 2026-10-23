import { afterEach, describe, expect, it, vi } from 'vitest'
import { MumbleVoiceEngine, VOICE_BUS_GAIN } from '../src/audio/mumble-voice'
import { buildSpeechTimeline } from '../src/audio/speech-timeline'
import { VOICE_PROFILES } from '../src/audio/voice-profiles'

interface ParamCall {
  method: string
  value: number
  time: number
}

class FakeParam {
  value = 0
  calls: ParamCall[] = []

  setValueAtTime(value: number, time: number): FakeParam {
    this.value = value
    this.calls.push({ method: 'set', value, time })
    return this
  }

  linearRampToValueAtTime(value: number, time: number): FakeParam {
    this.value = value
    this.calls.push({ method: 'linear', value, time })
    return this
  }

  exponentialRampToValueAtTime(value: number, time: number): FakeParam {
    this.value = value
    this.calls.push({ method: 'exponential', value, time })
    return this
  }

  setTargetAtTime(value: number, time: number, _constant: number): FakeParam {
    this.value = value
    this.calls.push({ method: 'target', value, time })
    return this
  }

  cancelScheduledValues(_time: number): FakeParam {
    return this
  }
}

class FakeNode {
  connected: unknown[] = []
  disconnected = false

  connect(destination: unknown): void {
    this.connected.push(destination)
  }

  disconnect(): void {
    this.disconnected = true
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine'
  frequency = new FakeParam()
  detune = new FakeParam()
  onended: (() => void) | null = null
  starts: number[] = []
  stops: number[] = []

  start(when = 0): void {
    this.starts.push(when)
  }

  stop(when = 0): void {
    this.stops.push(when)
  }
}

class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass'
  frequency = new FakeParam()
  Q = new FakeParam()
  gain = new FakeParam()
}

class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null
  loop = false
  onended: (() => void) | null = null
  starts: number[] = []
  stops: number[] = []

  start(when = 0): void {
    this.starts.push(when)
  }

  stop(when = 0): void {
    this.stops.push(when)
  }
}

class FakeBuffer {
  readonly channels: Float32Array[]

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    const data = this.channels[channel]
    if (!data) throw new Error('Missing fake audio channel')
    return data
  }
}

class FakeAudioContext {
  currentTime = 0
  sampleRate = 48_000
  state: AudioContextState = 'running'
  destination = new FakeNode()
  gains: FakeGain[] = []
  oscillators: FakeOscillator[] = []
  filters: FakeFilter[] = []
  sources: FakeBufferSource[] = []
  buffers: FakeBuffer[] = []

  createGain(): FakeGain {
    const node = new FakeGain()
    this.gains.push(node)
    return node
  }

  createOscillator(): FakeOscillator {
    const node = new FakeOscillator()
    this.oscillators.push(node)
    return node
  }

  createBiquadFilter(): FakeFilter {
    const node = new FakeFilter()
    this.filters.push(node)
    return node
  }

  createBufferSource(): FakeBufferSource {
    const node = new FakeBufferSource()
    this.sources.push(node)
    return node
  }

  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    const buffer = new FakeBuffer(channels, length, sampleRate)
    this.buffers.push(buffer)
    return buffer
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }
}

function makeEngine(profile = VOICE_PROFILES.mori) {
  const context = new FakeAudioContext()
  let randomState = 0.13
  const engine = new MumbleVoiceEngine(
    context as unknown as AudioContext,
    context.destination as unknown as AudioNode,
    () => {
      randomState = (randomState + 0.137) % 1
      return randomState
    },
  )
  engine.setVoiceProfile(profile)
  return { context, engine }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MumbleVoiceEngine', () => {
  it('synthesizes a sawtooth through three formant bands plus breath', () => {
    const { context, engine } = makeEngine(VOICE_PROFILES.mori)
    expect(engine.beginLine()).toBe(true)
    const timeline = buildSpeechTimeline('Ah', VOICE_PROFILES.mori)
    const syllable = timeline.syllables[0]
    expect(syllable).toBeDefined()
    if (!syllable) throw new Error('Expected a vowel event')

    expect(engine.triggerSyllable(syllable)).toBe(true)

    const voiceOscillator = context.oscillators.find((oscillator) => oscillator.type === 'sawtooth')
    expect(voiceOscillator).toBeDefined()
    expect(voiceOscillator?.starts.length).toBe(1)
    expect(voiceOscillator?.stops.length).toBe(1)

    const formantFilters = context.filters.filter((filter) => filter.type === 'bandpass')
    expect(formantFilters.length).toBeGreaterThanOrEqual(4)
    const expected = [730, 1090, 2440].map((formant) => formant * VOICE_PROFILES.mori.tubeScale)
    for (const target of expected) {
      expect(formantFilters.some((filter) => Math.abs(filter.frequency.value - target) < 0.01)).toBe(true)
    }
    expect(formantFilters[0]?.Q.value).toBeCloseTo(VOICE_PROFILES.mori.formantQ, 5)
    expect(context.sources.some((source) => source.buffer !== null && source.loop)).toBe(true)
    expect(context.gains[0]?.gain.value).toBe(VOICE_BUS_GAIN)
  })

  it('does not create audio while muted or with no active line', () => {
    const { context, engine } = makeEngine(VOICE_PROFILES.pip)
    const timeline = buildSpeechTimeline('Ah', VOICE_PROFILES.pip)
    const syllable = timeline.syllables[0]
    if (!syllable) throw new Error('Expected a vowel event')

    expect(engine.triggerSyllable(syllable)).toBe(false)
    engine.setMuted(true)
    expect(engine.beginLine()).toBe(false)
    expect(engine.triggerSyllable(syllable)).toBe(false)
    expect(context.oscillators).toHaveLength(0)
  })

  it('maps the five advisors and refuses a narrator voice', () => {
    const { engine } = makeEngine()
    expect(engine.setVoiceProfileById('pip')).toBe(true)
    expect(engine.getProfile().id).toBe('pip')
    expect(engine.setVoiceProfileById('narrator')).toBe(false)
    expect(engine.getProfile().id).toBe('pip')
  })

  it('fades the utterance bus and disconnects on skip', () => {
    vi.useFakeTimers()
    const { context, engine } = makeEngine(VOICE_PROFILES.grumble)
    expect(engine.beginLine()).toBe(true)
    const output = context.gains[0]
    const timeline = buildSpeechTimeline('Low', VOICE_PROFILES.grumble)
    const syllable = timeline.syllables[0]
    if (!syllable) throw new Error('Expected a vowel event')
    expect(engine.triggerSyllable(syllable)).toBe(true)

    engine.stop()
    expect(output?.gain.calls.some((call) => call.method === 'linear' && call.value < 0.01)).toBe(true)
    expect(context.sources.every((source) => source.stops.length > 0)).toBe(true)
    vi.runAllTimers()
    expect(output?.disconnected).toBe(true)
  })

  it('disconnects the previous utterance when a new line begins immediately', () => {
    vi.useFakeTimers()
    const { context, engine } = makeEngine(VOICE_PROFILES.mori)
    expect(engine.beginLine()).toBe(true)
    const firstOutput = context.gains[0]
    engine.finishLine()
    // The UI stops the old line and then beginLine() stops once more.
    engine.stop()
    expect(engine.beginLine()).toBe(true)

    vi.runAllTimers()
    expect(firstOutput?.disconnected).toBe(true)
  })

  it('types visibly, speaks only vowel clusters, completes, and cleans up', async () => {
    vi.useFakeTimers()
    const { context, engine } = makeEngine(VOICE_PROFILES.pip)
    const typed: string[] = []
    let completions = 0
    const promise = engine.typeText(
      'Ape ape.',
      (character) => typed.push(character),
      () => {
        completions += 1
      },
    )

    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
    expect(typed.join('')).toBe('Ape ape.')
    expect(completions).toBe(1)
    expect(context.oscillators).toHaveLength(4)
    expect(context.oscillators.every((oscillator) => oscillator.type === 'sawtooth')).toBe(true)
  })

  it('resolves and cuts audio immediately when typeText is stopped', async () => {
    vi.useFakeTimers()
    const { context, engine } = makeEngine(VOICE_PROFILES.shell)
    const typed: string[] = []
    let completions = 0
    const promise = engine.typeText(
      'Hello there',
      (character) => typed.push(character),
      () => {
        completions += 1
      },
    )

    await vi.advanceTimersByTimeAsync(40)
    engine.stop()
    await expect(promise).resolves.toBeUndefined()
    await vi.runAllTimersAsync()
    expect(completions).toBe(0)
    expect(typed.length).toBeLessThan('Hello there'.length)
    const output = context.gains[0]
    expect(output?.gain.calls.some((call) => call.method === 'linear' && call.value < 0.01)).toBe(true)
  })
})
