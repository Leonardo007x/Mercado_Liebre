@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ============================================================
REM Mercado Liebre - Test rapido de logs + CircuitBreaker
REM Uso:
REM   1) Ejecutar desde la raiz de Mercado_Liebre
REM   2) Tener Docker Desktop levantado
REM   3) .\test-resiliencia.bat
REM ============================================================

set "BASE_URL=http://localhost:3000"
set "HEALTH_WAIT_SECONDS=3"
set "FAIL_CALLS=8"
set "RID=ml-test-%RANDOM%%RANDOM%"
set "OPEN_LOG_WINDOWS=1"

echo.
echo [1/8] Verificando Docker Compose...
docker compose version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro docker compose. Abre Docker Desktop y reintenta.
  goto :fail
)

echo.
echo [2/8] Levantando stack (si ya esta arriba, no pasa nada)...
docker compose up -d
if errorlevel 1 (
  echo [WARN] docker compose up -d devolvio error. Continuo para diagnostico...
)

if "%OPEN_LOG_WINDOWS%"=="1" (
  echo.
  echo [INFO] Abriendo ventanas de logs en vivo...
  start "Logs Gateway" cmd /k "docker compose logs -f gateway"
  start "Logs Tiendas (breaker)" cmd /k "docker compose logs -f tiendas-service"
  start "Logs Catalogo" cmd /k "docker compose logs -f catalogo-service"
  timeout /t 1 /nobreak >nul
)

echo.
echo [3/9] Monitoreo agregado del sistema (todos los microservicios)...
echo [INFO] GET %BASE_URL%/api/health/all
curl -s "%BASE_URL%/api/health/all"
echo.

echo.
echo [4/9] Health checks por gateway...
call :health "/api/health"
call :health "/api/tiendas"
call :health "/api/productos"
call :health "/api/categorias?tienda_id=dummy"
call :health "/api/ia/health"

echo.
echo [5/9] Detectando tienda para prueba de vista publica...
set "TIENDA_ID="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$r=Invoke-RestMethod -Uri '%BASE_URL%/api/tiendas' -Method GET -ErrorAction SilentlyContinue; if($r -and $r.Count -gt 0){$r[0].id}"`) do (
  set "TIENDA_ID=%%i"
)

if "%TIENDA_ID%"=="" (
  echo [ERROR] No hay tiendas creadas. Crea al menos una tienda y vuelve a correr el script.
  goto :restore_and_fail
)
echo [OK] TIENDA_ID detectada: %TIENDA_ID%

echo.
echo [6/9] Probando trazabilidad de logs con X-Request-Id: %RID%
echo [INFO] Revisa la ventana "Logs Tiendas (breaker)" para ver el requestId.
curl -s -H "X-Request-Id: %RID%" "%BASE_URL%/api/tiendas/%TIENDA_ID%/vista-publica" >nul

echo [INFO] Buscando requestId en logs de tiendas-service (ultimos 2 minutos)...
docker compose logs --since 2m tiendas-service | findstr /I "%RID%"
if errorlevel 1 (
  echo [WARN] No se encontro requestId en la salida filtrada.
  echo        Revisa logs completos: docker compose logs --since 2m tiendas-service
) else (
  echo [OK] requestId encontrado en logs.
)

echo.
echo [7/9] Simulando falla de dependencia: parando catalogo-service...
echo [INFO] Deberias ver errores de dependencia en la ventana de logs de tiendas.
docker compose stop catalogo-service
if errorlevel 1 (
  echo [ERROR] No se pudo detener catalogo-service.
  goto :restore_and_fail
)

echo [INFO] Disparando %FAIL_CALLS% llamadas para forzar apertura de circuito en tiendas-service...
for /L %%n in (1,1,%FAIL_CALLS%) do (
  echo   - llamada %%n/%FAIL_CALLS%
  curl -s -o nul -w "     status=%%{http_code}\n" "%BASE_URL%/api/tiendas/%TIENDA_ID%/vista-publica"
)

echo.
echo [8/9] Revisando monitoreo agregado con catalogo CAIDO...
echo [INFO] catalogo debe aparecer como unreachable en /api/health/all
curl -s "%BASE_URL%/api/health/all"
echo.

echo [INFO] Revisando logs del CircuitBreaker en tiendas-service...
echo [INFO] Buscando mensajes del circuit breaker: ABIERTO, SEMIABIERTO, CERRADO
docker compose logs --since 3m tiendas-service | findstr /I "circuit breaker ABIERTO SEMIABIERTO CERRADO"
if errorlevel 1 (
  echo [WARN] No se detecto texto explicito del breaker en logs filtrados.
  echo        Igual valida que durante la falla devolvio 502 y luego se recupera.
) else (
  echo [OK] Se detectaron senales del CircuitBreaker en logs.
)
echo [TIP] Aunque no salga la palabra "breaker", si viste 502 repetidos durante la caida y luego recuperacion, la resiliencia esta actuando.

echo.
echo [9/9] Restaurando catalogo-service y validando recuperacion...
docker compose start catalogo-service
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar catalogo-service.
  goto :restore_and_fail
)

echo [INFO] Esperando %HEALTH_WAIT_SECONDS%s para que arranque...
timeout /t %HEALTH_WAIT_SECONDS% /nobreak >nul

curl -s -o nul -w "[RECUPERACION] /api/tiendas/%TIENDA_ID%/vista-publica -> status=%%{http_code}\n" "%BASE_URL%/api/tiendas/%TIENDA_ID%/vista-publica"

echo.
echo ==========================================
echo [OK] Test finalizado.
echo Resumen esperado:
echo - Monitoreo agregado: GET /api/health/all (ve todos los servicios aunque uno este caido).
echo - RequestId trazable en tiendas-service.
echo - Durante falla de catalogo: respuestas 502.
echo - Tras restaurar catalogo: recuperacion a 200.
echo ==========================================
echo.
echo Presiona una tecla para cerrar esta ventana...
pause >nul
goto :eof

:health
set "P=%~1"
for /f "usebackq delims=" %%s in (`curl -s -o nul -w "%%{http_code}" "%BASE_URL%%P%"`) do set "STATUS=%%s"
echo   %BASE_URL%%P% ^> !STATUS!
goto :eof

:restore_and_fail
echo [INFO] Intentando restaurar catalogo-service...
docker compose start catalogo-service >nul 2>&1
goto :fail

:fail
echo.
echo [FAIL] El test no pudo completarse.
echo Presiona una tecla para cerrar esta ventana...
pause >nul
exit /b 1
