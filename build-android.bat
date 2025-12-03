@echo off
REM ChatApp Tauri Android Build Script for Windows
REM Run this script from the Chat-app-main folder

echo ============================================
echo    ChatApp Tauri Android Build Script
echo ============================================
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust is not installed!
    echo Please install Rust from: https://rustup.rs/
    echo After installation, restart your terminal and run this script again.
    pause
    exit /b 1
)

REM Check if Android SDK is set
if "%ANDROID_HOME%"=="" (
    echo [WARNING] ANDROID_HOME not set. Trying common locations...
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
    ) else if exist "%USERPROFILE%\AppData\Local\Android\Sdk" (
        set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk
    ) else (
        echo [ERROR] Android SDK not found!
        echo Please install Android Studio or set ANDROID_HOME environment variable.
        pause
        exit /b 1
    )
)
echo ANDROID_HOME: %ANDROID_HOME%

REM Check if NDK is installed
if "%NDK_HOME%"=="" (
    for /d %%i in ("%ANDROID_HOME%\ndk\*") do set NDK_HOME=%%i
)
echo NDK_HOME: %NDK_HOME%

REM Add Android targets for Rust
echo.
echo Adding Android build targets for Rust...
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

REM Install dependencies
echo.
echo Installing npm dependencies...
call npm install

REM Build the Next.js app
echo.
echo Building Next.js application...
call npm run build

REM Build the Tauri Android APK
echo.
echo Building Tauri Android APK...
call npx tauri android build

echo.
echo ============================================
echo    Build Complete!
echo ============================================
echo.
echo APK files can be found in:
echo   src-tauri\gen\android\app\build\outputs\apk\
echo.
echo Debug APK: universal\release\app-universal-release.apk
echo.
pause
