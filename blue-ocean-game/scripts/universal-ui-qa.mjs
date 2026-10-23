#!/usr/bin/env node
/**
 * Workstream D — Universal Round 1 UI QA runner.
 *
 * Read-only with respect to the game. It:
 *   1. verifies PROTECTED_BASELINE.sha256,
 *   2. runs typecheck and unit tests,
 *   3. starts Vite on a dedicated QA port (5188),
 *   4. runs tests/e2e/universal-ui.spec.ts against it,
 *   5. builds the production bundle and smoke-tests `vite preview` on 4188.
 *
 * It never deploys, installs, fetches remote assets, or edits game source.
 * Usage: node scripts/universal-ui-qa.mjs
 */

import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.resolve(__dirname, '..')
const REPORT_DIR = path.resolve(PROJECT, '..', 'agent-reports', 'universal-ui')
const SCREEN_DIR = path.join(REPORT_DIR, 'screens')
const LOG_DIR = path.join(SCREEN_DIR, 'logs')
const DEV_PORT = 5188
const PREVIEW_PORT = 4188
const DEV_URL = `http://127.0.0.1:${DEV_PORT}`
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`
const PLAYWRIGHT_CLI = path.join(PROJECT, 'node_modules', '@playwright', 'test', 'cli.js')
const VITE_CLI = path.join(PROJECT, 'node_modules', 'vite', 'bin', 'vite.js')

const results = []
let devServer = null
let previewServer = null

mkdirSync(LOG_DIR, { recursive: true })

function log(line = '') {
  console.log(line)
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: PROJECT,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      if (options.echo) process.stdout.write(text)
    })
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      if (options.echo) process.stderr.write(text)
    })
    child.on('error', (error) => resolve({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }))
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

async function waitForHttp(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (response.ok) return true
    } catch {
      // Retry until the timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  return false
}

function startVite(mode, port) {
  const args = [VITE_CLI, mode, '--host', '127.0.0.1', '--port', String(port), '--strictPort']
  const child = spawn(process.execPath, args, { cwd: PROJECT, windowsHide: true })
  let output = ''
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString()
  })
  return { child, getOutput: () => output }
}

async function stopServer(handle) {
  if (!handle) return
  handle.child.kill('SIGTERM')
  await new Promise((resolve) => setTimeout(resolve, 800))
  if (!handle.child.killed) handle.child.kill('SIGKILL')
}

// ---------------------------------------------------------------------------
// 1. Frozen asset / protected source hash audit
// ---------------------------------------------------------------------------

function hashAudit() {
  const baselinePath = path.join(REPORT_DIR, 'PROTECTED_BASELINE.sha256')
  if (!existsSync(baselinePath)) {
    record('frozen hash audit', false, `missing ${baselinePath}`)
    return
  }
  const lines = readFileSync(baselinePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const failures = []
  let checked = 0
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i)
    if (!match) {
      failures.push(`invalid baseline line: ${line}`)
      continue
    }
    const [, expected, relative] = match
    const filePath = path.resolve(PROJECT, relative)
    if (!existsSync(filePath)) {
      failures.push(`MISSING ${relative}`)
      continue
    }
    const actual = createHash('sha256').update(readFileSync(filePath)).digest('hex')
    checked += 1
    if (actual !== expected.toLowerCase()) {
      failures.push(`MISMATCH ${relative}\n  expected ${expected}\n  actual   ${actual}`)
    }
  }
  const detail = failures.length ? failures.join('\n') : `${checked}/${lines.length} files byte-identical`
  record('frozen assets and protected source hashes', failures.length === 0, detail)
}

// ---------------------------------------------------------------------------
// 2. Typecheck, unit tests, build
// ---------------------------------------------------------------------------

async function runStaticChecks() {
  const typecheck = await run('npm.cmd', ['run', 'typecheck'], { shell: true })
  writeFileSync(path.join(LOG_DIR, 'typecheck.log'), typecheck.stdout + typecheck.stderr)
  record('npm run typecheck', typecheck.code === 0, `exit ${typecheck.code}`)

  const unit = await run('npm.cmd', ['test'], { shell: true })
  writeFileSync(path.join(LOG_DIR, 'unit-tests.log'), unit.stdout + unit.stderr)
  const unitSummary = (unit.stdout.match(/(\d+)\s+passed/i) ?? [])[0] ?? ''
  record('npm test', unit.code === 0, `exit ${unit.code} ${unitSummary}`)

  const build = await run('npm.cmd', ['run', 'build'], { shell: true })
  writeFileSync(path.join(LOG_DIR, 'build.log'), build.stdout + build.stderr)
  record('npm run build', build.code === 0, `exit ${build.code}`)
  return build.code === 0
}

// ---------------------------------------------------------------------------
// 3. Dev-server Playwright suite on 5188
// ---------------------------------------------------------------------------

async function runDevSuite() {
  if (!(await portFree(DEV_PORT))) {
    record(`dev server on ${DEV_PORT}`, false, 'port already in use; refusing to collide')
    return false
  }
  devServer = startVite('', DEV_PORT)
  const ready = await waitForHttp(DEV_URL, 60_000)
  writeFileSync(path.join(LOG_DIR, 'dev-server.log'), devServer.getOutput())
  if (!ready) {
    record('Vite dev server 5188', false, 'did not become ready')
    return false
  }
  record('Vite dev server 5188', true, DEV_URL)

  const outputDir = path.join(PROJECT, 'test-results', 'universal-ui-qa')
  const args = [
    PLAYWRIGHT_CLI,
    'test',
    'tests/e2e/universal-ui.spec.ts',
    '--workers=1',
    '--reporter=list',
    `--output=${outputDir}`,
  ]
  const suite = await run(process.execPath, args, {
    echo: true,
    env: {
      UI_QA_URL: DEV_URL,
      UI_QA_SCREENS: SCREEN_DIR,
      UI_QA_STATIC: '0',
    },
  })
  writeFileSync(path.join(LOG_DIR, 'playwright-dev.log'), suite.stdout + suite.stderr)
  const summary =
    (suite.stdout.match(/(\d+)\s+passed/i) ?? [])[0] ??
    (suite.stdout.match(/(\d+)\s+failed/i) ?? [])[0] ??
    ''
  record('Playwright universal-ui suite (dev)', suite.code === 0, `exit ${suite.code} ${summary}`)
  return suite.code === 0
}

// ---------------------------------------------------------------------------
// 4. Static production preview smoke on 4188
// ---------------------------------------------------------------------------

async function runPreviewSmoke() {
  if (!(await portFree(PREVIEW_PORT))) {
    record(`preview server on ${PREVIEW_PORT}`, false, 'port already in use; refusing to collide')
    return false
  }
  previewServer = startVite('preview', PREVIEW_PORT)
  const ready = await waitForHttp(PREVIEW_URL, 60_000)
  writeFileSync(path.join(LOG_DIR, 'preview-server.log'), previewServer.getOutput())
  if (!ready) {
    record('vite preview 4188', false, 'did not become ready')
    return false
  }
  record('vite preview 4188 (production dist)', true, PREVIEW_URL)

  const outputDir = path.join(PROJECT, 'test-results', 'universal-ui-qa-static')
  const args = [
    PLAYWRIGHT_CLI,
    'test',
    'tests/e2e/universal-ui.spec.ts',
    '--workers=1',
    '--reporter=list',
    '--grep',
    'static preview smoke',
    `--output=${outputDir}`,
  ]
  const smoke = await run(process.execPath, args, {
    echo: true,
    env: {
      UI_QA_URL: PREVIEW_URL,
      UI_QA_SCREENS: SCREEN_DIR,
      UI_QA_STATIC: '1',
    },
  })
  writeFileSync(path.join(LOG_DIR, 'playwright-static.log'), smoke.stdout + smoke.stderr)
  record('Playwright static preview smoke', smoke.code === 0, `exit ${smoke.code}`)
  return smoke.code === 0
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log('Universal Round 1 UI QA — Workstream D')
  log(`Project: ${PROJECT}`)
  log(`Screens: ${SCREEN_DIR}`)
  log('')

  hashAudit()
  log('')

  const built = await runStaticChecks()
  log('')

  await runDevSuite()
  log('')

  if (built) await runPreviewSmoke()
  else record('Playwright static preview smoke', false, 'build failed')

  await stopServer(devServer)
  await stopServer(previewServer)

  log('')
  const failures = results.filter((item) => !item.ok)
  log(`SUMMARY: ${results.length - failures.length}/${results.length} checks passed`)
  if (failures.length) {
    for (const failure of failures) log(`  FAIL ${failure.name} — ${failure.detail}`)
  }
  writeFileSync(
    path.join(LOG_DIR, 'summary.json'),
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  )
  process.exitCode = failures.length ? 1 : 0
}

process.on('SIGINT', async () => {
  await stopServer(devServer)
  await stopServer(previewServer)
  process.exit(130)
})

main().catch(async (error) => {
  console.error(error)
  await stopServer(devServer)
  await stopServer(previewServer)
  process.exitCode = 1
})
