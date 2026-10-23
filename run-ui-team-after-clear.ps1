$ErrorActionPreference='Stop'
$base='C:\Users\robwa\Desktop\Nintendo'
Set-Location $base
$state=Join-Path $base 'logs\ui-team-handoff-status.txt'
"QUEUED $(Get-Date -Format o): waiting for existing blue-ocean-game Claude session PID 26008 to EXIT" | Set-Content $state
while(Get-Process -Id 26008 -ErrorAction SilentlyContinue){ Start-Sleep -Seconds 20 }
"PREVIOUS_WORKER_EXITED $(Get-Date -Format o)" | Add-Content $state
$env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS='1'
$prompt='Read UI_TEAM_HANDOFF.md, UI_REFINEMENT_TASK_2026-10-22.md, CLAUDE.md and the current game code. You are the interactive UI implementation team LEAD. Spawn a real Claude Code agent team and delegate a dedicated typography/CSS specialist and independent QA specialist, with exclusive file ownership. LEAD owns ui.ts. All agents must read relevant installed skills. Do not collide with other active editors. Preserve original code and game behavior, fix HUD and factory visuals and font, run tests and take screenshots, write agent-reports/UI_REFINEMENT_2026-10-22.md. Report actual teammates, tests and outcome. Do not publish.'
try {
  & "$env:APPDATA\npm\claude.cmd" --bg --permission-mode auto --name 'nintendo-ui-refinement-team' $prompt 2>&1 | Tee-Object (Join-Path $base 'logs\ui-team-launch-output.log')
  "LAUNCH_RETURNED $LASTEXITCODE $(Get-Date -Format o)" | Add-Content $state
} catch {
  "LAUNCH_ERROR $($_.Exception.Message) $(Get-Date -Format o)" | Add-Content $state
}
