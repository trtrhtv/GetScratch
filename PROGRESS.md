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

## Phase 2 — Backend adapter + mock auth/presence (done)

- `src/backend/types.ts`: all shared domain types (`User`, `ScratcherProfile` with
  an internal-only `isBot` flag never surfaced through any UI-facing shape,
  `Order`/`OrderStatus`, `ChatMessage`, `Rating`, `GeoPoint`, etc).
- `src/backend/adapter.ts`: the `BackendAdapter` interface — `auth` / `presence` /
  `orders` / `chat` / `ratings`, fully async, no platform details (no AsyncStorage,
  no timers) leaking into the seam, so a future `SupabaseBackend` can implement it
  unchanged.
- `src/backend/mock/seed.ts`: ~25 static Israeli-persona records (pure data, no
  behavior) — the pool the future bot-availability/accept-decline layer (Phase 3)
  will animate.
- `src/backend/mock/index.ts`: `MockBackend implements BackendAdapter` — in-memory
  state mirrored to AsyncStorage (write-through, loaded once on first use); a
  small internal pub/sub emitter backs every `subscribe*` method; mutations
  notify after a random 1.5–8s delay (constructor-injectable, so tests run fast)
  so the mock feels like a real backend. Went beyond the phase's "auth + presence"
  minimum and implemented orders/chat/ratings fully too, since the shape was
  straightforward — bot behavior itself (auto accept/decline, scripted chat)
  stays out of scope here and is explicitly marked inert pending Phase 3.
- `src/backend/supabase/README.md`: short placeholder describing the future seam.
- Test harness: `jest-expo` + `jest.config.js` + `jest.setup.js` (mocks
  `@react-native-async-storage/async-storage` via its official jest mock —
  needed because the real native module isn't linked under plain Jest). Smoke
  test in `src/backend/mock/__tests__/adapter.test.ts`: sign up → verify with the
  demo code → `getCurrentUser` round-trips correctly; a wrong code is rejected;
  availability toggles and reads back; `listNearby` returns the seeded pool.
  4/4 passing.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1
  pre-existing warning) · `expo export -p web` succeeds · `jest` 4/4 passing.
- Built `src/components/{Avatar,Button,Card,ScreenContainer,AvailabilityToggle,
  RatingStars}.tsx` and `src/utils/avatarPresets.ts` in parallel (reusable
  primitives every later screen phase needs; pure UI/theme work with zero
  backend dependency, so safe to build alongside).

### Out-of-plan decisions

- **Model handoff mid-phase**: delegated this phase to a stronger model via a
  foreground subagent per the plan's own model-routing guidance. It produced a
  complete, correct `types.ts`/`adapter.ts`/`seed.ts`/`mock/index.ts` (went
  beyond the ask, implementing all five API domains) but hit a session usage
  limit before setting up the test harness. Rather than block on that model's
  limit resetting, the orchestrating session finished the test setup itself and
  re-verified the entire phase's output independently — did not trust the
  subagent's unfinished report.
- **Fixed a real concurrency bug found on review**: `subscribeNearby`'s initial
  snapshot was scheduled against the whole `"nearby"` channel, so each new
  subscriber would cause every *other* already-subscribed listener to receive a
  redundant duplicate emit too. Changed it to target only the new subscriber's
  own callback for its initial snapshot.
- **Jest version pin**: `jest-expo@~57.0.1`'s peer dependency (`@react-native/
  jest-preset@^0.86.0`) is only compatible with Jest 29.x internals (`jest-mock`
  API surface) — Jest 30 (the current `npm install jest` default) throws at
  runtime (`clearMocksOnScope is not a function`). Pinned `jest`/`@types/jest`
  to `^29`. Also needed a small `jest.setup.js` calling `jest.mock(...)`
  explicitly for AsyncStorage — pointing `setupFiles` directly at the vendor
  mock file isn't sufficient, since that file only exports the mock object and
  doesn't register itself with Jest's module registry on its own.
- Moved `jest`/`jest-expo`/`@types/jest`/`@react-native/jest-preset` into
  `devDependencies` (the subagent's `expo install jest-expo` call had placed
  `jest-expo` under `dependencies` by default).

## Phase 3 — Bot engine (done)

- `src/backend/mock/bots.ts`: pure, timer-free decision/content logic (no
  MockBackend access — everything takes an injectable `rng`, easy to unit test):
  `shouldBotAccept`/`acceptanceProbability`/`fairPrice` (baseline ~35% acceptance
  at a "fair" reference price for the zone/intensity/duration combo, i.e. ~65%
  decline per the product spec, rising with price — documented formula inline),
  `pickDeclineReason`/`pickEtaMinutes`, `buildScratcherChatLines`/
  `buildCustomerChatLines` (via the `i18n` singleton's standalone `.t()`, no
  React context needed), `nextAvailableFlags` (keeps 1–3 of the ~25 bots
  available at any moment — product spec), `isSeedBotId`,
  `buildBotCustomerOrderTerms`.
- `src/backend/mock/index.ts` wired it all in:
  - **Availability rotation**: bots now start with only 1–3 available (not all
    25). A per-instance rotation loop (3–10 min window, constructor-injectable)
    starts lazily on the first `subscribeNearby` and stops once the last
    subscriber unsubscribes — a fresh `MockBackend` starts no timers.
  - **Order responses**: an order created against a seed bot schedules a
    decision 5–20s later that re-reads the order's *current* price (so a
    `raisePrice` call before the timer fires is respected) and reuses the same
    `applyOrderResponse` transition helper the public `orders.respond` uses (no
    duplicated status-machine logic). On accept, schedules the scripted
    scratcher-chat sequence with the real ETA interpolated in.
  - **Customer-bot requests**: while the signed-in user is available, a random
    available bot originates a request against them every 5–15 min via a new
    internal path (the public `orders.create` assumes the signed-in user is the
    customer, so this bypasses it directly) — stops the moment the user goes
    unavailable. On accept, the bot sends its scripted customer-side lines.
  - `dispose()` clears every internal timer (rotation, customer-request loop,
    pending bot decisions, chat steps) so a `MockBackend` instance can be torn
    down cleanly — used in test teardown.
- New tests: `bots.test.ts` (pure-function unit tests — acceptance curve at
  forced rng extremes, decline-reason/ETA ranges, availability-count invariant,
  order-terms shape) and `lifecycle.test.ts` (a full mock order lifecycle with
  a forced-accept rng: create → bot accepts → scripted chat arrives → complete;
  a real-`Math.random` run asserting it always leaves `"pending"` either way; a
  raised-price-changes-the-decision case; rotation re-emitting to a live
  subscriber over time and stopping after the last unsubscribe). 22/22 passing,
  stable across repeated runs, clean `--detectOpenHandles` exit.
- Verification gate (re-run independently, not just taken from the subagent's
  report): `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1 pre-existing
  warning) · `jest` 22/22 passing (ran 4× including `--detectOpenHandles`,
  stable) · `expo export -p web` succeeds.
- Read the entire diff line-by-line before accepting it. Found and reasoned
  through one latent gap: `scheduleEmit` (the general one-shot notify-after-
  delay used by every order/chat/rating mutation) isn't tracked by `dispose()`
  the way the bot timers are — a `dispose()` call doesn't cancel an
  already-in-flight one-shot notification. Left as-is: unlike the rotation/
  customer-request loops (which repeat indefinitely and are the actual reason
  `dispose()` exists), these are bounded, fire once, and — at the short delays
  used everywhere in this codebase — resolve well before any test or component
  unmount would care. Not the kind of leak `dispose()` was built to prevent.

### Out-of-plan decisions

- **Model retry succeeded**: re-delegated to the same stronger model that hit a
  session limit in Phase 2. This run completed cleanly end-to-end, including
  its own self-verification — independently reproduced here rather than taken
  on faith (see gate results above).
- No changes were needed to `types.ts`/`adapter.ts`/the i18n locale files —
  the Phase 2 contract and the i18n keys prepared in Phase 1 covered everything
  the bot engine needed.

## Phase 4 — Onboarding + Terms of Service (done)

- `src/store/useAppStore.ts`: thin Zustand store wrapping the `BackendAdapter`
  singleton (`user`, `onboardingCompleted`, `termsAccepted`, `hydrated` +
  actions) — every action writes through the adapter first and only then
  updates local state from its response, so the adapter stays the source of
  truth.
- Screens: `app/onboarding/welcome.tsx` (wordmark + CTA), `signup.tsx` (single
  route, two internal sub-phases: name+phone → demo-code verification, matching
  the spec's "3 screens" count), `avatar.tsx` (grid picker using the Phase 2
  `AvatarPicker`), `terms.tsx` (scrollable ToS text + mandatory checkbox
  gating the CTA — checking it and confirming calls
  `acceptTermsAndFinishOnboarding()`, which sets both flags together since
  terms-acceptance is the last onboarding step).
- `app/index.tsx`: a routing gate (not a real screen) — redirects to onboarding
  or `/home` based on store state.
- `src/components/Checkbox.tsx`: small reusable primitive for the terms
  checkbox.
- `app/home.tsx`: minimal placeholder (just enough for the redirect target to
  resolve) — Phase 5 replaces its content with the real Home screen.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1
  pre-existing warning) · `jest` 22/22 (unaffected) · `expo export -p web`
  succeeds.
- **Drove the entire flow in a real browser** (Playwright against the static
  web export, not just build-success): welcome → signup → demo-code verify →
  avatar pick → terms accept → lands on Home showing the signed-up user's name
  → hard reload → still on Home, onboarding correctly skipped. Screenshotted
  every step.

### Out-of-plan decisions / bugs caught by actually testing

- **Found and fixed a real hydration bug via the browser test, not by
  inspection**: store hydration (`useAppStore.hydrate()`) was only wired into
  `app/index.tsx`'s mount effect. That screen only mounts when the app boots
  at `/` — a hard reload or deep link landing directly on `/home` (or any other
  authenticated route) skipped it entirely, leaving `user` stuck at `null`
  even though a valid session was persisted in AsyncStorage. First reload
  screenshot showed the wordmark with the user's name silently missing.
  Fixed by moving hydration into the root layout's boot sequence (alongside
  the existing language/font gating in `app/_layout.tsx`) so it runs on every
  app boot regardless of entry route; `index.tsx` now just reads the
  already-hydrated state. Re-ran the full flow after the fix and confirmed the
  name survives a hard reload.
- **Local test-server gotcha, not an app bug**: the first browser-test pass
  used a plain `python -m http.server` to serve the static export, which has
  no SPA fallback — reloading at `/home` 404'd before the bug above was even
  reachable. Wrote a 3-line Node static server with SPA fallback (serve
  `index.html` for any unmatched path) to test correctly; this is what any
  real static host (and `expo start --web`'s dev server) already does, so it
  doesn't affect the deployed app, only how a *local* export must be served to
  test a deep-linked reload.
- Simple digit-based Israeli mobile validation (`05\d{8}` after stripping
  non-digits) for the mock signup form — good enough for a fake-SMS demo flow,
  not meant to be a real phone-validation library.

## Phase 5 — Home screen + map/list + availability toggle (done)

- `app/home.tsx`: replaces the Phase 4 placeholder — top bar (menu / wordmark /
  profile icon), the availability toggle wired to the store, a nearby panel,
  and a bottom sheet showing the selected scratcher with the dominant "הזמן
  גירוד" CTA (or a "pick someone" banner when nothing's selected yet). Selects
  the first nearby scratcher automatically once the list loads, and keeps the
  selection stable across updates unless the currently-selected one drops out.
- **`react-native-maps` kept fully out of the web bundle** via Metro's
  platform-extension convention: `NearbyPanel.native.tsx` (real `MapView` with
  avatar-styled markers) and `NearbyPanel.web.tsx` (the distance-sorted list
  fallback, exactly per `DESIGN.md`'s wireframe) — imported from `home.tsx` as
  a bare `@/components/NearbyPanel`, which Metro resolves per-platform.
  Confirmed empirically, not just assumed: grepped the exported web bundle for
  `react-native-maps`-specific native-module strings — zero matches.
- `src/components/ScratcherListRow.tsx` / `SelectedScratcherCard.tsx`: the two
  presentational pieces for a scratcher (compact row vs. the bigger bottom
  card), both reading avatar/rating/specialty off `ScratcherProfile`.
- `src/utils/specialtyLabels.ts` + `src/utils/geo.ts`: extracted the
  zone/intensity → i18n-key maps (previously private to `ContourBackMap`, now
  shared with the list row/card) and a shared mock "my location" constant
  matching the seed bots' placement center.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1
  pre-existing warning) · `jest` 22/22 (unaffected) · `expo export -p web`
  succeeds, with the `react-native-maps` exclusion confirmed via bundle grep.
- **Drove it in a real browser again**: fast-forwarded onboarding, landed on
  Home, waited out the mock's real 1.5–8s subscription delay, confirmed the
  nearby list renders correctly (bot names, initials avatars, ratings,
  specialties, distances), toggled availability and watched it flip to the
  active teal state, selected a scratcher and confirmed the bottom card +
  amber CTA render correctly. No console errors.

### Out-of-plan decisions / bugs caught by actually testing

- **`tsconfig`'s `moduleSuffixes` broke third-party type resolution — caught
  before it shipped, not after**: the textbook fix for TS not understanding
  Metro's `.native.tsx`/`.web.tsx` convention is adding `moduleSuffixes` to
  `compilerOptions`. Doing that made `tsc` suddenly report `lucide-react-native`
  icons' `color` prop as invalid everywhere in the app (`Checkbox`,
  `RatingStars`, `ScratcherListRow`, `SelectedScratcherCard`, `home.tsx`) —
  `moduleSuffixes` changed how TS resolves that package's `exports` conditions
  project-wide, not just our own files. Reverted it and used the actual
  standard RN/Metro pattern instead: a plain `NearbyPanel.tsx` that only
  re-exports the `.native` implementation for `tsc`'s benefit — Metro always
  prefers the platform-suffixed sibling over a plain file at bundle time, so
  this shim is never actually loaded at runtime on any platform. Verified the
  fix didn't regress by re-running the full `tsc` pass (0 errors, no lucide
  fallout) and re-confirming the web bundle still excludes
  `react-native-maps`.
- First timing pass of the browser test showed an empty nearby list and looked
  like a bug at a glance — turned out to be well within the mock's normal
  1.5–8s random subscription delay (the test's fixed 3s wait was occasionally
  too short). Re-ran with a longer wait to confirm before concluding anything
  was actually wrong; nothing was.

## Phase 6 + 7 — Full order flow, chat, phone, completion, rating (done)

Built and verified together in one pass: `active.tsx` (needed by both
"accepted" transitions — customer side from `waiting.tsx`, scratcher side
from `incoming-request.tsx`) requires chat/phone/complete to be functional
before either phase's own "works end-to-end" gate can actually be tested.
Splitting them would have meant writing `active.tsx` twice. Two phases,
one coherent commit — documented here rather than forced into an artificial
boundary.

- `app/order/create.tsx`: zone via `ContourBackMap`, intensity/duration via
  `SegmentedControl`, price via a `PriceStepper` (substituted for a slider —
  see "out-of-plan" below) defaulting to `fairPrice(...)` for the current
  mix (imported straight from `bots.ts`, reused rather than re-derived) until
  the user manually adjusts it, after which their choice sticks.
- `app/order/waiting.tsx`: subscribes to the order; the signature `RadarPulse`
  motif (see below) while pending; on decline, a "raise price and retry"
  button creates a *new* order (same terms, +₪5) rather than mutating the
  terminal declined one; on accept, auto-navigates to `/order/active`.
- `app/incoming-request.tsx`: a modal route (registered in `_layout.tsx`'s
  `Stack.Screen` with `presentation: "modal"`) — order details, a live 30s
  countdown that auto-declines on expiry, accept/decline. `app/home.tsx`
  polls `orders.listIncoming()` every 4s while available (the adapter has no
  dedicated "subscribe to my incoming requests" method — light polling is the
  pragmatic MVP choice, noted in `adapter.ts`'s own docs as a seam a real
  backend would replace with a push subscription).
- `app/order/active.tsx`: status + ETA, phone reveal (`mockPhoneForId` — bots
  have no real phone in the seed data) with a `tel:` call button, `ChatThread`
  (bubbles aligned by sender, live via `chat.subscribe`), and the complete
  button — visible to whichever party is the real user, since a bot
  counterparty never calls `markComplete` itself.
- `app/order/rate.tsx`: interactive `RatingStars` + a single-select quick-tag
  chip (role-appropriate tag set from i18n), submits via `ratings.submit`
  (moves the order to `"rated"`) or skips, then returns to Home.
- `src/components/RadarPulse.tsx`: the DESIGN.md-mandated signature loading
  motif — reuses `ContourBackMap`'s actual zone-contour SVG paths (not a
  generic spinner), pulsing on a slow loop; respects
  `AccessibilityInfo.isReduceMotionEnabled` per DESIGN.md §6.4.
- `src/components/ChatThread.tsx`, `PriceStepper.tsx`; `src/utils/mockPhone.ts`.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1
  pre-existing warning) · `jest` 24/24 (2 new tests added, see below) ·
  `expo export -p web` succeeds.

### Drove both sides of the full lifecycle in a real browser, not just the gate

- **Customer side** (order *from* a bot): fast-forwarded onboarding → Home →
  picked a scratcher → filled zone/intensity/duration, boosted the price via
  the stepper to bias the bot's accept curve → submitted → waiting screen
  showed the pulsing radar → bot accepted → active screen showed the right
  counterparty, ETA, phone number, and the bot's scripted "on the way"
  message already arriving → sent a chat message → completed → rating screen
  (stars + tags) → submitted → landed back on Home. Zero console errors
  across the whole run.
- **Scratcher side** (bot requests *from* the real user): toggled available
  on Home, waited for Home's poll to catch a bot-originated request, the
  incoming-request modal appeared with correct order details and a live
  countdown, accepted it → active screen (correct role-specific data) → the
  bot's scripted *customer*-side chat arrived → completed → rating screen
  with the scratcher-appropriate tag set → back to Home. To make this
  practical to test live (the real default is a 5–15 *minute* window), the
  singleton's `botCustomerRequestMinMs/MaxMs` were **temporarily** shrunk for
  this one test run and reverted immediately after (`git diff` checked empty
  before committing) — not shipped as a debug config.

### A real bug the scratcher-side test surfaced — found and fixed, not shipped

Testing with that intentionally-shortened timer caused a *second*
bot-originated request to fire while the first was still being handled,
popping a second incoming-request modal **on top of** the active-order
screen and blocking the complete button. Root cause: `expo-router`'s `Stack`
keeps a previous screen mounted (not unmounted) when you push a new one, so
Home's `setInterval` polling effect kept running in the background the
entire time the user was deep in an order flow on a completely different
screen — not merely while the shortened test timer was active. This is real
production behavior, just astronomically unlikely to bite with the actual
5–15 minute default window (a single order interaction takes well under a
minute). Fixed properly rather than dismissed as a test artifact: switched
Home's incoming-request polling from `useEffect` to `useFocusEffect`
(re-exported by `expo-router`), so it only runs while Home is the focused
screen and pauses the moment the user navigates into an order flow. Re-ran
the same scratcher-side browser test after the fix and confirmed no more
overlapping modal.

### Other out-of-plan decisions

- **`PriceStepper` (±₪5 buttons) instead of a slider**: the spec calls for a
  slider; adding `@react-native-community/slider` this late would mean
  another native-dependency install round for a control that's functionally
  equivalent here (price only ever needs ₪5 increments — the same granularity
  the "raise offer" action already uses). Simpler, and delivers the same
  product behavior.
- **The real scratcher never sets their own ETA** — accepting an incoming
  request defaults to a flat 5-minute ETA (`incoming-request.tsx`) rather
  than adding an ETA-picker UI; there's no GPS/routing in this mock world to
  make a picker meaningful anyway.
- **`OrderStatus.in_progress` is defined but currently unused** — the state
  machine goes `pending → accepted → completed (→ rated)` in practice;
  nothing transitions an order to `"in_progress"` yet, so the
  `statusInProgress`/`statusInProgressAsScratcher` i18n copy is unused for
  now. Left the type and copy in place (harmless, and a natural seam if a
  future "scratcher is en route" update is added) rather than ripping it out
  mid-build.
- Counterparty lookups (`active.tsx`, `incoming-request.tsx`, `rate.tsx`)
  resolve a bot's display info via `presence.listNearby(...).find(...)`
  rather than a dedicated "get profile by id" adapter method — reusing what
  already exists rather than growing the adapter surface for a mock-only
  need; a real backend would obviously add a direct lookup.

## Phase 8 — Profile + history + language switch (done)

- `app/profile.tsx`: my details (avatar/name/phone), ratings split by role
  (`asCustomer`/`asScratcher`, each with an empty-state when `count === 0`),
  order history (filtered to `completed`/`rated` orders — "history" means
  finished transactions, not the full raw order log), language switch, and
  a terms link.
- `app/onboarding/terms.tsx` made **dual-purpose** rather than duplicated:
  when `onboardingCompleted` is already true, it renders read-only (no
  checkbox/CTA, just a "back" button) — the same screen serves both the
  first-time acceptance flow and later reference from Profile.
- `src/components/HistoryRow.tsx`: one row per finished order — counterparty,
  role played, date, price, status.
- `src/components/BackButton.tsx`: a small reusable back-chevron (added to
  `profile.tsx` and `order/create.tsx`, the two screens that had no exit
  affordance at all before this — everything else already has one via its
  own cancel/skip button). Points the correct logical direction
  (`I18nManager.isRTL` picks `ChevronRight` vs. `ChevronLeft`), so it flips
  correctly with the language switch too — confirmed in the browser test
  below, not just assumed.
- Verification gate: `tsc --noEmit` 0 errors · `expo lint` 0 errors (same 1
  pre-existing warning) · `jest` 24/24 (unaffected) · `expo export -p web`
  succeeds.

### Drove the language switch live — the highest-risk part of this phase

This is the one piece of the whole build that fundamentally can't be
verified by reading code (`I18nManager.forceRTL` + reload is real-runtime
behavior). Browser test: signed up → Profile screen in Hebrew (RTL,
`ChevronRight` back arrow, ratings/history correctly empty-state for a fresh
user) → tapped "English" → the app reloaded (as designed — RN can't re-flow
an already-mounted tree's direction without it) → **entire layout flipped to
LTR**: title switched to "Profile", every label translated, the language
segmented control itself re-flowed (English now sits on the visual right
where Hebrew had been on the visual right before — the row direction
inverted), and the back chevron flipped to `ChevronLeft`. Then followed the
terms link and confirmed it rendered the **English legal text**, read-only
(no checkbox), LTR-aligned. All of this matched what was designed, not
assumed from the implementation.

### Out-of-plan decisions

- Home's header icon buttons (`Menu`/profile) turned out not to be reliably
  targetable by Playwright's `getByRole('button')` query on the web export
  (likely an RN-web accessibility-role mapping quirk for bare `Pressable`
  icons without a text label) — navigated directly via URL to `/profile` for
  the browser test instead of clicking the header icon. The tap handler
  itself (`onPress={() => router.push("/profile")}`) is unchanged and correct;
  this was purely a test-authoring workaround, not a product fix.

## Phase 9 — Polish pass (done)

- **Animation audit**: grepped the whole codebase for `Animated.` usage —
  only `RadarPulse` (the sanctioned waiting-screen motif) and the Stack's
  built-in screen-transition fade exist. No ambient/atmosphere animation
  anywhere, per DESIGN.md §6.4's explicit warning against it.
- **Loading-state audit**: `active.tsx`, `incoming-request.tsx`, and
  `profile.tsx` each had a bare `if (!x) return null;` guard while their
  initial async fetch was in flight — a blank paper-colored flash instead of
  a styled loading state. Added `src/components/LoadingView.tsx` (centered
  `ActivityIndicator` in brand slate) and used it in all three.
- **Hardcoded-string audit**: grepped `app/` and `src/components/` for Hebrew
  text and English text directly inside `<Text>` outside `t(...)` calls —
  zero hits (the only literal characters found were the `·` separator dot,
  language-neutral punctuation, not translatable content).
- **Emoji audit**: scanned both locale JSON files with a proper emoji
  Unicode-range regex (an earlier ad-hoc check falsely flagged ordinary
  Hebrew punctuation like `״`/`׳` and the `₪` sign as suspect — verified the
  false positive before trusting the result) — zero emoji in any UI string,
  consistent with DESIGN.md §6.5.
- **Tone read-through**: read both `he.json` and `en.json` end to end.
  Consistently dry/corporate register throughout, no jokes, sentence-case
  English, no register slips between sections.

### Ran every flow twice, end to end, in a real browser — not just per-phase

A combined run beyond what any single phase's own testing covered: full
onboarding → Home → order-from-a-bot (Hebrew) → active → complete → rate →
back to Home → **switched to English via Profile** → Home again → a
**second full order cycle entirely in English** (zone/intensity/duration
selection, submit, waiting, active, complete, rate) → back to Home.
Zero console errors or exceptions across the entire two-pass run. This was
the first time the order-creation flow had actually been exercised in
English — confirmed the `ContourBackMap` zone legend, segmented controls,
back-chevron direction, and price stepper all work correctly under a live
language switch, not just that the Hebrew path works.

### Out-of-plan decisions

- No functional bugs surfaced in this pass (Phases 5–8's live testing had
  already caught and fixed the real ones — the hydration bug, the
  `moduleSuffixes` type-resolution regression, and the overlapping-modal
  polling bug). This phase was verification-only: confirming the invariants
  DESIGN.md and the plan's own polish checklist call for actually hold,
  rather than assuming they did from having followed the rules while
  writing each screen.

## Phase 10 — README + final docs, and a major correctness bug found and fixed

- `README.md`: what the app is, how to run it (no env vars/API keys needed —
  everything is local mock data, the phone-verification code is always
  `000000`), test/lint/typecheck commands, project structure, links to
  `DESIGN.md` and this file.
- `src/backend/supabase/README.md`: expanded from a short placeholder into a
  real plan — proposed Postgres schema (users/orders/chat_messages/ratings)
  mapped directly from `types.ts`, how each of the adapter's five domains
  maps to Supabase primitives (Auth, PostGIS for `listNearby`, Realtime
  channels replacing the mock's emitter, RLS for chat/order visibility,
  a trigger for the running rating average instead of the mock's manual
  update), and an explicit note that the bot engine has no equivalent in a
  real backend (bots exist only to demo a marketplace before it has real
  supply).

### A real, serious bug found during final testing — full writeup

While closing the last gap in the plan's own Definition of Done (§7:
"decline from a bot → raise price → retry" specifically called out as a
required E2E path, and it had only been exercised in `jest`, never live),
a live browser test of the decline path revealed that the waiting screen
**never updated** to show the declined banner — it sat on the pending
radar indefinitely, even though the backend had genuinely transitioned the
order to `"declined"` (confirmed by inspecting `localStorage` directly, and
confirmed further by the fact that reloading the page immediately showed
the correct declined state).

What it wasn't, ruled out in order via live instrumentation (each with a
rebuild + browser re-test, not just reasoning about it):
- **Not a timing/throttling artifact.** An isolated `jest` test against the
  same `MockBackend` with real (non-shortened) default delays resolved
  correctly in 16s. A version with the decision delay shortened to 2–4s
  *still* failed live in the browser every time — ruling out "just needs
  longer than my test waited."
- **Not `RadarPulse`/animation starvation**, despite a very plausible-looking
  lead: the console explicitly warned `useNativeDriver` isn't supported on
  web and falls back to JS-driven animation, and disabling the component
  once did appear to "fix" it. Rebuilt `RadarPulse` as a genuine two-file
  platform split (`RadarPulse.native.tsx` keeps the original `Animated`
  version, which is correct and native-driven on real iOS/Android;
  `RadarPulse.web.tsx` uses pure CSS `animationKeyframes`, off the JS thread
  entirely) — and the bug persisted identically. Then tested a fully static,
  non-animated placeholder in place of the radar — *still* failed. This
  ruled out animation, on either implementation, as the cause.
- **Not the Stack screen-transition.** Set `animation: "none"` on the root
  `Stack` — no change.

Root cause, found by instrumenting `on()`/`scheduleEmit()`/`mutateOrder()`
with logging and tracing the exact object flowing through: `mutateOrder`
(and several other write paths) **mutated the `Order`/`User` object already
stored in `this.state` in place**, then handed that *same* object reference
back out through `scheduleEmit`'s notification. `waiting.tsx` holds the
order in a plain `useState`, first populated from an initial `getById()`
call that returns that same live reference. When the later update arrived
with the *same* object reference (just with its `.status` field mutated),
React's built-in `Object.is` bail-out on `setState` correctly concluded
"this is the same value as before" and skipped the re-render — even though
the data had genuinely changed. `router.replace(...)` on the accept path
masked the exact same bug there: navigation is an imperative call
independent of whether the local re-render actually happens, so accept
"appeared" to work every time it was tested, while decline (which has no
navigation to fall back on) was the first path to actually expose it.

