@echo off
echo Iniciando BASTA con tunel Cloudflare...
echo.

echo [1/2] Iniciando servidor local...
start "Servidor BASTA" cmd /k "npm start"

echo [2/2] Esperando 3 segundos antes de crear el tunel...
timeout /t 3 /nobreak > nul

echo Creando tunel publico Cloudflare...
start "Cloudflare Tunnel" cmd /k ".\cloudflared.exe tunnel --url http://localhost:3000"

echo.
echo ✅ BASTA iniciado con acceso publico!
echo.
echo 📱 Acceso local:  http://localhost:3000
echo 🌍 Acceso publico: Consulta la ventana "Cloudflare Tunnel"
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul