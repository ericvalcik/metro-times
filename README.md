# Metro Times

Real-time Prague metro departure boards for your nearest stops. Two apps share the same Golemio API integration:

- **`mobile/`** — Expo / React Native app (primary, targets iOS home-screen install).
- **`web/`** — Next.js 14 App Router app (original implementation, kept as a fallback / reference).

Both apply the same data flow: browser geolocation → 5 nearest stops from a static list → Golemio `departureboards` API polled every 2s via React Query.

## Mobile (`mobile/`)

```bash
cd mobile
pnpm install
pnpm exec expo start
```

See `mobile/README.md` for the Expo-generated notes, and `PLAN.md` for the standalone-iOS-install flow (free Apple ID signing path).

## Web (`web/`)

```bash
cd web
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build
pnpm lint     # next lint
```

## Environment

Both apps need a Golemio API token in their own `.env.local`:

- `web/.env.local` — `NEXT_PUBLIC_API_KEY=...`
- `mobile/.env.local` — `EXPO_PUBLIC_API_KEY=...`

Because these are `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`, the token ships to the client — treat any rotation as public.

## Playground

Playground in `./playground` is just for testing - no structure, nothing interesting.
