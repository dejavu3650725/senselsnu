# 센셀 업데이트 — sen-sel-web 폴더에서: powershell -ExecutionPolicy Bypass -File .\senselup.ps1
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
if (-not (Test-Path .\feed.bundle)) { Write-Host "feed.bundle 파일이 없습니다." -ForegroundColor Red; exit 1 }
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
git checkout -- .
$before = (git rev-parse HEAD).Trim()
git fetch .\feed.bundle main:feed
git merge --ff-only feed
git branch -D feed
Remove-Item .\feed.bundle
$changed = git diff --name-only $before HEAD
if ($changed -match "package.json") { npm install }
git push origin main
Write-Host "완료: $(git log --oneline -1)" -ForegroundColor Green
