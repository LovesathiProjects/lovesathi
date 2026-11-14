# Lovesathi

Lovesathi includes three application surfaces:

- `app/`, `components/`, `lib/`: Next.js web app, API routes, and admin portal.
- `android/`, `capacitor.config.ts`: Capacitor Android app loading `https://lovesathi.com` by default.
- `mobile/`: separate Expo/React Native migration, with its own dependencies and environment file. It is not the app built by the root Android commands.

## Web development

Use Node.js 22 or newer (required by Capacitor 8), and npm.

```bash
npm ci
cp .env.example .env.local
```

Fill `.env.local` with the staging Supabase URL and anon/public key. Server API operations also need the service-role key. Admin routes require an `ADMIN_EMAILS` allowlist. Keep service credentials on the server; only the two `NEXT_PUBLIC_SUPABASE_*` values are client configuration.

```bash
npm run dev
npm test
npm run test:server
npm run test:db
npm run typecheck
npm run lint
npm run build
```

Open `http://localhost:3000`. The public Supabase variables must be present during the build because Next.js embeds them in browser assets. A build using placeholder values checks compilation only and cannot validate backend flows.

`test:db` requires local PostgreSQL tools on macOS/Linux. It creates and removes an isolated synthetic database; it never connects to a Supabase project. See [the prepared security rollout](docs/SECURITY_ROLLOUT.md) for the required database/client deployment order for this branch.

`predev` and `prebuild` prepare the pinned MediaPipe model/WASM assets in `public/vendor/face-detection/`. The scanner loads those same-origin files. Keep the preparation step when using a custom build command; generated assets are not committed.

## Android wrapper

Install JDK 21+, Android SDK Platform 36, and Android platform-tools. Set `JAVA_HOME` and `ANDROID_HOME`, or configure `android/local.properties` from its example. The scripts support macOS, Linux, and Windows.

```bash
npm run native:doctor:android
npm run native:build:android
npm run native:test:android
npm run native:install:android -- DEVICE_SERIAL
npm run native:test:android:connected -- DEVICE_SERIAL
```

For release builds, supply the existing upload keystore through the ignored `android/key.properties` file. Gradle refuses release packaging without signing credentials.

```bash
npm run native:assemble:android
npm run native:bundle:android
```

`CAPACITOR_SERVER_URL` selects a hosted staging URL at sync/build time. The wrapper loads the hosted website; rebuilding an APK does not deploy local web changes.

## React Native app

```bash
cd mobile
npm ci
cp .env.example .env
npm run typecheck
npm run android
```

Use the two `EXPO_PUBLIC_SUPABASE_*` variables from the staging project. See `docs/react-native-migration.md` for historical context; current implementation coverage and open checks are tracked in `docs/BUG_AUDIT.md`.

## Backend and verification

`supabase/migrations/` contains incremental changes; `SQL/` includes legacy setup scripts, including destructive table recreation. The repository does not yet contain a complete, verified local database bootstrap. Do not run the legacy scripts against an existing database as an installation step.

See [the audit and verification record](docs/BUG_AUDIT.md) for completed fixes, unresolved findings, and the access needed to finish authenticated web/Android testing.
