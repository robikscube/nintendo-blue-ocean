# Trace Cleanup Failure — Root Cause and Resolution

**Date of incident:** 2026-10-21 ~23:52 PT  
**Investigated/resolved:** 2026-10-22 07:34–08:00 PT  
**Verdict:** Playwright artifact-directory collision between two concurrent runs. **Not an application defect and not a test-logic defect.**

## 1. Symptom

Two tests were recorded as failed in `blue-ocean-game/test-results/.last-run.json`:

- `team-branches.spec.ts › every D1 branch builds its own labeled concept › D1 A reaches a distinct factory concept`
- `team-presenter-resilience.spec.ts › checkpoints and reset › refresh preserves a draft vote and committed factory, and reset clears the demo`

Both error contexts contain only a teardown error:

```text
Error: browserContext.close: ENOENT: no such file or directory, open
'...\test-results\.playwright-artifacts-0\traces\resources\8c0fee...jsonl'

Error: browserContext.close: ENOENT: no such file or directory, open
'...\test-results\.playwright-artifacts-0\traces\b54bd74d...-recording4.trace'
```

There is no assertion failure in either context. The failure is raised while closing the browser context, after the test body. The presenter trace zip that survived is incomplete (47,915 bytes: only `test.trace` plus one attachment, no resource files).

## 2. Root cause

Playwright clears each project's `outputDir` at the start of every run, recursively:

- Installed Playwright 1.64.1: `blue-ocean-game/node_modules/playwright/lib/runner/index.js:6586-6603` (`createRemoveOutputDirsTask`, `removeFolders4([outputDir])`).
- Worker artifacts are written under `<outputDir>/.playwright-artifacts-<workerIndex>` (`runner/index.js:5627-5666`).

At the time, all three configurations used the default `test-results` directory:

- `playwright.config.ts` — no `outputDir`
- `playwright.team.config.ts` — no `outputDir`
- `playwright.preview.config.mjs` — no `outputDir`

Two Playwright invocations overlapped. The second run's "clear output" task deleted the first run's live `.playwright-artifacts-0` tree. When the first run's context closed, it tried to write/rename its trace files into the now-missing directory and raised `ENOENT`.

## 3. Evidence

1. **Different run paths in the same artifact directory** — the two error contexts reference different test locations: `tests\e2e\team-branches.spec.ts:104:5` and `tests\team-presenter-resilience.spec.ts:147:3`. A single run cannot execute both path layouts. They came from different configs/runs writing to the same default output directory.
2. **Lead's contemporaneous coordination message** (QA transcript, 2026-10-21T06:53:45Z / 23:53:45 PT):
   > "my check of the new `playwright.team.config.ts` overlapped your move of `team-*.spec.ts` into tests/e2e and your full-suite run. The current `browserContext.close: ENOENT ... .playwright-artifacts-0/traces/...` failures are artifact-directory collisions from two Playwright processes, not product failures or test logic. I have stopped all Playwright/build runs..."
3. **Concurrent processes observed** — QA's process inspection at 06:31:50Z showed a preview Playwright run (PIDs 55032/34752, worker 57040) active while the QA/lead team runs were being prepared.
4. **Playwright source** — the recursive clear-output task is unconditional unless `preserveOutputDir` is set; see §2.
5. **Partial trace artifacts** — the saved presenter `trace.zip` lacks its resource files, exactly the files deleted by the other run's cleanup.

**Confidence:** high. The mechanism is reproduced by Playwright's own setup code and corroborated by mixed run paths, concurrent process evidence, and the lead's message. No alternative explanation (disk full, permission error, crash) fits: the errors are `ENOENT`, not `EPERM`/`ENOSPC`, and the files were present earlier in the same run.

## 4. Resolution

1. **Immediate (QA, 2026-10-21):** stopped the overlapping Playwright runs, then reran the complete suite once in isolation:
   - Command: `npx playwright test --config=playwright.team.config.ts --trace=off --output=.../tmp/qa-team-results`
   - Result: **26/26 passed in 9.2 min**, exit 0. Raw log preserved at `qa-prior-26-passed.log`.
2. **Fresh lead rerun (2026-10-22 07:36–07:49):**
   - Command: `npx playwright test --config=playwright.team.config.ts --trace=off --output=.../playwright-team-results`
   - Result: **26/26 passed in 12.3 min**, exit 0. Log: `team-26-consolidated.log`.
3. **Durable fix in repository configs:**
   - `playwright.config.ts` → `outputDir: './test-results/default'`
   - `playwright.team.config.ts` → `outputDir: './test-results/team'`
   - `playwright.preview.config.mjs` → `outputDir: './test-results/preview'`
   These are sibling directories, so no run's recursive cleanup can delete another run's artifacts. Typecheck passed after the edit; `--list` still discovers 26 team tests.
4. **Trace-on regression proof:** the two formerly failing tests were rerun with tracing explicitly enabled and the isolated output dir:
   - Command: `npx playwright test --config=playwright.team.config.ts --trace=on --grep "D1 A reaches a distinct factory concept|refresh preserves a draft vote and committed factory"`
   - Result: **2/2 passed in 56.5s**, exit 0.
   - Complete traces produced: 240,667 bytes (D1 A) and 2,124,589 bytes (presenter reset), preserved under `trace-evidence/`.
   - No `ENOENT`, no partial trace.
5. **Final source rerun:** see `team-26-final.log` / `BUILD_STATUS.md` for the post-loader-fix full-suite result.

## 5. Operating rule

- Do not run two Playwright invocations concurrently against the same `outputDir`.
- The three configs now isolate artifacts. If an ad-hoc run uses `--output`, give it a unique path.
- For long classroom sweeps, `--trace=off` avoids large trace I/O; keep `trace: 'retain-on-failure'` for targeted debugging.
- `ENOENT` during `browserContext.close` with `.playwright-artifacts-*` in the path should be treated as a harness collision first, not an app bug, until reproduced alone.

## 6. Evidence index

- `blue-ocean-game/test-results/.last-run.json` and the two `error-context.md` files (incident artifacts, preserved).
- `blue-ocean-game/test-results/team-presenter-.../trace.zip` (incomplete trace, preserved).
- `qa-prior-26-passed.log` (QA isolated 26/26).
- `team-26-consolidated.log` (lead isolated 26/26).
- `trace-on-regression.log`, `trace-evidence/` (trace-on 2/2 and complete traces).
- `config-isolation-check.log` (typecheck + 26-test discovery after the fix).
- `team-26-final.log` (final-source full suite).
