# גַרְדָן (Gardan)

An Uber-style marketplace app: order someone to come scratch your back.
Every user is both a customer and a scratcher — a single "available now"
toggle, no separate account types. The product is played completely
straight; see [`DESIGN.md`](./DESIGN.md) for the visual language and the
reasoning behind it.

Built with Expo (SDK 57), React Native, TypeScript (strict), and
`expo-router`. There is no backend yet — the entire app runs against
`MockBackend`, an in-memory implementation (persisted to `AsyncStorage`)
that includes a bot engine simulating ~25 other users so the marketplace
feels alive without a server. See
[`src/backend/supabase/README.md`](./src/backend/supabase/README.md) for the
plan to replace it with a real backend later.

## Running it

```bash
npm install
npm start        # then press w for web, or scan the QR code with Expo Go
# or directly:
npm run web
npm run ios       # requires macOS
npm run android
```

No environment variables or API keys are required — everything is local
mock data. No real SMS is ever sent; the phone-verification demo code is
always `000000`.

## Testing

```bash
npm test          # jest-expo — MockBackend contract + bot-engine tests
npm run lint       # expo lint
npx tsc --noEmit   # type-check
```

## Project structure

```
app/                  expo-router routes (file-based)
  onboarding/          welcome → signup (+ demo-code verify) → avatar → terms
  order/                create → waiting → active → rate
  incoming-request.tsx  modal: scratcher-side incoming order (30s timeout)
  home.tsx, profile.tsx

src/
  backend/
    types.ts            shared domain types
    adapter.ts           the BackendAdapter interface — the only seam the
                         app talks to
    mock/                 the current implementation
      index.ts             MockBackend: in-memory state + AsyncStorage +
                           simulated realtime + bot wiring
      bots.ts               pure bot decision/content logic (accept/decline
                           curve, scripted chat, availability rotation)
      seed.ts               ~25 static persona records
    supabase/            not built yet — see its README for the plan
  store/useAppStore.ts   thin Zustand store wrapping the adapter
  i18n/                  i18next, he (default) + en, fully bundled locale
                         JSON, RTL/LTR handling
  theme/                 design tokens (color/type/spacing/radius) + fonts
  components/            shared UI primitives
  utils/                  small pure helpers (geo, avatar presets, labels)
```

## Design system

[`DESIGN.md`](./DESIGN.md) — palette, typography, the signature "Contour
Back Map" element, and the self-critique pass that shaped them.

## Build log

[`PROGRESS.md`](./PROGRESS.md) — a phase-by-phase log of what was built, how
each phase was verified (including real end-to-end browser testing, not
just type-checks), and every out-of-plan decision made along the way.
