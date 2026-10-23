$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\robwa\Desktop\Nintendo'
$logDir = Join-Path (Get-Location) 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$start = Get-Date -Format o
"STARTED $start" | Set-Content (Join-Path $logDir 'overnight-status.txt')
try {
  & 'C:\Users\robwa\AppData\Roaming\npm\claude.cmd' --print --permission-mode auto --output-format text --max-turns 100 "Read CLAUDE.md, GAME_DESIGN.md, TECHNICAL_SPEC.md and 24_HOUR_BUILD_PLAN.md. Read and use applicable project skills in .claude/skills. Execute the overnight project task in CLAUDE.md. Work autonomously on the Nintendo Blue Ocean historical teaching game. Build playable narrative and test first, then simple 3D boardroom/factory; implement as many scoped milestones as possible. Do not deploy/push, do not modify files outside Nintendo. Write BUILD_STATUS.md."
  "CLAUDE_EXIT_CODE $LASTEXITCODE at $(Get-Date -Format o)" | Add-Content (Join-Path $logDir 'overnight-status.txt')
} catch {
  "ERROR $($_.Exception.Message) at $(Get-Date -Format o)" | Add-Content (Join-Path $logDir 'overnight-status.txt')
  throw
}
