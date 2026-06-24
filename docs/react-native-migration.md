# Lovesathi React Native Migration

This repo has a separate Expo React Native app in `mobile/`.

The existing Next.js and Capacitor production app remains untouched. The native app is the long-term replacement for iOS and Android.

## Current State

- `mobile/` is an Expo TypeScript app using React Native and React Navigation.
- Supabase auth is wired with session persistence, 6-digit email OTP verification, and onboarding gating.
- Phone verification uses the existing Supabase/Twilio phone-change OTP flow and can be skipped until Edit Profile.
- Main tabs exist for Discover, Saved, Chat, Activity, and Profile with Lovesathi styling.
- Discovery, chat, activity, and profile data still use mock UI until backend services are ported.
- Admin, legal pages, and payments remain web-only for now.

## Architecture

```
mobile/src/
  contexts/AuthContext.tsx     Session + sign in/up/out
  lib/                         Shared auth, phone, profile routing
  navigation/                  Root navigator + bottom tabs
  screens/                     Auth, verify email, onboarding, main tabs
  components/                  Reusable native UI
```

App flow:

1. `auth` - landing, sign up, sign in
2. `verify-email` - enter the 6-digit Supabase email OTP
3. `onboarding` - optional phone OTP, DOB, gender, ID, and seven-step matrimony setup
4. `main` - bottom tabs for the signed-in app

## Local Commands

```powershell
cd mobile
copy .env.example .env
npm install
npm run android
```

Set these in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Migration Order

1. Auth - done: email/password, session, email OTP, resend, and verification routing
2. Onboarding - done at foundation level: optional phone OTP, DOB, gender, ID, and 7-step matrimony setup wired to Supabase
3. Discovery - connect `matrimonyService`, swipe limits, shortlist, contact reveal
4. Chat - connect Socket.IO + `chatService`
5. Profile centre - edit profile, preferences, subscriptions, settings
6. Subscriptions - native Play Billing and App Store flows
7. Admin - keep as web unless a separate admin app is needed

## Shared Logic To Port From Web

These files in the root `lib/` folder are mostly platform-agnostic and should be copied or adapted into `mobile/src/lib/`:

- `matrimonyService.ts`, `matchmakingService.ts`, `matrimonyShortlistService.ts`
- `planLimits.ts`, `profileContacts.ts`, `contactSafety.ts`
- `chatService.ts` (needs Socket.IO client setup for React Native)
- `schemas/matrimony.ts`, `types.ts`, `displayName.ts`, `profileImages.ts`

Keep web-only for now:

- Radix UI components
- Next.js routes and middleware
- TensorFlow face scanner (replace with native camera flow later)

## Launch Note

This native app is the right long-term direction for Play Store and App Store. Until feature parity is complete, the Capacitor wrapper remains the fastest production-ready mobile package.
