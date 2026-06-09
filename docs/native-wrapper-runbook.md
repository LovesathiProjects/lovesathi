# Lovesathi Native Wrapper Runbook

Last updated: June 9, 2026

## Chosen path

Lovesathi now has a Capacitor wrapper configuration and Android shell. The native app should load the production web app at `https://lovesathi.com` for the first app-store candidate, while the Next.js web app remains the source of truth.

This avoids a risky React Native rewrite right now and keeps one product to maintain while we finish core matrimony, admin, safety, and subscription work.

## Local commands

```bash
npm run native:sync
npm run native:build:android
npm run native:assemble:android
npm run native:bundle:android
npm run native:open:android
```

The Android project has already been generated in `android/`. Use `native:add:android` only if the folder is deleted and needs to be recreated.

- `native:build:android` builds a debug APK for local testing.
- `native:assemble:android` builds a release APK.
- `native:bundle:android` builds the Play Store `.aab` release bundle.

## Android build requirements

- JDK 17 or newer.
- Android Studio or Android command-line SDK.
- `ANDROID_HOME` set to the SDK path, or `android/local.properties` created from `android/local.properties.example`.

Current workstation note, June 9, 2026: Java 8 is active on `PATH`, Android SDK is not configured, and `android/local.properties` is missing. Install Android Studio plus JDK 17 or 21 before generating the Play Store bundle.

```bash
npm run native:add:ios
npm run native:sync
npm run native:open:ios
```

The iOS commands require macOS and Xcode. They will not complete on this Windows machine.

## Configuration

- App ID: `com.lovesathi.app`
- App name: `Lovesathi`
- Hosted app URL: `https://lovesathi.com`
- Local Capacitor fallback web directory: `native-shell/`
- Override URL for staging builds: set `CAPACITOR_SERVER_URL`
- Allowed navigation: `lovesathi.com`, subdomains, and Supabase auth/storage domains

## Before store submission

- Replace placeholder icon/splash files with final Lovesathi PNG assets at all required sizes.
- Confirm the app opens `https://lovesathi.com` in production mode.
- Confirm login, email verification callback, reset password, discovery, chat, report/block, settings, and delete account inside the wrapper.
- Confirm optional phone verification and skip-later behavior inside the wrapper.
- Confirm Free, Basic, Essential, Signature, and Heritage limits inside the wrapper.
- Add Apple Sign In if Apple review requires it for the active authentication methods.
- Add native push notifications only after chat and notification policy are final.
- Keep subscription/payment integration last and use store-compliant in-app purchase flows if digital premium features are sold inside the native app.
- Follow `docs/play-store-release.md` for the Android `.aab` upload path.

## Store risk

A pure web wrapper can be rejected if it feels like a simple website inside an app. For the first review candidate, make sure the product feels app-like on mobile, has clear value, account deletion, safety reporting, and no broken browser-only flows.
