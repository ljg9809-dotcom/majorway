$ErrorActionPreference = 'Stop'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('majorway-key-test-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($testRoot) | Out-Null
$script = Join-Path $testRoot 'register-key.ps1'
$testEnv = Join-Path $testRoot '.env'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\register-key.ps1') -Destination $script
function Read-Host {
    param([string]$Prompt, [switch]$AsSecureString)
    if (-not $AsSecureString) { throw 'Hidden input is required' }
    ConvertTo-SecureString -String 'sample-test-only-key-12345' -AsPlainText -Force
}
try {
    [IO.File]::WriteAllText($testEnv, "# keep comment`r`nPORT=3456`r`nOTHER_SETTING=keep`r`nBUSAN_API_KEY=old-test-key")
    . $script
    $result = [IO.File]::ReadAllText($testEnv)
    if (-not $result.Contains("# keep comment`r`nPORT=3456`r`nOTHER_SETTING=keep`r`n")) { throw 'Existing settings changed' }
    if (-not $result.Contains('BUSAN_API_KEY="sample-test-only-key-12345"')) { throw 'Key was not updated' }
    [IO.File]::WriteAllText($testEnv, 'PORT=3456')
    . $script
    $result = [IO.File]::ReadAllText($testEnv)
    if (-not $result.StartsWith("PORT=3456`r`nBUSAN_API_KEY=")) { throw 'Newline or append failed' }
    . $script -KeyName 'UNIVERSITY_API_KEY'
    $result = [IO.File]::ReadAllText($testEnv)
    if (-not $result.Contains('BUSAN_API_KEY="sample-test-only-key-12345"')) { throw 'Existing Busan key changed' }
    if (-not $result.Contains('UNIVERSITY_API_KEY="sample-test-only-key-12345"')) { throw 'University key was not saved' }
    Write-Host 'PASS: hidden input, preserving settings, key replacement, append, two separate keys.'
} finally {
    # Only the three explicitly created temporary paths are removed.
    if (Test-Path -LiteralPath $script) { [IO.File]::Delete($script) }
    if (Test-Path -LiteralPath $testEnv) { [IO.File]::Delete($testEnv) }
    [IO.Directory]::Delete($testRoot)
}
