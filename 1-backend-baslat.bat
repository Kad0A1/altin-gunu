@echo off
REM ==== Altin Gunu - Backend Baslatici ====
REM Bu dosyayi altin-gunu klasorunun icine koyup cift tiklayin.
title Altin Gunu - Backend (API)
cd /d "%~dp0backend"

echo ============================================
echo   ALTIN GUNU - Backend Kurulum ve Baslatma
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi!
  echo Lutfen once https://nodejs.org adresinden LTS surumunu kurun.
  echo.
  pause
  exit /b
)

echo [1/2] Bagimliliklar yukleniyor (ilk sefer birkac dakika surebilir)...
call npm install
if errorlevel 1 (
  echo [HATA] npm install basarisiz oldu. Internet baglantinizi kontrol edin.
  pause
  exit /b
)

echo.
echo [2/2] Sunucu baslatiliyor...
echo Bu pencereyi KAPATMAYIN. Sunucu acik kaldikca calisir.
echo Test icin tarayicida: http://localhost:4000/health
echo.
call npm start

pause
