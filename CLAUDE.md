# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm**.

- `pnpm dev` — start Next.js dev server on http://localhost:3000
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run `next lint`

There is no test suite configured.

## Environment

`NEXT_PUBLIC_API_KEY` (in `.env.local`) holds the Golemio API token used client-side to query Prague public transport departures. Because it is `NEXT_PUBLIC_*`, it ships to the browser — any rotation must treat it as public.

## Architecture

This is a single-page Next.js 14 App Router app that shows real-time Prague metro departure boards for the user's nearest stops. Everything runs client-side; there is no backend.

Data flow on each render:

1. `useGeolocation` (`src/hooks/use-geolocation.ts`) requests browser geolocation. In `NODE_ENV=development` it falls back to a hardcoded Myslbach location if permission is denied — production has no fallback.
2. `src/app/page.tsx` and `Departures.tsx` compute the 5 nearest stops from the static `allStops` list in `src/data/stops.ts` using `calcDistance` (haversine, returns meters despite the misleading comment in `utils.ts`).
3. The selected stops are written into `AppContext` (`src/components/AppContext.tsx`).
4. `Departures.tsx` builds a React Query `queryKey` from the flattened platform IDs (`stop.stops`) and calls `fetchStops` (`src/api/fetchStops.ts`), which hits `https://api.golemio.cz/v2/public/departureboards` directly from the browser with the `X-Access-Token` header. `refetchInterval: 2000` polls every 2s.
5. `StopDepartureGroup` filters the single combined response by `stop.id` per stop and de-dupes by `trip.headsign` (one row per destination). Time-to-departure is computed against `useCurrentTime` (a 1s ticking clock) so the countdown re-renders independently of the 2s polling.

Key conventions:

- `@/*` path alias maps to `src/*` (see `tsconfig.json`).
- shadcn/ui is configured (`components.json`) with components living in `src/components/ui/`. Use the shadcn generator rather than hand-rolling primitives.
- SVGs are imported as React components via `@svgr/webpack` (see `next.config.mjs`) — e.g. `import MetroIcon from "../../public/icons/metro.svg"`.
- `cn()` from `@/lib/utils` wraps `clsx` + `tailwind-merge` for conditional Tailwind classes.
- Metro line colors live in `typeToColor` in `src/components/Tag.tsx` (A=green, B=yellow, C=red) — reuse this map rather than redefining hex values.
- `src/data/stops.ts` is the source of truth for stop metadata; each entry has both directional platform IDs (`stops: [...]`) so the API query covers both directions at one station.
