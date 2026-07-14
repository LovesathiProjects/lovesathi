# Lovesathi Play Store Release Runbook

Last updated: July 14, 2026

## Current Android App Details

- App name: `Lovesathi`
- Android package ID: `com.lovesathi.app`
- Version code: `3`
- Version name: `1.0.2`
- Target SDK: `36`
- Native wrapper: Capacitor
- Hosted app loaded by wrapper: `https://lovesathi.com`
- Play Store upload artifact: `android/app/build/outputs/bundle/release/app-release.aab`

## What This Repo Can Build

The Android project is already scaffolded in `android/`. The app is a thin native shell that opens the production Lovesathi web app, so the web deployment must stay healthy before every store build.

Use these repo commands:

```powershell
npm run native:doctor:android
npm run native:sync
npm run native:assemble:android
npm run native:bundle:android
npm run native:install:android
npm run native:test:android
npm run native:test:android:connected
```

`native:bundle:android` is the Play Store build command. It syncs the Capacitor shell and creates the release `.aab` only after Android SDK, JDK 17+, and signing are configured. It refuses to produce a debug-signed substitute.

## One-Time Machine Setup

Install Android Studio, then install these from Android Studio SDK Manager:

- Android SDK Platform 36
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools

Install JDK 17 or JDK 21. `npm run native:doctor:android` selects JDK 17+ via `JAVA_HOME`, even if an old Java runtime appears first on Windows `PATH`.

Create `android/local.properties` from `android/local.properties.example`:

```properties
sdk.dir=C\:\\Users\\Microsoft\\AppData\\Local\\Android\\Sdk
```

Do not commit `android/local.properties`; it is machine-specific.

## Release Signing

The release `.aab` must be signed before Play Console accepts it.

Recommended safe path:

1. Use the existing Lovesathi upload keystore. Do not create a replacement key after a bundle has been uploaded to Play Console.
2. Copy `android/key.properties.example` to `android/key.properties`.
3. Set the keystore path, alias, and passwords in the ignored `android/key.properties` file.
4. Run `npm run native:bundle:android`.
5. Save the upload keystore and its credentials in secure backup storage before the first Play Console upload.

Never commit these files:

- `.jks`
- `.keystore`
- `key.properties`
- signing passwords

The repo `.gitignore` blocks common Android signing secret files.

## Play Console Checklist

Before submitting to Google Play, prepare:

- App name, short description, and full description.
- App icon `512x512`.
- Feature graphic `1024x500`.
- Phone screenshots.
- Tablet screenshots if tablet support is enabled.
- Privacy Policy URL.
- Account Deletion URL.
- Support email.
- Data Safety answers.
- Content Rating questionnaire.
- Target audience and ads declaration.
- Closed testing track if Google requires it for the developer account.

## Product QA Before Upload

Test the wrapper on a physical Android phone:

- Login and signup.
- Email OTP confirmation.
- Optional phone verification and skip flow.
- Profile creation.
- Discovery, refine filters, nearby edit, shortlist, interest, superlike, chat, and contact reveal.
- Free, Basic, Essential, Signature, and Heritage entitlement behavior.
- Report, block, safety center, help, privacy, terms, and account deletion.
- Back button behavior.
- No browser-only dead ends.

## Important Store Policy Note

If the Android app sells digital premium features inside the app, Google may require Google Play Billing. Until Play Billing is integrated, avoid enabling an in-app payment flow that violates Play policy.

## Current Local Blockers

This Windows machine has Android SDK Platform 36, an emulator, and JDK 17 installed. The repo scripts configure them for the build process. The remaining release prerequisite is the ignored `android/key.properties` file containing the credentials for the existing upload keystore.

Run:

```powershell
npm run native:doctor:android
npm run native:build:android
npm run native:install:android
npm run native:test:android:connected
```

For a physical phone, enable Developer options and USB debugging, approve the device fingerprint, then use:

```powershell
adb devices -l
npm run native:install:android -- -Serial <device-serial>
```
