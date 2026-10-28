$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path -Parent $PSScriptRoot
$archive = Join-Path $root 'data/regions-source.zip'
$tempText = Join-Path $root 'data/regions-source.tmp.txt'
$url = 'https://www.code.go.kr/etc/codeFullDown.do?codeseId=' + [uri]::EscapeDataString('법정동코드')
Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $archive -TimeoutSec 30
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    $reader = [IO.StreamReader]::new($zip.Entries[0].Open(), [Text.Encoding]::GetEncoding(949))
    try { [IO.File]::WriteAllText($tempText, $reader.ReadToEnd(), [Text.UTF8Encoding]::new($false)) } finally { $reader.Dispose() }
} finally { $zip.Dispose() }
try {
    & node (Join-Path $PSScriptRoot 'build-regions.mjs') $tempText
    if ($LASTEXITCODE -ne 0) { throw '지역 코드 검증 실패' }
} finally { Remove-Item -LiteralPath $tempText -ErrorAction SilentlyContinue }
