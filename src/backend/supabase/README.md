# Supabase backend (future)

This directory will hold a `SupabaseBackend` class that implements the same
`BackendAdapter` interface defined in `../adapter.ts`, backed by Supabase
(Postgres + Auth + Realtime) instead of in-memory state. Because the app only
ever talks to the `BackendAdapter` seam, swapping the mock for Supabase should
require no changes outside this folder and the place that constructs the
singleton. It is intentionally not built tonight — the `MockBackend` in
`../mock/` is the working implementation for now.
