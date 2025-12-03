# ChatApp - Tauri Android Build Guide

Build a native Android app with offline support using Tauri.

## Quick Start (Windows)

### Step 1: Install Prerequisites

1. **Install Rust**
   - Go to https://rustup.rs/
   - Download and run `rustup-init.exe`
   - Choose option 1 (default installation)
   - Restart your terminal after installation

2. **Install Node.js**
   - Go to https://nodejs.org/
   - Download the LTS version
   - Run the installer

3. **Install Android Studio**
   - Go to https://developer.android.com/studio
   - Download and install Android Studio
   - Open Android Studio, go to **Settings** → **Languages & Frameworks** → **Android SDK**
   - In **SDK Tools** tab, check and install:
     - ✅ Android SDK Build-Tools
     - ✅ NDK (Side by side)
     - ✅ Android SDK Command-line Tools
     - ✅ Android SDK Platform-Tools

### Step 2: Set Environment Variables

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab → **Environment Variables**
3. Under **System Variables**, click **New** and add:

| Variable Name | Variable Value |
|--------------|----------------|
| `ANDROID_HOME` | `C:\Users\<YourUsername>\AppData\Local\Android\Sdk` |
| `NDK_HOME` | `C:\Users\<YourUsername>\AppData\Local\Android\Sdk\ndk\<version>` |
| `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |

4. Edit the `Path` variable and add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\cmdline-tools\latest\bin`

### Step 3: Build the APK

1. Extract `Chat-app-main.zip` to a folder (e.g., `C:\Users\User\Downloads\Chat-app-main`)
2. Open Command Prompt or PowerShell in that folder
3. Run the build script:
   ```cmd
   build-android.bat
   ```

The script will:
- Install npm dependencies
- Add Rust Android targets
- Build the Next.js app
- Initialize Tauri Android
- Build the APK

### Step 4: Install on Your Phone

1. Find the APK at:
   ```
   src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk
   ```

2. Transfer to your Android phone via:
   - USB cable
   - Google Drive
   - Email attachment
   - Direct ADB install: `adb install app-universal-release.apk`

3. On your phone:
   - Go to **Settings** → **Security** → Enable **Install from Unknown Sources**
   - Open the APK file and tap **Install**

## Manual Build Commands

If you prefer running commands manually:

```bash
# Install dependencies
npm install

# Add Android targets for Rust
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# Build Next.js
npm run build

# Initialize Tauri Android (first time only)
npx tauri android init

# Build APK
npx tauri android build --apk

# Or build AAB for Play Store
npx tauri android build --aab
```

## App Features

### Offline Support
- **Message Queue**: Messages typed offline are saved locally and sent when back online
- **Local Cache**: Conversations and messages cached in IndexedDB
- **Sync Status**: Visual indicator shows connection status
- **Auto-Sync**: Pending messages sync automatically when reconnected

### Online Features
- Real-time messaging
- Group chats with admin controls
- Photo and file sharing
- Voice messages
- Message reactions
- Read receipts (WhatsApp-style ticks)
- Message forwarding
- Reply to specific messages

## Troubleshooting

### "Rust not found" or "'cargo' not recognized"
- Restart your terminal after installing Rust
- Run `rustup --version` to verify installation

### "ANDROID_HOME not set"
- Set the environment variable as described above
- Default location: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`

### "NDK not found"
- Open Android Studio → SDK Manager → SDK Tools
- Install "NDK (Side by side)"
- Set NDK_HOME to the NDK folder (e.g., `...\ndk\25.2.9519653`)

### Build fails with Java errors
- Ensure JAVA_HOME points to Android Studio's JDK:
  `C:\Program Files\Android\Android Studio\jbr`

### "Command failed with exit code"
- Make sure all prerequisites are installed
- Try running as Administrator
- Check if antivirus is blocking the build

### App crashes on phone
- Check minimum Android version (Android 7.0 / API 24+)
- Try the debug APK first for better error messages

## App Information

| Property | Value |
|----------|-------|
| App Name | ChatApp |
| Package ID | com.chatapp.mobile |
| Min Android | 7.0 (API 24) |
| Target Android | 14 (API 34) |

## Development Commands

```bash
# Run in development mode (requires USB debugging)
npm run tauri:android:dev

# Build debug APK
npx tauri android build --debug

# Build release APK
npx tauri android build --apk

# Build for Play Store (AAB)
npx tauri android build --aab
```

## File Locations

| File | Location |
|------|----------|
| Release APK | `src-tauri/gen/android/app/build/outputs/apk/universal/release/` |
| Debug APK | `src-tauri/gen/android/app/build/outputs/apk/universal/debug/` |
| AAB (Play Store) | `src-tauri/gen/android/app/build/outputs/bundle/` |
| Tauri Config | `src-tauri/tauri.conf.json` |
| Android Project | `src-tauri/gen/android/` |
