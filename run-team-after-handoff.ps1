$ErrorActionPreference='Stop'
$root='C:\Users\robwa\Desktop\Nintendo'
Set-Location $root
$log=Join-Path $root 'logs\team-takeover-status.txt'
"QUEUED $(Get-Date -Format o): waiting for original one-shot PID 44360 and review PID 55508 to exit without interruption" | Set-Content $log
while ((Get-Process -Id 44360 -ErrorAction SilentlyContinue) -or (Get-Process -Id 55508 -ErrorAction SilentlyContinue)) {
 Start-Sleep -Seconds 20
}
"PREDECESSORS_EXITED $(Get-Date -Format o)" | Add-Content $log
$env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS='1'
$prompt="Read AGENT_TEAM_TAKEOVER.md and CLAUDE.md completely. Lead a REAL interactive Claude Code AGENT TEAM. Spawn character, QA and visual teammates using project agent definitions, explicitly have EVERY teammate read and apply relevant installed skills. Check and protect existing implementation. Integrate and test scope only after other workers have exited. Keep TEAM_HANDOFF.md with verified membership/status, leave a runnable presentation build. Follow file ownership and historical accuracy constraints. Do not deploy."
try {
  & 'C:\Users\robwa\AppData\Roaming\npm\claude.cmd' --bg --permission-mode auto --name 'nintendo-interactive-team' $prompt 2>&1 | Tee-Object -FilePath (Join-Path $root 'logs\team-launch-output.log')
  "TEAM_LAUNCH_EXIT $LASTEXITCODE $(Get-Date -Format o)" | Add-Content $log
} catch {
  "TEAM_LAUNCH_ERROR $($_.Exception.Message) $(Get-Date -Format o)" | Add-Content $log
}
