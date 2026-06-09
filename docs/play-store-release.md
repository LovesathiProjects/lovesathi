# Lovesathi Play Store Release Runbook

Last updated: June 9, 2026

## Current Android App Details

- App name: `Lovesathi`
- Android package ID: `com.lovesathi.app`
- Version code: `1`
- Version name: `1.0`
- Target SDK: `36`
- Native wrapper: Capacitor
- Hosted app loaded by wrapper: `https://lovesathi.com`
- Play Store upload artifact: `android/app/build/outputs/bundle/release/app-release.aab`

## What This Repo Can Build

The Android project is already scaffolded in `android/`. The app is a thin native shell that opens the production Lovesathi web app, so the web deployment must stay healthy before every store build.

Use these repo commands:

```powershell
npm run native:sync
npm run native:assemble:android
npm run native:bundle:android
```

`native:bundle:android` is the Play Store build command. It creates the release `.aab` after Android SDK, Java, and signing are configured.

## One-Time Machine Setup

Install Android Studio, then install these from Android Studio SDK Manager:

- Android SDK Platform 36
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools

Install JDK 17 or JDK 21 and make sure `java -version` shows 17+.

Create `android/local.properties` from `android/local.properties.example`:

```properties
sdk.dir=C\:\\Users\\Microsoft\\AppData\\Local\\Android\\Sdk
```

Do not commit `android/local.properties`; it is machine-specific.

## Release Signing

The release `.aab` must be signed before Play Console accepts it.

Recommended safe path:

1. Open Android Studio.
2. Open `android/`.
3. Use `Build > Generate Signed App Bundle / APK`.
4. Choose `Android App Bundle`.
5. Create or select a Lovesathi upload keystore.
6. Save the keystore outside the repo or in a secure password manager.

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

This Windows machine is not ready to build the final `.aab` yet:

- Active Java is currently Java 8, but Android Gradle Plugin needs Java 17+.
- Android SDK is not configured yet.
- `android/local.properties` is missing.

After Android Studio and JDK 17+ are installed, run:

```powershell
java -version
npm run native:sync
npm run native:bundle:android
```
