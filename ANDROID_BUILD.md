# Chat App - Android Build Instructions

This guide explains how to build the Android APK on your laptop with Android Studio.

## Prerequisites

1. **Android Studio** - Already installed on your laptop
2. **Java JDK 17+** - Usually bundled with Android Studio
3. **Node.js 18+** - For running npm commands

## Quick Start

### Option 1: Open in Android Studio (Recommended)

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/arulg2009/Chat-app.git
   cd Chat-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Sync Capacitor**:
   ```bash
   npm run android:sync
   ```

4. **Open in Android Studio**:
   ```bash
   npm run android:open
   ```
   
   Or manually open Android Studio and select: `File > Open > Chat-app/android`

5. **Build APK in Android Studio**:
   - Wait for Gradle sync to complete
   - Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Command Line Build

```bash
# Sync and build debug APK
npm run android:build

# For release APK (requires signing)
npm run android:release
```

## Configuration

### Update App URL

Edit `capacitor.config.ts` to change the server URL:

```typescript
server: {
  url: 'https://your-app-url.vercel.app',
  cleartext: true,
},
```

Then run `npm run android:sync` to apply changes.

### Change App Icon

Replace the icon files in:
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

### Change App Name

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

## Installing on Android Device

### Debug APK (for testing)
1. Enable "Unknown sources" or "Install unknown apps" on your Android device
2. Transfer the APK to your phone
3. Tap the APK file to install

### Release APK (for distribution)
1. Create a signing key in Android Studio
2. Run `npm run android:release`
3. Sign the APK
4. Upload to Google Play Store or distribute directly

## Troubleshooting

### Build fails with Gradle errors
```bash
cd android
./gradlew clean
cd ..
npm run android:sync
```

### App shows blank screen
- Check that the Vercel URL in `capacitor.config.ts` is correct
- Ensure your phone has internet connection
- Check Android Studio Logcat for errors

### Camera/Microphone not working
- Make sure you granted permissions when the app asked
- Go to Settings > Apps > Chat App > Permissions and enable all

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml    # App permissions
│   │   ├── java/.../MainActivity  # Main activity
│   │   ├── res/
│   │   │   ├── values/colors.xml  # Theme colors
│   │   │   ├── values/strings.xml # App name
│   │   │   └── mipmap-*/          # App icons
│   │   └── assets/public/         # Web assets
│   └── build.gradle               # App build config
└── build.gradle                   # Project build config
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run android:sync` | Sync web assets to Android |
| `npm run android:open` | Open project in Android Studio |
| `npm run android:build` | Build debug APK |
| `npm run android:release` | Build release APK |
