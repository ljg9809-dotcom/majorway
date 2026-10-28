$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Majorway - API 키 등록'
Write-Host 'Majorway API 키 등록'
Write-Host '키는 이 창에서만 입력하세요. 입력한 문자는 숨겨지고 프로젝트 .env에 저장됩니다.'
Write-Host '기존의 다른 설정은 유지됩니다. 취소하려면 Ctrl+C를 누르세요.'
Write-Host ''
try {
    Write-Host '[1/2] 부산 채용정보 API'
    & (Join-Path $PSScriptRoot 'register-key.ps1') -KeyName 'BUSAN_API_KEY'
    Write-Host ''
    Write-Host '[2/2] 국내 대학 학과정보 API'
    & (Join-Path $PSScriptRoot 'register-key.ps1') -KeyName 'UNIVERSITY_API_KEY'
    Write-Host ''
    Write-Host '두 키를 저장했습니다. 이 창을 닫고 채팅에 등록 완료라고 알려주세요.'
    Write-Host '대학 학과정보 API는 제공처의 주소와 명세를 확인한 뒤 연결합니다.'
} catch {
    Write-Host '등록이 중단되었습니다. 이미 등록된 항목은 유지됩니다.'
    Write-Host '키 형식을 확인한 뒤 스크립트를 다시 실행해 주세요.'
}
