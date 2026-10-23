$ErrorActionPreference='Stop'
Set-Location 'C:\Users\robwa\Desktop\Nintendo'
$logDir=Join-Path (Get-Location) 'logs'
"COORDINATOR_STARTED $(Get-Date -Format o)" | Set-Content (Join-Path $logDir 'subagents-status.txt')
try {
 & 'C:\Users\robwa\AppData\Roaming\npm\claude.cmd' --print --permission-mode auto --max-turns 36 --output-format text "Read CLAUDE.md and _archive/agent-reports/PARALLEL_TASKS.md. This is a SEPARATE review-only session alongside the currently running main implementation worker. Use the Agent tool to delegate up to three focused subagents concurrently if supported. Their ONLY write destination is agent-reports/*.md. Do not modify source, configuration, tests or project documents. Produce QA_REVIEW.md, CHARACTER_INTEGRATION.md, STORY_REVIEW.md and COORDINATOR_STATUS.md. Avoid lengthy work beyond these reports."
 "COORDINATOR_EXIT $LASTEXITCODE $(Get-Date -Format o)" | Add-Content (Join-Path $logDir 'subagents-status.txt')
} catch {
 "COORDINATOR_ERROR $($_.Exception.Message)" | Add-Content (Join-Path $logDir 'subagents-status.txt')
 throw
}
