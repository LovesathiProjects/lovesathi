# Lovesathi Native Wrapper Runbook

Last updated: May 2026

## Chosen path

Lovesathi now has a Capacitor wrapper configuration and Android shell. The native app should load the production web app at `https://lovesathi.com` for the first app-store candidate, while the Next.js web app remains the source of truth.

This avoids a risky React Native rewrite right now and keeps one product to maintain while we finish core matrimony, admin, safety, and subscription work.

## Local commands

```bash
npm run native:build:android
npm run native:sync
npm run native:open:android
```

The Android project has already been generated in `android/`. Use `native:add:android` only if the folder is deleted and needs to be recreated.

## Android build requirements

- JDK 17 or newer.
- Android Studio or Android command-line SDK.
- `ANDROID_HOME` set to the SDK path, or `android/local.properties` created from `android/local.properties.example`.

On this Windows machine, JDK 17 was installed through Scoop. The remaining local blocker for `native:build:android` is the missing Android SDK path.

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
- Add Apple Sign In if Apple review requires it for the active authentication methods.
- Add native push notifications only after chat and notification policy are final.
- Keep subscription/payment integration last and use store-compliant in-app purchase flows if digital premium features are sold inside the native app.

## Store risk

A pure web wrapper can be rejected if it feels like a simple website inside an app. For the first review candidate, make sure the product feels app-like on mobile, has clear value, account deletion, safety reporting, and no broken browser-only flows.
