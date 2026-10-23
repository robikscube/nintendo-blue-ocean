Product Requirement Document (PRD)Procedural Mumble Speech Engine (Web Audio API)1. Context & PurposeImplement a lightweight, standalone, zero-dependency procedural audio engine for HTML5/JS web games. The engine synthesizes dynamic NPC "mumble speech" directly from dialogue strings using the browser's native Web Audio API.It eliminates the need for recorded audio files, ensuring instant web load times (< 50 KB total footprint) and infinite dialogue scalability.2. High-Level Architecture[ Dialogue Text String ]
         │
         ▼
[ Typewriter Loop ] ──(Dynamic Delays based on Punctuation)
         │
         ▼
[ Syllable / Vowel Gate ] ──(Triggers audio ONLY at start of vowel groups)
         │
         ▼
[ Pitch Calculator ] ──(Base Pitch + Phrase Intonation + Micro-Jitter + LFO Wobble)
         │
         ▼
[ Formant Synthesizer Engine ]
  ├── 1. Sawtooth Oscillator (Vocal Cord Buzz)
  ├── 2. 3-Band Biquad Filter Bank (Vocal Tract Formants: F1, F2, F3)
  ├── 3. White Noise Source (Soft Breath Airflow)
  └── 4. Gain Node Envelope (ASR: Attack / Hold / Decay)
         │
         ▼
[ AudioContext Destination ]
3. Core Requirements & Specifications3.1 Typewriter & Timing EngineLetter Timing: Base interval between characters (~30ms to 35ms).Punctuation Delay Multipliers:Standard letter: $1.0\times$ (~33ms)Comma (,): $3.0\times$ (~100ms)Sentence End (., ?, !): $6.0\times$ (~200ms)Ellipsis (...): Extended pause (~300ms) with volume fade-out.Instant Text Reveal: If the player inputs a skip action (e.g., Spacebar / Click), reveal full text instantly and stop audio generation immediately.3.2 Audio Filtering & Syllable TriggeringVowel Gating: Audio MUST ONLY trigger when encountering the start of a vowel cluster ([aeiouAEIOU]). Non-vowels advance typewriter text silently.Audio Overlap: Each synthesized syllable sound duration should be slightly longer than the interval before the next syllable (~60ms–90ms duration) to create smooth, natural blending.3.3 Formant Synthesis (Vocal Tract Simulation)Oscillator Source: Sawtooth wave (sawtooth) representing raw vocal cord vibration.3-Band Resonator (Formants): Pass the raw buzz through three parallel or series BiquadFilterNode instances configured as bandpass with a high Quality factor ($Q \approx 6 - 12$).Vowel Target Formants (Hz):A: $F_1 = 730$, $F_2 = 1090$, $F_3 = 2440$E: $F_1 = 270$, $F_2 = 2290$, $F_3 = 3010$I: $F_1 = 300$, $F_2 = 2200$, $F_3 = 2900$O: $F_1 = 570$, $F_2 = 840$, $F_3 = 2410$U: $F_1 = 300$, $F_2 = 870$, $F_3 = 2240$Breath Noise: Mix low-gain shaped white noise buffer (~5% – 10% gain) into the master gain to add air to the vocal sound.3.4 Intonation, Pitch & Character ProfilesFor every triggered syllable, compute:$$\text{Pitch} = \text{BasePitch} \times \text{TubeScale} + \text{PhraseDrift} + \text{Jitter} + \text{AgeWobble}$$Tube Scale: Scaling factor that moves all formant filter frequencies up or down together:Short tube (Child / Fairy): Scale factor $1.3\times - 1.5\times$Long tube (Large Guard / Orc): Scale factor $0.6\times - 0.8\times$Phrase Pitch Drift: Linear frequency drop over the length of a sentence phrase, resetting after commas/periods.Punctuation Inflection:Question (?): Pitch bends upward on the final syllable.Exclamation (!): Starts phrase at $+20\%$ higher pitch.ALL CAPS: $+15\%$ pitch bump and $+25\%$ gain boost.Micro-Jitter: Random per-note frequency deviation ($\pm 2\text{--}4\text{ Hz}$) to prevent robotic repetition.Old Age Wobble: LFO sine modulation (~$2\text{--}3\text{ Hz}$) altering pitch dynamically over time.4. Character Presets SchemaDefine voice profiles as clean JS objects or JSON:JavaScriptconst VOICE_PRESETS = {
  guard: {
    basePitch: 85,          // Low fundamental frequency (Hz)
    tubeScale: 0.75,        // Long vocal tract (lower formants)
    pitchJitter: 3,         // Low jitter
    wobbleFreq: 0,          // No wobble
    wobbleAmount: 0,
    speedMultiplier: 1.1
  },
  child: {
    basePitch: 260,         // High fundamental frequency (Hz)
    tubeScale: 1.4,         // Short vocal tract (higher formants)
    pitchJitter: 8,
    wobbleFreq: 0,
    wobbleAmount: 0,
    speedMultiplier: 0.85
  },
  elderly: {
    basePitch: 110,
    tubeScale: 0.95,
    pitchJitter: 6,
    wobbleFreq: 2.5,        // 2.5 Hz vibrato LFO
    wobbleAmount: 12,       // Wobble magnitude
    speedMultiplier: 1.2
  }
};
5. API Interface / Public Class ContractThe engineer/Claude Code should expose a clean JS class:TypeScriptclass MumbleVoiceEngine {
  constructor(audioContext?: AudioContext);
  
  // Set voice characteristics
  public setVoiceProfile(profile: VoiceProfile): void;
  
  // Primary typewriter + voice trigger function
  public typeText(
    text: string, 
    onCharTyped?: (char: string, index: number) => void,
    onComplete?: () => void
  ): Promise<void>;

  // Immediately stop typewriter and audio output
  public stop(): void;
  
  // Audio state management
  public resumeContext(): Promise<void>;
}
6. Acceptance CriteriaZero External Samples: Audio generation must rely exclusively on AudioContext native nodes (OscillatorNode, BiquadFilterNode, GainNode).Autoplay Compliance: Include resumeContext() handling for browser user interaction requirements (AudioContext unlocked on first click/keypress).Punctuation Naturalism: Text rendering visibly pauses at commas and periods, accompanied by corresponding pitch inflection drops/bends.Performance: Running text typing loop must consume $< 1\%$ CPU on standard modern browsers with zero memory leaks (clean up audio node graph on completion).No Visual / Audio Desync: Stopping or skipping text output immediately stops all audio synthesis without lingering trailing tones or clicks/pops.