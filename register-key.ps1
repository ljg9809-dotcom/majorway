param(
    [ValidateSet('BUSAN_API_KEY', 'WORK24_API_KEY', 'UNIVERSITY_API_KEY')]
    [string]$KeyName = 'BUSAN_API_KEY'
)
$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'
$promptLabel = if ($KeyName -in @('BUSAN_API_KEY', 'WORK24_API_KEY')) { '고용24 채용정보 API 인증키' } else { '국내 대학 학과정보 API 인증키' }
$secureKey = Read-Host ($promptLabel + ' 입력 (화면에 표시되지 않습니다)') -AsSecureString
$pointer = [IntPtr]::Zero
try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim()
    if ($plainKey -notmatch '^[A-Za-z0-9%+/=_-]{10,500}$') { throw '인증키 형식을 확인해 주세요. 설정은 변경되지 않았습니다.' }
    $existing = if (Test-Path -LiteralPath $envPath) { [IO.File]::ReadAllText($envPath) } else { '' }
    $line = $KeyName + '="' + $plainKey + '"'
    $pattern = '(?m)^[ \t]*(?:export[ \t]+)?' + [regex]::Escape($KeyName) + '[ \t]*=[^\r\n]*'
    if ([regex]::IsMatch($existing, $pattern)) {
        $updated = [regex]::Replace($existing, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $line })
    } else {
        $separator = if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { "`r`n" } else { '' }
        $updated = $existing + $separator + $line + "`r`n"
    }
    [IO.File]::WriteAllText($envPath, $updated, (New-Object Text.UTF8Encoding($false)))
    Write-Host '키 등록 완료. 기존의 다른 설정은 유지했습니다. 서버를 다시 시작해 주세요.'
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $plainKey = $null; $line = $null; $updated = $null; $existing = $null
    if ($secureKey) { $secureKey.Dispose() }
}
