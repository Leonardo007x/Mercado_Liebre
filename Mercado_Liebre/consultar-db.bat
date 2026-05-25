@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM Mercado Liebre - Consulta de bases de datos por consola
REM Uso: .\consultar-db.bat
REM Requisito: docker compose up -d (contenedores MySQL en ejecucion)
REM ============================================================

set "MYSQL_USER=admin"
set "MYSQL_PASS=adminpassword"

:menu
cls
echo.
echo ============================================================
echo   MERCADO LIEBRE - Consulta de bases de datos
echo ============================================================
echo.
echo   [1] Usuarios      ^(usuarios_db^)     - tabla usuarios
echo   [2] Tiendas       ^(tiendas_db^)      - tiendas / temas
echo   [3] Catalogo      ^(catalogo_db^)     - tabla productos
echo   [4] Media         ^(media_db^)        - tabla media_assets
echo   [5] Categorias    ^(categorias_db^)   - tabla categorias
echo   [6] IA            ^(ia_db^)           - tabla ia_generaciones
echo.
echo   [7] Ver TODAS las tablas principales
echo   [0] Salir
echo.
set /p OPCION="Seleccione una opcion: "

if "%OPCION%"=="1" goto db_usuarios
if "%OPCION%"=="2" goto menu_tiendas
if "%OPCION%"=="3" goto db_catalogo
if "%OPCION%"=="4" goto db_media
if "%OPCION%"=="5" goto db_categorias
if "%OPCION%"=="6" goto db_ia
if "%OPCION%"=="7" goto db_todas
if "%OPCION%"=="0" goto fin
echo [ERROR] Opcion invalida.
timeout /t 2 /nobreak >nul
goto menu

:menu_tiendas
cls
echo.
echo --- TIENDAS (tiendas_db) ---
echo   [1] Tabla tiendas
echo   [2] Tabla temas
echo   [3] Ambas tablas
echo   [0] Volver al menu principal
echo.
set /p SUB="Seleccione: "
if "%SUB%"=="1" call :query_tiendas & goto pausa_volver
if "%SUB%"=="2" call :query_temas & goto pausa_volver
if "%SUB%"=="3" call :query_tiendas & echo. & call :query_temas & goto pausa_volver
if "%SUB%"=="0" goto menu
echo [ERROR] Opcion invalida.
timeout /t 2 /nobreak >nul
goto menu_tiendas

:db_usuarios
call :query_usuarios
goto pausa_volver

:db_catalogo
call :query_productos
goto pausa_volver

:db_media
call :query_media
goto pausa_volver

:db_categorias
call :query_categorias
goto pausa_volver

:db_ia
call :query_ia
goto pausa_volver

:db_todas
call :query_usuarios
echo.
call :query_tiendas
echo.
call :query_temas
echo.
call :query_productos
echo.
call :query_categorias
echo.
call :query_media
echo.
call :query_ia
goto pausa_volver

:pausa_volver
echo.
echo ------------------------------------------------------------
pause
goto menu

:fin
echo.
echo Hasta luego.
exit /b 0

REM ============================================================
REM Consultas por dominio
REM ============================================================

:query_usuarios
echo.
echo ============================================================
echo  USUARIOS - usuarios_db ^(mercadoliebre_db_usuarios^)
echo ============================================================
docker exec mercadoliebre_db_usuarios mysql -u%MYSQL_USER% -p%MYSQL_PASS% usuarios_db -e "SELECT id, email, nombre, apellido, creado_en FROM usuarios;"
goto :eof

:query_tiendas
echo.
echo ============================================================
echo  TIENDAS - tiendas_db ^(mercadoliebre_db_tiendas^)
echo ============================================================
docker exec mercadoliebre_db_tiendas mysql -u%MYSQL_USER% -p%MYSQL_PASS% tiendas_db -e "SELECT id, usuario_id, nombre, ciudad, pais, creado_en FROM tiendas;"
goto :eof

:query_temas
echo.
echo ============================================================
echo  TEMAS - tiendas_db ^(mercadoliebre_db_tiendas^)
echo ============================================================
docker exec mercadoliebre_db_tiendas mysql -u%MYSQL_USER% -p%MYSQL_PASS% tiendas_db -e "SELECT id, tienda_id, color_primario, color_secundario, estilo_plantilla FROM temas;"
goto :eof

:query_productos
echo.
echo ============================================================
echo  PRODUCTOS - catalogo_db ^(mercadoliebre_db_catalogo^)
echo ============================================================
docker exec mercadoliebre_db_catalogo mysql -u%MYSQL_USER% -p%MYSQL_PASS% catalogo_db -e "SELECT id, tienda_id, nombre, precio, categoria, activo, creado_en FROM productos;"
goto :eof

:query_categorias
echo.
echo ============================================================
echo  CATEGORIAS - categorias_db ^(mercadoliebre_db_categorias^)
echo ============================================================
docker exec mercadoliebre_db_categorias mysql -u%MYSQL_USER% -p%MYSQL_PASS% categorias_db -e "SELECT id, tienda_id, nombre, icono, orden, creado_en FROM categorias;"
goto :eof

:query_media
echo.
echo ============================================================
echo  MEDIA - media_db ^(mercadoliebre_db_media^)
echo ============================================================
docker exec mercadoliebre_db_media mysql -u%MYSQL_USER% -p%MYSQL_PASS% media_db -e "SELECT id, usuario_id, provider, mime_type, bytes_size, creado_en FROM media_assets;"
goto :eof

:query_ia
echo.
echo ============================================================
echo  IA - ia_db ^(mercadoliebre_db_ia^)
echo ============================================================
docker exec mercadoliebre_db_ia mysql -u%MYSQL_USER% -p%MYSQL_PASS% ia_db -e "SELECT id, usuario_id, provider, modelo, LEFT(prompt_usuario, 60) AS prompt_preview, creado_en FROM ia_generaciones;"
goto :eof
