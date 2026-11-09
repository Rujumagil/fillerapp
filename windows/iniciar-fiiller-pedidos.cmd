@echo off
rem Fiiller Cafe - inicio automatico de la central de pedidos Windows
rem No contiene contrasenas ni tokens. Requiere Microsoft Edge instalado.
start "" msedge --app="https://www.fiillercafe.app/pedidos.html"
if errorlevel 1 (
  echo No se pudo abrir Edge. Abre manualmente https://www.fiillercafe.app/pedidos.html
  pause
)
