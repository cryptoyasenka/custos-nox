@echo off
echo [demo] Starting Custos Nox attack simulation...
echo.
timeout /t 3 /nobreak
echo.
echo [demo] Attack 1: Timelock removal on multisig
npm run smoke:timelock -- 6zH87kxJbDHkYxVf9qpbAeugx56YDBD4xcR7tKRA1uXK
echo.
timeout /t 6 /nobreak
echo.
echo [demo] Attack 2: Threshold weakening on multisig
npm run smoke:weaken -- 6zH87kxJbDHkYxVf9qpbAeugx56YDBD4xcR7tKRA1uXK
echo.
timeout /t 6 /nobreak
echo.
echo [demo] Attack 3: Privileged nonce initialization
npm run smoke:nonce-init
echo.
timeout /t 3 /nobreak
echo.
echo [demo] All attacks complete.
