# ChatApp - Tauri Android Build Guide

This guide explains how to build the ChatApp Android APK using Tauri on your Windows machine.

## Prerequisites

### 1. Install Rust
Download and install Rust from: https://rustup.rs/
- Run the installer and follow the prompts
- Restart your terminal after installation

### 2. Install Android Studio
Download from: https://developer.android.com/studio
- Install Android Studio
- During setup, install the Android SDK
- Go to SDK Manager → SDK Tools and install:
  - Android SDK Build-Tools
  - NDK (Side by side)
  - Android SDK Command-line Tools

### 3. Set Environment Variables
Add these to your system environment variables:

```
ANDROID_HOME = C:\Users\<YourUsername>\AppData\Local\Android\Sdk
NDK_HOME = C:\Users\<YourUsername>\AppData\Local\Android\Sdk\ndk\<version>
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
```

### 4. Install Node.js
Download from: https://nodejs.org/ (LTS version recommended)

## Building the APK

### Quick Build (Windows)
1. Extract `Chat-app-main.zip` to a folder
2. Open Command Prompt in that folder
3. Run: `build-android.bat`

### Manual Build Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add Rust Android targets:**
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```

3. **Initialize Tauri Android (if not done):**
   ```bash
   npx tauri android init
   ```

4. **Build the APK:**
   ```bash
   npx tauri android build
   ```

## APK Location

After successful build, find your APK at:
```
src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk
```

Or for debug builds:
```
src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk
```

## Features

### Offline Support
The app includes offline capabilities:
- **Message Queue**: Messages typed while offline are saved and sent when back online
- **Local Cache**: Conversations and messages are cached for offline viewing
- **Sync Indicator**: Shows reconnection status when coming back online

### Online Features
- Real-time messaging
- Group chats
- Photo sharing
- Voice messages
- Message reactions
- Read receipts

## Troubleshooting

### "Rust not found"
- Install Rust from https://rustup.rs/
- Restart your terminal

### "Android SDK not found"
- Install Android Studio
- Set ANDROID_HOME environment variable
- Make sure SDK Tools are installed

### "NDK not found"
- Open Android Studio → SDK Manager → SDK Tools
- Check "NDK (Side by side)" and install

### Build fails with Gradle errors
- Make sure JAVA_HOME points to Android Studio's JDK:
  `C:\Program Files\Android\Android Studio\jbr`

### "Permission denied" on gradlew
- Run: `chmod +x src-tauri/gen/android/gradlew` (on Linux/Mac)
- Or use Git Bash on Windows

## Development

### Run in development mode:
```bash
npm run tauri:android:dev
```

### Build release APK:
```bash
npm run tauri:android:build
```

## App Information

- **App Name**: ChatApp
- **Package ID**: com.chatapp.mobile
- **Min Android Version**: Android 7.0 (API 24)
- **Target Android Version**: Android 14 (API 34)

## Support

For issues or questions, please open an issue on the GitHub repository.
