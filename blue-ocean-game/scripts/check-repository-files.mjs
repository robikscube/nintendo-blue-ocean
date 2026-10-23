import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const repositoryRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))

/** Keep local planning, generated output and agent work out of the public tree. */
export function isWorkingFile(path) {
  return /\.(?:md|markdown|mdown|mkd|mdx)$/i.test(path)
    || /(?:^|\/)(?:agent-reports|node_modules|test-results|playwright-report|blob-report|qa-screens|\.playwright-artifacts-[^/]*)(?:\/|$)/.test(path)
    || /^(?:\.claude|\.codex|\.agents|_archive|output|logs|previews|character-reference-images|monitoring|tools)\//.test(path)
    || /^blue-ocean-game\/dist[^/]*\//.test(path)
    || /^blue-ocean-game\/scripts\/(?!check-repository-files\.mjs$)/.test(path)
    || /^(?:blue-ocean-game\/)?(?:work|outputs|scratch|tmp)\//.test(path)
    || /^blue-ocean-game\/playwright\.(?:stationary\.config\.ts|local\..+)$/.test(path)
    || /^run-[^/]*\.ps1$/.test(path)
    || /^[^/]*\.docx$/i.test(path)
    || path === 'SKILL_DEPENDENCIES.txt'
    || /(?:\.tmp\.[^/]+|\.(?:log|bak|orig|rej))$/.test(path)
}

export function trackedFiles() {
  return execFileSync('git', ['-c', `safe.directory=${repositoryRoot.replaceAll('\\', '/')}`, '-c', 'core.excludesFile=', 'ls-files', '-z'], {
    cwd: repositoryRoot, encoding: 'utf8',
  }).split('\0').filter(Boolean)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const excluded = trackedFiles().filter(isWorkingFile)
  if (excluded.length) {
    console.error(`Repository contains ${excluded.length} local-only files:\n${excluded.join('\n')}`)
    process.exitCode = 1
  } else {
    console.log('Repository file check passed: no tracked Markdown, working files or generated output.')
  }
}
