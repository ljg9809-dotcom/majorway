$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$downloadPath = Join-Path $projectRoot 'academy-majors-2026.raw.json'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22 or later is required.' }
# Public, read-only search. No authentication key or .env access.
Invoke-WebRequest -Uri 'https://www.academyinfo.go.kr/mjrinfo/mjrinfo0450/selectMjrTableList.do?svyYr=2026&paramZnCd=00&schSchlDivCdArr=02%2C01&pulYn=false&schTxt=' -OutFile $downloadPath -UseBasicParsing -TimeoutSec 90
& $nodePath (Join-Path $PSScriptRoot 'build-departments.mjs') $downloadPath
if ($LASTEXITCODE -ne 0) { throw 'Validation failed. The downloaded source was retained for inspection.' }
[IO.File]::Delete($downloadPath)
