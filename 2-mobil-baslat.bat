@echo off
REM ==== Altin Gunu - Mobil Baslatici ====
REM Bu dosyayi altin-gunu klasorunun icine koyup cift tiklayin.
REM ONEMLI: Once "1-backend-baslat.bat" calisiyor olmali.
title Altin Gunu - Mobil (Expo)
cd /d "%~dp0mobile"

echo ============================================
echo   ALTIN GUNU - Mobil Uygulama (Expo)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi! Once https://nodejs.org adresinden kurun.
  pause
  exit /b
)

echo [1/2] Bagimliliklar yukleniyor...
call npm install
if errorlevel 1 (
  echo [HATA] npm install basarisiz oldu.
  pause
  exit /b
)

echo.
echo [2/2] Nasil acmak istersiniz?
echo   [1] Telefonda (Expo Go ile QR okutma) - client.js icinde IP ayari gerekir
echo   [2] Tarayicida (en kolay, IP ayari gerekmez)
echo.
set /p secim="Seciminiz (1 veya 2): "

if "%secim%"=="2" (
  echo Tarayicida aciliyor...
  call npx expo start --web
) else (
  echo QR kod aciliyor... Telefondaki Expo Go ile okutun.
  echo HATIRLATMA: mobile\src\api\client.js icindeki BASE_URL, PC'nizin IP'si olmali.
  call npx expo start
)

pause
