@echo off
setlocal enabledelayedexpansion
REM ChatApp Tauri Android Build Script for Windows
REM Run this script from the Chat-app folder after extracting the zip

echo ============================================
echo    ChatApp Tauri Android Build Script
echo ============================================
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust is not installed!
    echo.
    echo Please install Rust:
    echo 1. Go to https://rustup.rs/
    echo 2. Download and run rustup-init.exe
    echo 3. Follow the prompts
    echo 4. Restart this terminal and run build-android.bat again
    echo.
    pause
    exit /b 1
)
echo [OK] Rust found

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check if Android SDK is set
if "%ANDROID_HOME%"=="" (
    echo [INFO] ANDROID_HOME not set. Searching for Android SDK...
    
    REM Try common locations
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    ) else if exist "%USERPROFILE%\AppData\Local\Android\Sdk" (
        set "ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk"
    ) else if exist "C:\Android\Sdk" (
        set "ANDROID_HOME=C:\Android\Sdk"
    )
)

if "%ANDROID_HOME%"=="" (
    echo [ERROR] Android SDK not found!
    echo.
    echo Please install Android Studio from:
    echo https://developer.android.com/studio
    echo.
    echo Or set ANDROID_HOME to your SDK location.
    echo.
    pause
    exit /b 1
)
echo [OK] ANDROID_HOME: %ANDROID_HOME%

REM Find NDK
if "%NDK_HOME%"=="" (
    for /d %%i in ("%ANDROID_HOME%\ndk\*") do (
        set "NDK_HOME=%%i"
    )
)
if not "%NDK_HOME%"=="" (
    echo [OK] NDK_HOME: %NDK_HOME%
) else (
    echo [WARNING] NDK not found. Please install NDK via Android Studio SDK Manager.
)

REM Check Java
if "%JAVA_HOME%"=="" (
    if exist "%ProgramFiles%\Android\Android Studio\jbr" (
        set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
    )
)
if not "%JAVA_HOME%"=="" (
    echo [OK] JAVA_HOME: %JAVA_HOME%
)

echo.
echo ============================================
echo    Step 1: Adding Rust Android Targets
echo ============================================
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

echo.
echo ============================================
echo    Step 2: Installing npm dependencies
echo ============================================
call npm install

echo.
echo ============================================
echo    Step 3: Building Next.js application
echo ============================================
call npm run build

echo.
echo ============================================
echo    Step 4: Initializing Tauri Android
echo ============================================
call npx tauri android init

echo.
echo ============================================
echo    Step 5: Building Android APK
echo ============================================
call npx tauri android build --apk

echo.
echo ============================================
echo    Build Complete!
echo ============================================
echo.
echo APK files can be found in:
echo   src-tauri\gen\android\app\build\outputs\apk\
echo.
echo Look for:
echo   - universal\release\app-universal-release.apk (recommended)
echo   - arm64\release\app-arm64-v8a-release.apk
echo   - armeabi\release\app-armeabi-v7a-release.apk
echo.
echo Install on your phone:
echo   1. Enable "Install from Unknown Sources" in Settings
echo   2. Transfer the APK to your phone
echo   3. Open and install
echo.
pause
