# Supabase backend (future)

This directory will hold a `SupabaseBackend` class implementing the exact
same `BackendAdapter` interface defined in `../adapter.ts`, backed by
Supabase (Postgres + Auth + Realtime) instead of `MockBackend`'s in-memory
state. Because the rest of the app only ever talks to the `BackendAdapter`
seam — never to `MockBackend` directly — swapping the implementation should
require changes only in this folder and the one line that constructs the
singleton (`src/backend/mock/index.ts`'s `export default mockBackend` becomes
`export default supabaseBackend` from here, or a small runtime switch keyed
off an env var). Not built yet; this is the plan for when it is.

## Proposed schema

Maps directly from `../types.ts`. Sketch, not final DDL — exact
constraints/indexes to be worked out when this is actually built.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  avatar_id text not null,
  is_available boolean not null default false,
  location geography(point),
  rating_customer_avg numeric,
  rating_customer_count integer not null default 0,
  rating_scratcher_avg numeric,
  rating_scratcher_count integer not null default 0,
  onboarding_completed boolean not null default false,
  terms_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id),
  scratcher_id uuid not null references users(id),
  zone text not null,
  intensity text not null,
  duration_minutes smallint not null,
  price numeric not null,
  status text not null default 'pending',
  eta_minutes smallint,
  decline_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  sender_id uuid not null references users(id),
  text text not null,
  created_at timestamptz not null default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  rater_id uuid not null references users(id),
  ratee_id uuid not null references users(id),
  rater_role text not null,
  stars smallint not null check (stars between 1 and 5),
  tag text,
  created_at timestamptz not null default now()
);
```

## Mapping the adapter's five domains

- **auth** — Supabase Auth with phone OTP replaces the mock's fixed `000000`
  demo code. `onboarding_completed`/`terms_accepted` move from the mock's
  local `PersistedState` onto the `users` row.
- **presence** — `is_available` + `location` columns; `listNearby` becomes a
  PostGIS distance query; `subscribeNearby` becomes a Supabase Realtime
  channel filtered by a bounding box, replacing the mock's in-memory
  emitter + random delay.
- **orders** — the `orders` table directly; `subscribeOrder`/`listIncoming`
  become Realtime subscriptions filtered by `scratcher_id = auth.uid()` with
  row-level security enforcing that a user only ever sees orders where
  they're the customer or the scratcher.
- **chat** — `chat_messages`, RLS restricted to the order's two participants,
  and only once the order's `status` has left `pending`.
- **ratings** — `ratings` table; the running `rating_*_avg`/`rating_*_count`
  columns on `users` would be maintained via a Postgres trigger instead of
  the mock's manual running-average update in `submit()`.

## What goes away entirely

The bot engine (`../mock/bots.ts` and the bot-timer wiring in
`../mock/index.ts`) has no equivalent here — bots are a mock-only concept for
demoing a marketplace before it has real supply. A real backend has real
users on both sides; there's nothing to simulate.
