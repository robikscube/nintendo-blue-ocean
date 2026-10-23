# Procedural Speech — Implementation Report

**Date:** 2026-10-22 (afternoon)
**Engineer:** nintendo-91, dedicated procedural speech engineer
**Scope:** `Procedural_speech_prd.md` integrated into `blue-ocean-game/`
**Deployment:** none. No commits, pushes, external services, or paid APIs.

## Verdict

The game now uses an original, sample-free Web Audio formant mumble synthesiser driven by the existing dialogue typewriter and speaker. All five advisors have distinct profiles; Shelldon (turtle) and Pawson (bear) are the lowest voices, Slyvester (fox) is the highest and fastest, and Hootley (owl) / Damian (beaver) have separate breath, formant, jitter, and wobble signatures. Punctuation changes both visible reveal timing and phrase intonation. Mute, skip, line changes, hidden tabs, restart/reset, and autoplay gating stop or suppress synthesis without altering story flow.

Final verified results:

- `npm run typecheck` — pass.
- `npm test -- --reporter=dot` — **78/78 tests pass in 7 files** (was 58 before this work).
- `npm run build` — pass. Existing 500 kB Vite chunk warning remains; no build errors.
- Relevant Playwright suite — **10/10 pass** (`interactions`, `dialogue-bubble`, new `procedural-speech`), including a full four-vote story walkthrough and the new browser audio lifecycle test. The new speech test also passed **3/3** consecutive runs with `--repeat-each=3` to check timing stability.

## Coordination and ownership

I attempted to notify the only other live session, `blue-ocean-game-67` (idle), before editing and asked it to keep off the speech files. The cross-session message was held for approval and then expired without delivery because the sessions' permission modes differ; it was not seen by that session. I did not resend while held.

To minimize collision risk:

- All engine work lives in three new source files.
- Existing-file edits are confined to `src/audio/audio.ts` and `src/ui/ui.ts` (plus a README section).
- Pre-edit copies of both existing source files are saved at
  `agent-reports/procedural-speech-20261022/backups/`.
- File hashes and modification times are recorded at
  `agent-reports/procedural-speech-20261022/changed-file-hashes.txt`.
- No concurrent modification was observed in the owned files while working.

**Exclusive ownership claim:** `src/audio/mumble-voice.ts`, `src/audio/voice-profiles.ts`, `src/audio/speech-timeline.ts`, `tests/voice-profiles.test.ts`, `tests/speech-timeline.test.ts`, `tests/mumble-voice.test.ts`, `tests/e2e/procedural-speech.spec.ts`, plus the speech call sites in `src/audio/audio.ts` and `src/ui/ui.ts`.

## Files

### New

- `blue-ocean-game/src/audio/voice-profiles.ts`
  - Five advisor profiles and the PRD F1/F2/F3 vowel targets.
  - Advisor-to-voice mapping; narrator intentionally has no voice.
- `blue-ocean-game/src/audio/speech-timeline.ts`
  - Pure, deterministic typewriter + vowel-event planner.
  - Vowel-cluster gating, comma/sentence/ellipsis pauses, question bend, exclamation and ALL-CAPS lift, phrase drift, compression, and presentation-rate thinning.
- `blue-ocean-game/src/audio/mumble-voice.ts`
  - `MumbleVoiceEngine` with the PRD API plus game integration methods.
  - Sawtooth source, three parallel band-pass formants, generated breath noise, ADSR gain, jitter/wobble, node cleanup, fade on stop, standalone `typeText`.
- `blue-ocean-game/tests/voice-profiles.test.ts`
- `blue-ocean-game/tests/speech-timeline.test.ts`
- `blue-ocean-game/tests/mumble-voice.test.ts`
- `blue-ocean-game/tests/e2e/procedural-speech.spec.ts`
- This report.

### Modified

- `blue-ocean-game/src/audio/audio.ts`
  - Owns one `AudioContext` + master bus as before.
  - Creates the mumble engine after the first gesture unlock.
  - Adds `beginSpeech`, `triggerSpeech`, `finishSpeech`, `stopSpeech`, and `getSpeechDebug`.
  - Mute now immediately stops voice nodes as well as ramping the master.
- `blue-ocean-game/src/ui/ui.ts`
  - Replaced the old interval-driven `blip()` calls with the shared speech timeline.
  - Reveals characters and fires vowel events from the same clock.
  - Natural completion lets the final short tail finish; skip/hidden-tab use an immediate fade-and-disconnect.
  - New lines, hide, reset, and restart paths call `stopSpeech`.
- `blue-ocean-game/README.md`
  - Added a concise description of the sample-free engine, profiles, controls, and pacing tradeoff.
- `BUILD_STATUS.md`
  - Appended a clearly scoped procedural-speech addendum; no existing status content was replaced.

## Voice design

| Advisor | Internal id | Base pitch | Tube scale | Character |
|---|---|---:|---:|---|
| Hootley (Owl) | `mori` | 196 Hz | 1.06 | mid-soft, breathy, gentle 0.45 Hz wobble |
| Slyvester (Fox) | `pip` | 305 Hz | 1.24 | high, quick, bright, no wobble |
| Damian (Beaver) | `bolt` | 138 Hz | 0.96 | dry, sturdy middle-low |
| Pawson (Bear) | `grumble` | 88 Hz | 0.72 | notably low, mellow, slow |
| Shelldon (Turtle) | `shell` | 68 Hz | 0.66 | lowest, slowest, oldest 2.3 Hz wobble |

Formants use the exact PRD targets:

- A: 730 / 1090 / 2440 Hz
- E: 270 / 2290 / 3010 Hz
- I: 300 / 2200 / 2900 Hz
- O: 570 / 840 / 2410 Hz
- U: 300 / 870 / 2240 Hz

All formant frequencies are scaled by the profile's tube factor. The fundamental is authored separately rather than multiplied by a very small tube factor, which keeps Shelldon and Pawson audible on laptop/projector speakers while still giving them the lowest vocal tracts. The synthesis graph uses only native Web Audio nodes and a generated noise buffer; there are no samples, TTS, CDNs, or network assets.

## Behaviour implemented

- **Vowel gate:** only the first character of an `[aeiou]` cluster can trigger a note. Consonants reveal silently.
- **Typewriter timing:** comma/semicolon/colon = 3×, `.?!` = 6×, ellipsis = one ~300 ms pause. In the game these ratios are compressed to preserve the existing sub-second line cap; the standalone API retains the literal 33 ms PRD cadence.
- **Intonation:** linear phrase drift, reset at punctuation; final question syllable ramps up; exclamatory phrases lift; ALL-CAPS gets pitch and gain emphasis; ellipsis tail is quieter.
- **Overlap/performance:** each note is 60–90 ms. The game thins the compressed timeline to about one vowel hand-off per 100 ms (≈10/s) and preserves the first and final vowels so the line never turns into a dense buzz.
- **Autoplay:** audio is created only after the existing first pointer/key gesture. If a tab/OS suspension outlives that gesture, the next line attempts a resume before beginning; if the context is unavailable, the story and typewriter continue silently.
- **Mute:** immediate stop plus zero master gain; the typewriter continues.
- **Skip:** first click completes the line and calls an immediate 15 ms fade, stops scheduled sources, disconnects nodes.
- **New line / restart / reset / hidden tab:** stop the current utterance and release nodes. Natural completion leaves only the short final tail, then disconnects.
- **Cleanup:** each oscillator/noise source has an `ended` cleanup; output buses and node sets have timer backstops; no timers survive `stop()`.
- **UI/reduced disruption:** no DOM layout changes, no new controls, no changes to dialogue data, votes, camera, or scene animations. Narrator and reduced-motion modes remain silent.
- **PRD API:** `MumbleVoiceEngine` exposes `setVoiceProfile`, `typeText`, `stop`, and `resumeContext`. The game's UI uses the shared engine at a lower level so its existing accessibility and deadline logic stays intact.

## Verification — exact commands and results

Run from `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game`.

Baseline before changes:

```powershell
npm run typecheck
npm test -- --reporter=dot
```

Result: typecheck pass; **58/58** existing unit tests pass.

Final:

```powershell
npm run typecheck
npm test -- --reporter=dot
npm run build
npx playwright test tests/e2e/interactions.spec.ts tests/e2e/dialogue-bubble.spec.ts tests/e2e/procedural-speech.spec.ts --reporter=list
```

Results:

- Typecheck — pass (`agent-reports/procedural-speech-20261022/typecheck.log`).
- Unit tests — **78 passed / 78**, 7 files (`.../unit-tests.log`).
  - 5 new voice-profile checks.
  - 9 new timeline checks (including one ellipsis pause, question bend, caps/exclamation, compression, and thinning).
  - 6 new engine checks (formant graph, mute, narrator rejection, skip cleanup, standalone typeText completion, stop cancellation).
- Build — pass (`.../build.log`). Vite reports the pre-existing >500 kB chunk warning only.
- Playwright — **10 passed / 10**, 3.3 minutes (`.../relevant-e2e.log`); the speech spec also passed 3/3 repeated runs:
  - Full four-vote dialogue-bubble walkthrough.
  - Bubble layout at 1920/1366/1024 widths.
  - Existing timed dialogue, skip, mute, and WebGL-fallback tests.
  - New speech test: audio context remains unavailable before gesture; unlocks on click; follows `shell` then `mori`; produces active sources; first click on a typing line cuts speech; next line starts a fresh profile; mute stops active nodes without leaving the opening phase. The timing-sensitive checks run their wait/read/click loops inside one page task, and the spec passed three consecutive runs.

The new browser test uses the public `AudioEngine.getSpeechDebug()` probe (profile id, context state, running, muted, active source count) rather than reading page-global private fields.

## Deliberate tradeoff

The PRD's literal 33 ms per letter would make a 130-character classroom line take ~4.3 seconds, conflicting with the project's established sub-second reveal and presenter pacing. The game therefore keeps its current 260–1000 ms typewriter cap and compresses the PRD's relative punctuation delays into that window. `MumbleVoiceEngine.typeText()` still uses the literal 33 ms cadence for standalone reuse. This preserves the PRD behaviour without regressing the presentation UX.

The classroom thinning similarly limits dense audio to roughly ten vowel hand-offs per second, matching the technical spec's throttle guidance. All vowel gating, punctuation, and per-character speaker identity remain deterministic.

## Known limits / next priorities

- I verified the browser node graph, state transitions, skip/mute cleanup, and absence of page errors, but did not perform a subjective listening mix on the target projector/laptop. A short presenter soundcheck is still worthwhile; profile gains are intentionally conservative under the existing 0.13 master multiplier.
- Only the relevant Playwright specs were rerun, not the entire 34/42-test deep suite. The full four-vote dialogue-bubble flow passed, and no non-speech files were changed.
- The new E2E test assumes Chromium provides a running Web Audio context after a trusted click; it passed here. The app remains playable if audio is unavailable.
- No historical content, dialogue copy, vote state, character assets, or deployment configuration was changed.
