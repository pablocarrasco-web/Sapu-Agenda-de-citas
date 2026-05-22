# run_dev.ps1
# Recargar PATH para incluir Node.js y Python recién instalados
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Clear-Host
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "          SISTEMA DE AGENDAS MEDICAL - SAPU" -ForegroundColor DarkCyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Iniciando todos los servicios en ventanas independientes..." -ForegroundColor Cyan

# 1. Iniciar Servicio de Analítica Python (puerto 8081)
Write-Host "[1/3] Iniciando Servicio de Analítica (Python/FastAPI)..." -ForegroundColor Yellow
$pythonProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = '$env:Path'; cd analytics; python -m uvicorn main:app --host 127.0.0.1 --port 8081" -PassThru

# 2. Iniciar Servidor Backend Node.js (puerto 5000)
Write-Host "[2/3] Iniciando Servidor API (Node.js/Express)..." -ForegroundColor Yellow
$nodeProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = '$env:Path'; cd server; node server.js" -PassThru

# 3. Iniciar React Frontend (puerto 8080)
Write-Host "[3/3] Iniciando Servidor Web (React/Vite)..." -ForegroundColor Yellow
$reactProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = '$env:Path'; cd client; npm.cmd run dev" -PassThru

Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "¡Servicios Lanzados Exitosamente!" -ForegroundColor Green
Write-Host "🌐 Portal de Clientes y Administración: http://localhost:8080" -ForegroundColor Green
Write-Host "🚀 API Backend Node.js: http://localhost:5000" -ForegroundColor Green
Write-Host "🧠 Servicio Analítico Python: http://localhost:8081" -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "Puedes cerrar esta ventana. Para apagar los servicios, cierra las ventanas individuales de terminal." -ForegroundColor DarkGray
