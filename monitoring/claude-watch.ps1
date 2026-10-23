# Nintendo project monitoring only. Never launches Claude or edits game code.
param([ValidateSet('Health','Progress')][string]$Mode='Health')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$monitor=Join-Path $root 'logs\monitor'
New-Item -ItemType Directory -Force -Path $monitor | Out-Null
$events=Join-Path $monitor 'events.jsonl'
$healthLog=Join-Path $monitor 'health.jsonl'
$progressLog=Join-Path $monitor 'progress.jsonl'
$statePath=Join-Path $monitor 'state.json'
$documentation=Join-Path $root 'OVERNIGHT_MONITOR.md'
$launcher=Join-Path $root 'logs\overnight-status.txt'
$stderr=Join-Path $root 'logs\claude-stderr.log'
$build=Join-Path $root 'BUILD_STATUS.md'
$now=Get-Date
$time=$now.ToString('o')
$mutex=[System.Threading.Mutex]::new($false,'Local\NintendoClaudeMonitorMutex')
$locked=$false
function Append-Json([string]$path,$obj) {
    Add-Content -LiteralPath $path -Encoding UTF8 -Value ($obj | ConvertTo-Json -Compress -Depth 6)
}
function Add-Event([string]$kind,[string]$details) {
    Append-Json $events @{time=$time; type=$kind; detail=$details}
    $entry=[Environment]::NewLine+"### $time - $kind"+[Environment]::NewLine+$details+[Environment]::NewLine
    Add-Content -LiteralPath $documentation -Encoding UTF8 -Value $entry
}
try {
    $locked=$mutex.WaitOne(10000)
    if (-not $locked) { throw 'Monitor lock was unavailable' }
    $state=@{claude='UNKNOWN';agent='UNKNOWN';stderrBytes=0;firstSeen=$time}
    if (Test-Path $statePath) {
        $old=Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        foreach($p in $old.PSObject.Properties) { $state[$p.Name]=$p.Value }
    }
    if($Mode -eq 'Health') {
        $workers=@(Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Where-Object { $_.CommandLine -match '--max-turns\s+100' })
        $active=$workers.Count -gt 0
        $exitCode=$null
        if(Test-Path $launcher) {
            $entries=[regex]::Matches((Get-Content $launcher -Raw),'CLAUDE_EXIT_CODE\s+(-?\d+)')
            if($entries.Count -gt 0) { $exitCode=[int]$entries[$entries.Count-1].Groups[1].Value }
        }
        $reportFound=Test-Path $build
        $status='ACTIVE'
        if(-not $active) {
            if($null -ne $exitCode -and $exitCode -eq 0 -and $reportFound) {$status='COMPLETE'}
            else {$status='ERROR'}
        }
        if($state.claude -ne $status) {
            if($status -eq 'COMPLETE') {Add-Event 'COMPLETION' 'Claude ended with exit 0 and BUILD_STATUS.md exists. Tests and feature completion still require verification.'}
            if($status -eq 'ERROR') {Add-Event 'ERROR' "Claude overnight worker missing; exit code: $exitCode; BUILD_STATUS.md: $reportFound."}
        }
        $state.claude=$status
        $length=0
        if(Test-Path $stderr) {$length=(Get-Item $stderr).Length}
        if($length -gt [long]$state.stderrBytes -and [long]$state.stderrBytes -gt 0) {
            $tail=(Get-Content -LiteralPath $stderr -Tail 30 -ErrorAction SilentlyContinue) -join ' '
            if($tail -match '(?i)(fatal error|authentication failed|permission denied|uncaught exception)' -and $state.errorStderrBytes -ne $length) {
                Add-Event 'ERROR' 'New potentially fatal/authentication diagnostic in logs/claude-stderr.log. Review raw logs.'
                $state.errorStderrBytes=$length
            }
        }
        $state.stderrBytes=$length
        $agents=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'desktop-commander[\\/]+dist[\\/]+index\.js' -and $_.CommandLine -match '\sremote(\s|$)' })
        $agentStatus='RUNNING'
        if($agents.Count -eq 0) {
            $agentStatus='RESTART_ATTEMPT'
            $node='C:\Program Files\nodejs\node.exe'
            $entry='C:\Users\robwa\AppData\Local\npm-cache\_npx\4b4c857f6efdfb61\node_modules\@wonderwhy-er\desktop-commander\dist\index.js'
            try {
                if(-not (Test-Path -LiteralPath $entry)) {throw 'Cached Desktop Commander entrypoint missing'}
                Start-Process -FilePath $node -ArgumentList @('"' + $entry + '"','remote') -WorkingDirectory $root -WindowStyle Hidden | Out-Null
                Start-Sleep -Seconds 2
                $verify=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'desktop-commander[\\/]+dist[\\/]+index\.js' -and $_.CommandLine -match '\sremote(\s|$)' })
                if($verify.Count -gt 0) {$agentStatus='RESTARTED'} else {throw 'Restart did not create a detectable agent process'}
            } catch {
                $agentStatus='ERROR'
                if($state.agent -ne 'ERROR') {Add-Event 'ERROR' ("Desktop Commander restart failed: "+$_.Exception.Message)}
            }
        }
        $state.agent=$agentStatus
        $workerPid=$null
        if($active) {$workerPid=$workers[0].ProcessId}
        Append-Json $healthLog @{time=$time;claude=$status;pid=$workerPid;exitCode=$exitCode;buildStatusExists=$reportFound;desktopCommander=$agentStatus;agentCount=$agents.Count;stderrBytes=$length}
        $state.lastHealth=$time
        Write-Output "HEALTH: Claude=$status DesktopCommander=$agentStatus"
    }
    if($Mode -eq 'Progress') {
        $source=@()
        foreach($folder in @('src','tests','scripts')) {
            $dir=Join-Path (Join-Path $root 'blue-ocean-game') $folder
            if(Test-Path $dir) {$source+=@(Get-ChildItem -LiteralPath $dir -File -Recurse -ErrorAction SilentlyContinue)}
        }
        $recent=@($source | Where-Object {$_.LastWriteTime -ge $now.AddMinutes(-15)}).Count
        $latest=$source | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        $latestPath=''
        $age=$null
        if($null -ne $latest) {
            $latestPath=$latest.FullName.Substring($root.Length+1)
            $age=[math]::Round(($now-$latest.LastWriteTime).TotalMinutes,1)
        }
        $qa=Join-Path (Join-Path $root 'blue-ocean-game') 'qa-screens'
        $screens=0
        if(Test-Path $qa) {$screens=@(Get-ChildItem -LiteralPath $qa -Filter '*.png' -File).Count}
        $buildFound=Test-Path $build
        Append-Json $progressLog @{time=$time;changedFiles15m=$recent;latestSource=$latestPath;latestAgeMinutes=$age;qaScreenshots=$screens;buildStatusExists=$buildFound;lastClaudeStatus=$state.claude;lastAgentStatus=$state.agent}
        Add-Content -LiteralPath $documentation -Encoding UTF8 -Value ("- $time | Changed files in last 15m: $recent; latest: $latestPath ($age minutes ago); screenshots: $screens; BUILD_STATUS.md: $buildFound; Claude: $($state.claude); Desktop Commander: $($state.agent).")
        $state.lastProgress=$time
        Write-Output "PROGRESS: changed=$recent latest=$latestPath age=$age minutes"
    }
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding UTF8
} catch {
    Append-Json $events @{time=$time;type='ERROR';detail=("Monitor execution failed: "+$_.Exception.Message)}
    Write-Error $_
    exit 1
} finally {
    if($locked) {$mutex.ReleaseMutex()}
    $mutex.Dispose()
}
