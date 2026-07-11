# Gardan — Progress Log

Autonomous build following the plan in the initiating instructions. One entry per phase.

## Phase 1 — Scaffold (done)

- `create-expo-app` (blank-typescript, SDK 57) into the repo root, converted to
  `expo-router` (file-based routing, `main: expo-router/entry`).
- Folder structure: `app/` (routes), `src/backend/` (adapter + mock + supabase seam),
  `src/i18n/`, `src/theme/`, `src/store/`, `src/components/`, `src/utils/`.
- i18n: `i18next` + `react-i18next`, resources bundled locally (no network fetch),
  `he` (default) and `en` locale JSON files covering every screen planned so far
  (onboarding, home, order lifecycle, chat, rating, profile, bot script templates).
  Typed `t()` via `i18next.d.ts` module augmentation.
- RTL: `I18nManager.forceRTL` applied **before first render** at boot
  (`initLanguageAtBoot`, gated behind a `ready` state in `app/_layout.tsx`) so the
  cold-start paint is always correct without a reload. Interactive language
  switching (Phase 8) reloads the JS root only when the user explicitly changes
  language mid-session — React Native cannot re-flow an already-mounted tree's
  direction without that.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (1 pre-existing
  i18next import-style warning, allowed per gate) · `expo export -p web` succeeds.

### Out-of-plan decisions

- **Network policy blocks `api.expo.dev` and `reactnative.directory`** (org egress
  policy, confirmed via the proxy status endpoint — not retried, per proxy runbook).
  `expo install` requires `EXPO_OFFLINE=1` to skip the network compatibility/version
  lookups and fall back to the SDK's locally bundled compatibility table
  (`node_modules/expo/bundledNativeModules.json`). This is used for every
  `expo install` call for the rest of the build.
- **`legacy-peer-deps=true`** added to `.npmrc`. `expo-router`'s web action-sheet
  support pulls in `vaul`/`radix-ui`, which briefly wants a newer exact `react-dom`
  than the rest of the tree during transitive resolution; this is a peer-dep
  metadata mismatch in third-party packages, not a real incompatibility — plain
  `npm install` (strict peer resolution) fails on it, `--legacy-peer-deps` doesn't.
- **Dropped `baseUrl` from `tsconfig.json`**: TypeScript 6's `expo/tsconfig.base`
  uses `moduleResolution: "bundler"`, where `baseUrl` is deprecated (TS5101) and
  unnecessary — `paths` resolve relative to the tsconfig file without it.
- **Model routing** (per spec §5): scaffold/UI phases run on the current session
  model; Phase 2 (backend adapter architecture) and Phase 3 (bot engine — the
  concurrency/timing-sensitive part) are being delegated to a stronger model via
  a foreground subagent, with every phase independently re-verified (`tsc`/`lint`/
  `export`) by the orchestrating session rather than trusted from the subagent's
  own report.

## Phase 1.5 — Design system (done)

- `DESIGN.md`: thesis (Israeli mobility-dispatch × physio-clinic booking register,
  played completely straight), 6-color palette (cool paper/graphite-ink base, deep
  clinical teal primary, golden-amber single CTA accent, sage/brick status colors),
  typography (display: Suez One; body: Assistant — both picked after explicitly
  rejecting Rubik and Heebo as the generic-Hebrew-UI default, and IBM Plex Sans
  Hebrew / Miriam Libre as considered alternatives), one signature element (the
  Contour Back Map — used functionally for zone-selection and as the waiting-screen
  loading motif, nowhere else), and an ASCII wireframe of Home matching the
  Uber/Bolt/Gett/Wolt bottom-sheet-over-map convention.
- Self-critique gate (§6.2, documented inside `DESIGN.md`): caught the accent amber
  sitting too close to the blacklisted clay/terracotta hue on the first pass
  (`#D9853A` vs. the flagged `#D97757`) and shifted it to `#E8892C`, with the
  distance written into the palette table so it's checkable later. Typography,
  signature element, and layout convention held up under the "would a generic
  services brief land here" test and were kept as-is.
- Implemented as code: `src/theme/tokens.ts` (color/font/fontSize/lineHeight/space/
  radius scales — the single source all components must read from) and
  `src/theme/fonts.ts` (loads `@expo-google-fonts/assistant` +
  `@expo-google-fonts/suez-one`, gated into the root layout's `ready` state
  alongside language init so there's no default-font flash on cold start).
- Verified visually, not just by gate: served the static web export locally and
  screenshotted the placeholder screen with Playwright/Chromium — confirmed the
  Suez One wordmark, Assistant body text, cool paper background and RTL alignment
  all render as designed before moving on.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1
  pre-existing warning) · `expo export -p web` succeeds with both font families
  bundled as local assets (no runtime font fetch).

### Out-of-plan decisions

- Font delivery via `@expo-google-fonts/*` npm packages (bundled `.ttf` assets)
  rather than a runtime Google Fonts fetch — `fonts.gstatic.com` is not on this
  session's egress allowlist, and bundling is the correct approach for a native
  app anyway (no network dependency to render text).

## Phase 2 — Backend adapter + mock auth/presence

_pending_
