# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

- **`mobile/`** — Expo / React Native app. **This is the active app.** Default any new feature work here.
- **`web/`** — Original Next.js 14 App Router implementation, kept as a fallback / reference. Don't add features here unless the user explicitly asks.
- `PLAN.md` — current standalone-iOS-install flow (free Apple ID signing path).

Each subproject has its own `package.json`, `pnpm-lock.yaml`, and `.env.local`. Always `cd` into the right one before running commands; there is no root workspace.

## Mobile app

Package manager: **pnpm**.

```bash
cd mobile
pnpm install
pnpm exec expo start    # Metro dev server (Expo Go or dev client)
pnpm exec expo prebuild --platform ios   # regenerate native iOS project
pnpm lint                # expo lint
```

For a standalone iPhone install (no dev server), follow `PLAN.md` — the gist is `expo prebuild` → open `mobile/ios/MetroTimes.xcworkspace` in Xcode → sign with a free Apple ID → switch the Run scheme to Release → ⌘R. Sideloaded builds expire after 7 days and must be re-signed.

There is no test suite.

### Environment

`EXPO_PUBLIC_API_KEY` in `mobile/.env.local` holds the Golemio API token used client-side to query Prague public transport departures. Because it's `EXPO_PUBLIC_*` it's bundled into the JS and shipped to the device — any rotation must treat it as public.

### Architecture

Single-screen Expo Router app showing real-time Prague metro departure boards for the user's nearest stops. Everything runs on-device; there is no backend of our own — we call Golemio directly.

Data flow on each render:

1. `useGeolocation` (`mobile/src/hooks/use-geolocation.ts`) requests `expo-location` foreground permission and returns `[lat, lon]`. In `__DEV__` it falls back to a hardcoded Myslbach location if permission is denied; production has no fallback.
2. `Departures.tsx` computes the 5 nearest stops from the static `allStops` list in `mobile/src/data/stops.ts` using `calcDistance` from `mobile/src/lib/utils.ts` (haversine, returns meters), sorts ascending, and writes the result into `AppContext` (`mobile/src/components/AppContext.tsx`).
3. The query key is the flattened list of platform IDs (`stop.stops`) across the 5 selected stops. `fetchStops` (`mobile/src/api/fetchStops.ts`) hits `https://api.golemio.cz/v2/public/departureboards` with the `X-Access-Token` header from `EXPO_PUBLIC_API_KEY`. React Query polls every 2s (`refetchInterval: 2000`).
4. `StopDepartureGroup` filters the combined response by `stop.id` per stop and de-dupes by `trip.headsign` (one row per destination). Time-to-departure is computed against `useCurrentTime` (a 1s ticking clock) so the countdown re-renders independently of the 2s polling.
5. The root layout (`mobile/src/app/_layout.tsx`) wires `AppState` → `focusManager.setFocused(...)` so React Query pauses polling when the app is backgrounded.

### Navigation & UI

- Routing is **expo-router** (file-based). Routes live in `mobile/src/app/`; the root layout is `_layout.tsx`.
- Tabs use **`expo-router/unstable-native-tabs`** (`NativeTabs`) in `mobile/src/components/app-tabs.tsx` — these are real platform tabs, not a JS component. Don't replace with `react-navigation` bottom tabs without a reason.
- Theme is forced dark (`#000000` background) via a tweaked `DarkTheme` in `_layout.tsx`. Don't introduce a light-mode branch unless the user asks.
- Fonts: **IBM Plex Mono** (Regular / Medium / SemiBold / Bold + italics) loaded via `@expo-google-fonts/ibm-plex-mono`. The default `Text` component is monkey-patched in `_layout.tsx` to use `IBMPlexMono_400Regular` as its default style — explicit `fontFamily` overrides still win.

### Key conventions

- Path aliases (`mobile/tsconfig.json`): `@/*` → `mobile/src/*`, `@/assets/*` → `mobile/assets/*`. Use these instead of relative paths.
- SVGs render as React components via **`react-native-svg-transformer`** (configured in `mobile/metro.config.js`) — `import MetroIcon from '@/assets/icons/metro.svg'` and use it as a JSX element with `width` / `height` / `fill`.
- Styling is **React Native `StyleSheet.create`**, not Tailwind / NativeWind. Colors are inline hex (`#FFFFFF`, `#131313`, etc.); the codebase doesn't have a design-tokens layer yet.
- Metro line colors live in `typeToColor` in `mobile/src/components/Tag.tsx` (A=green `#50AF32`, B=yellow `#FFD500`, C=red `#E63024`). Reuse this map rather than redefining hex values.
- `mobile/src/data/stops.ts` is the source of truth for stop metadata; each entry has both directional platform IDs (`stops: [...]`) so a single API query covers both directions at one station.
- Files with a `.web.tsx` / `.web.ts` sibling (`app-tabs.web.tsx`, `animated-icon.web.tsx`, `use-color-scheme.web.ts`) are picked up by Metro's web target. Keep native and web variants in sync when changing the shared file.

## Web app (`web/`)

Kept for reference / fallback only. Commands run from `web/`:

```bash
cd web
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
```

The web app uses `NEXT_PUBLIC_API_KEY` (in `web/.env.local`), Tailwind, shadcn/ui, and the App Router. Same Golemio API, same `allStops` data, same 2s polling — just rendered with HTML / Tailwind instead of React Native primitives. Path alias `@/*` maps to `web/src/*`.
