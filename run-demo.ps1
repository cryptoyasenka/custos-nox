Set-Location "C:\Projects\custos"
Write-Host "[demo] Starting Custos Nox attack simulation..." -ForegroundColor Cyan
Start-Sleep 3

Write-Host ""
Write-Host "[demo] Attack 1: Timelock removal on multisig" -ForegroundColor Yellow
npm run smoke:timelock -- AjULUVaCpzdGvCXgUkHLitkBR6nmn1M7AsHJ8sGgMZNy
Start-Sleep 7

Write-Host ""
Write-Host "[demo] Attack 2: Threshold weakening on multisig" -ForegroundColor Yellow
npm run smoke:weaken -- AjULUVaCpzdGvCXgUkHLitkBR6nmn1M7AsHJ8sGgMZNy
Start-Sleep 7

Write-Host ""
Write-Host "[demo] Attack 3: Privileged nonce initialization" -ForegroundColor Yellow
npm run smoke:nonce-init
Start-Sleep 3

Write-Host ""
Write-Host "[demo] All attacks complete." -ForegroundColor Green