Fixed at the source, not papered over with a UI-side workaround:
- `mutateOrder` (and a new shared `replaceOrder`/`replaceUser` pair) now
  **clone before mutating** and store the clone as the new value at that key,
  so every write produces a fresh, referentially-distinct object.
- Same fix applied to `updateAvatar`, `setAvailability` (both mutated the
  current `User` in place), `appendMessage` (mutated the messages array via
  `.push()` in place — meaning a *second* chat message might have had the
  exact same silent-drop problem, not just order-status changes), and
  `ratings.submit`'s two mutation sites (the ratee's nested rating-summary
  object, and the order's `"completed" → "rated"` transition, which
  previously bypassed `mutateOrder` entirely).
- Added `src/components/BackButton`-style **defensive polling** to
  `waiting.tsx` (a 3s `getById()` poll alongside the subscription) as cheap
  extra insurance — not the fix itself, but reasonable belt-and-suspenders
  for a pub/sub UI pattern regardless of this specific bug.
- Kept the `RadarPulse.native.tsx` / `RadarPulse.web.tsx` platform split
  that came out of chasing this — even though it wasn't the actual cause,
  a pure-CSS web animation is strictly better than a JS-driven `Animated`
  fallback on web (avoids the console warning, costs nothing on the JS
  thread), so the investigation still produced a real, if secondary,
  improvement.
- Added `src/components/NearbyPanel`-style type-resolution shim
  (`RadarPulse.tsx`) for the same reason as Phase 5's `moduleSuffixes`
  lesson — Metro resolves the platform-suffixed files at bundle time
  regardless.

**New regression tests** (`lifecycle.test.ts`, "every mutation produces a
fresh object reference"): assert directly that `getById()` returns a
different reference after a status transition, that a chat thread's array
reference changes on every new message, and that a rated user's ratings
summary object is fresh after `ratings.submit` — using `.not.toBe()`
(reference inequality), the exact property that was silently broken.
These exist specifically so this class of bug can't reappear without a
test failing immediately, rather than surfacing only in a live UI months
later. 27/27 tests passing (24 prior + 3 new), stable across repeated runs.

**Re-verified the fix live, comprehensively, not just via the unit tests**:
ran the decline scenario 3 times in a row with full production default
delays (5–20s decision + 1.5–8s notify) — the declined banner now renders
correctly every time, no reload needed. Tested "raise price and retry"
end-to-end (declined → click retry → new order created → back to the
pulsing radar state for the new order, all live). Ran a full accept-path
regression checking that *multiple* sequential scripted bot chat messages
arrive live (5 of 6 observed within the test's watch window — the pattern,
not just the first message, confirmed working). Confirmed zero console
errors across every run. Confirmed `react-native-maps` still excluded from
the web bundle after all these changes (the `RadarPulse` platform split
didn't disturb the `NearbyPanel` one). Confirmed no temporary test-only
settings (shortened delays, disabled animation, the debug `console.log`
instrumentation) leaked into the committed diff — checked via `git diff`
before every commit in this phase.

### Final Definition-of-Done check (per the initiating plan's §7)

- [x] `expo export -p web` succeeds (verified throughout every phase).
- [x] Full customer-side E2E: signup → order → **decline from a bot** →
  **raise price and retry** → accept → chat → complete → rate → appears in
  history (Profile's order history, filtered to completed/rated).
- [x] Scratcher-side: availability toggle → incoming bot-customer request
  (modal, live countdown) → accept → chat → complete.
- [x] he/en complete (every string audited, zero hardcoded text), RTL/LTR
  verified live including a full second order cycle entirely in English.
- [x] Zero `tsc` errors, `expo lint` 0 errors, one commit per phase (or per
  inseparable phase-pair, documented when that happened).
- [x] `README.md` with run instructions + this file summarizing the build.

Gardan is feature-complete against the initiating plan. The only structural
gap against a "real" product is the backend itself (by design — see
`src/backend/supabase/README.md` for the documented path to one), and the
`OrderStatus.in_progress` state, which is modeled but never entered (noted
in Phase 6+7 — the state machine goes `pending → accepted → completed →
rated` in practice; `in_progress` is a seam for a future "scratcher is en
route, tracked live" feature, not a gap in what was asked for).
