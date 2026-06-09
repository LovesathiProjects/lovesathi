# Lovesathi Mobile Launch Readiness

Last updated: June 9, 2026

## Current status

Lovesathi is currently a production Next.js web app with Capacitor wrapper configuration and an Android shell. It can be deployed to `lovesathi.com`, installed as a PWA-style experience from supported mobile browsers, and used as the source for a thin native wrapper.

## What is ready

- Responsive matrimony web experience for desktop and mobile browsers.
- Public Terms, Privacy, Safety, FAQ, Contact, and Account Deletion pages.
- In-app account deletion flow through Settings.
- PWA manifest with Lovesathi name, theme color, standalone display, and app icons.
- Capacitor config for `com.lovesathi.app`, loading the hosted app at `https://lovesathi.com`.
- Android Capacitor project scaffolded with portrait orientation, HTTPS-only traffic, and OS backup disabled.
- Android package ID set to `com.lovesathi.app`.
- Android target SDK set to `36`.
- Play Store bundle script added as `npm run native:bundle:android`.
- Basic production security headers in `next.config.mjs`.
- Safety/report/blocking/chat contact-sharing protections in the web app.
- Admin portal for user, profile, verification, report, entitlement, and concierge review.

## What is not native-ready yet

- Native iOS folder has not been generated yet because it requires macOS and Xcode.
- Android release signing, Play Store upload, and physical-device QA are not complete yet.
- This Windows machine still needs Android Studio/SDK and active JDK 17+ before a Play Store `.aab` can be generated locally.
- Native push notifications are not configured.
- Native deep links/universal links are not configured.
- Native app icons and splash assets need final high-resolution PNG exports before store submission.
- Store-specific subscription/payment integration is intentionally queued last.
- Apple Sign In should be added if the iOS app offers Google/social login or if Apple review requires it for the selected auth methods.

## Recommended path

1. Keep the web app as the source of truth.
2. For the first app-store build, wrap the existing web app with Capacitor or a very thin native shell.
3. Use the public policy pages and in-app delete-account flow for review compliance.
4. Add native push notifications and deep links only after the core wrapped app is stable.
5. Complete subscription/payment integration last, using Apple/Google in-app purchases if digital premium features are sold inside native apps.

## Store review notes

- Do not request camera, photos, microphone, contacts, or location permissions until the native app truly uses them.
- If camera or photo upload is used for verification/profile photos, explain this clearly in permission prompts.
- Keep legal language clear that Lovesathi is a matchmaking platform, not a guarantee of marriage, identity, safety, financial status, or relationship outcome.
- Make account deletion discoverable inside the app and keep the public account deletion page live.
