# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

- **`mobile/`** — Expo / React Native app. **This is the active app.** Default any new feature work here.
- **`web/`** — Original Next.js 14 App Router implementation, kept as a fallback / reference. Don't add features here unless the user explicitly asks.
- **`playground/`** — Python sandbox for testing APIs and ideas. Managed by `uv` (Python 3.13, `pyproject.toml` + `uv.lock`). Don't touch unless the user asks. See `playground/README.md`.
- `PLAN.md` — engineering record of the Stations stop-selection feature (what was built, decisions, gotchas). `IDEAS.md` — backlog.
- Standalone iPhone install (free Apple ID signing) is driven by the **`reinstall-on-iphone` skill** + `mobile/reinstall-iphone.sh` — run the skill to rebuild/re-sign/reinstall.

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

For a standalone iPhone install (no dev server), use the **`reinstall-on-iphone` skill**, which runs `mobile/reinstall-iphone.sh` (auto-detects the device UDID, builds Release with `-allowProvisioningUpdates`, installs via `devicectl`, verifies launch). The manual path is `expo prebuild` → open `mobile/ios/MetroTimes.xcworkspace` in Xcode → sign with a free Apple ID → Release scheme → ⌘R. Sideloaded builds expire after 7 days and must be re-signed.

The script's "VERIFIED launch" only confirms the process *spawned*, not that it stayed up. To debug a device crash, relaunch with the console attached and reproduce — it streams stdout/stderr so a fatal JS exception (`RCTFatalException: …`) and `signal 6` appear directly:

```bash
xcrun devicectl device process launch --console --terminate-existing \
  --device <UDID> com.valcik.metrotimes   # UDID from `xcrun devicectl list devices`
```

There is no test suite. `pnpm exec tsc --noEmit` (from `mobile/`) is the working verification gate; `pnpm lint` (`expo lint`) needs eslint, which it installs interactively on first run.

### Environment

`EXPO_PUBLIC_API_KEY` in `mobile/.env.local` holds the Golemio API token used client-side to query Prague public transport departures. Because it's `EXPO_PUBLIC_*` it's bundled into the JS and shipped to the device — any rotation must treat it as public.

### Architecture

Expo Router app with two native tabs — **Times** (real-time Prague departure boards for the nearest stops) and **Stations** (pick which stops to consider). Everything runs on-device; there is no backend of our own — we call Golemio directly.

**Stop-selection pool.** The Stations tab (`mobile/src/app/(tabs)/stations.tsx`) toggles stops/platforms on or off. The selection is a *candidate pool* persisted to AsyncStorage (key `"selectedStops"`) and owned by `SelectedStopsProvider` / `useSelectedStops()` (`mobile/src/hooks/use-selected-stops.ts`, mounted in `_layout.tsx`). The searchable master list is the generated `allStops` asset (`mobile/src/data/stops.ts`, built by `scripts/process-stops.ts`). First-launch default selects only the metro platforms of metro stations. See `PLAN.md` for the full feature record.

Times-tab data flow on each render:

1. `useGeolocation` (`mobile/src/hooks/use-geolocation.ts`) requests `expo-location` foreground permission and returns `[lat, lon]`. In `__DEV__` it falls back to a hardcoded Myslbach location if permission is denied; production has no fallback.
2. `Departures.tsx` takes the **selected pool** (`useSelectedStops`) and computes the **5 nearest** groups by `calcDistance` (`mobile/src/lib/utils.ts`, haversine in meters) to each group's `avgLat/avgLon`. The pool — not the full `allStops` list — is the candidate set; Times always shows only the 5 closest. (There is no `AppContext` anymore; it was removed.)
3. The query key is the flattened list of platform IDs across those 5 stops (~10–20 ids, under the API cap). `fetchStops` (`mobile/src/api/fetchStops.ts`) hits `https://api.golemio.cz/v2/public/departureboards` with the `X-Access-Token` header from `EXPO_PUBLIC_API_KEY`; React Query polls every 2s (`refetchInterval: 2000`). `data?.[0]` is an array on success but an error *object* on a bad request, so `Departures.tsx` guards with `Array.isArray` before reading it.
4. `StopDepartureGroup` filters the response by platform `id`, then `groupByHeadsign` keeps the **next two** departures per destination. Each row is two lines: route `short_name` (colored via `lineColor`) + headsign on top; the closest countdown (white) with the following one in gray brackets below. Countdowns tick against `useCurrentTime` (a 1s clock), independent of the 2s polling.
5. The root layout (`mobile/src/app/_layout.tsx`) wires `AppState` → `focusManager.setFocused(...)` so React Query pauses polling when the app is backgrounded.

### Navigation & UI

- Routing is **expo-router** (file-based). Routes live in `mobile/src/app/`; the root layout is `_layout.tsx`.
- Tabs use **`expo-router/unstable-native-tabs`** (`NativeTabs`) in `mobile/src/components/app-tabs.tsx` — these are real platform tabs, not a JS component. Don't replace with `react-navigation` bottom tabs without a reason.
- Theme is forced dark (`#000000` background) via a tweaked `DarkTheme` in `_layout.tsx`. Don't introduce a light-mode branch unless the user asks.
- Fonts: **IBM Plex Mono** (Regular / Medium / SemiBold / Bold + italics) loaded via `@expo-google-fonts/ibm-plex-mono`. The default `Text` component is monkey-patched in `_layout.tsx` to use `IBMPlexMono_400Regular` as its default style — explicit `fontFamily` overrides still win.

### iOS native config plugins (`mobile/plugins/`)

`ios/` is gitignored and regenerated, so everything the native build needs is an Expo
config plugin registered in `app.json`. Order matters: all of these run **after**
`@bacons/apple-targets`, and `with-disable-script-sandboxing` stays last.

- `with-ios-scene-lifecycle` — iOS 26+ terminates apps that haven't adopted the UIScene
  lifecycle (`EXC_BREAKPOINT` in `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
  Expo SDK 55 / RN 0.83 ship neither piece. The `UIApplicationSceneManifest` Info.plist
  key alone is **not** enough — this also injects a `SceneDelegate` and
  `configurationForConnecting` into `AppDelegate.swift`.
- `with-ios-deployment-target` — pins iOS **16.0**. Needed because `expo-router@55` calls
  `UIAction.subtitle` (iOS 16+) unguarded despite a 15.1 podspec, and because some pods'
  resource-bundle targets keep pre-15.0 targets that current Xcode rejects.
- `with-free-signing` — `CODE_SIGN_STYLE = Automatic` so `-allowProvisioningUpdates` can
  sign on the free personal team.
- `with-disable-script-sandboxing` — see the `reinstall-on-iphone` skill.

Each fails loudly if its anchor in the generated file moves, rather than silently
emitting an app that crashes at launch.

### Key conventions

- Path aliases (`mobile/tsconfig.json`): `@/*` → `mobile/src/*`, `@/assets/*` → `mobile/assets/*`. Use these instead of relative paths.
- SVGs render as React components via **`react-native-svg-transformer`** (configured in `mobile/metro.config.js`) — `import MetroIcon from '@/assets/icons/metro.svg'` and use it as a JSX element with `width` / `height` / `fill`.
- Styling is **React Native `StyleSheet.create`**, not Tailwind / NativeWind. Colors are inline hex (`#FFFFFF`, `#131313`, etc.); the codebase doesn't have a design-tokens layer yet.
- Metro line colors live in `typeToColor` in `mobile/src/components/Tag.tsx` (A=green `#50AF32`, B=yellow `#FFD500`, C=red `#E63024`). Reuse this map rather than redefining hex values.
- `mobile/src/data/stops.ts` is the source of truth for stop metadata; each entry has both directional platform IDs (`stops: [...]`) so a single API query covers both directions at one station.
- Files with a `.web.tsx` / `.web.ts` sibling (`app-tabs.web.tsx`, `animated-icon.web.tsx`, `use-color-scheme.web.ts`) are picked up by Metro's web target. Keep native and web variants in sync when changing the shared file.
- **Adding a native dependency requires a `pod install` before the next device build.** After installing a package that ships a native module (e.g. `@react-native-async-storage/async-storage`), run `pod install --project-directory=ios` from `mobile/` — otherwise the standalone build links no native side and crashes on launch with `RCTFatalException: NativeModule: <X> is null`. `pod install` is sufficient and is quicker than `expo prebuild`, which regenerates the whole gitignored `ios/` project (safe to run now — the free-signing, UIScene and deployment-target tweaks are config plugins in `mobile/plugins/`, so prebuild reproduces them). JS-only deps (e.g. `@shopify/flash-list` v2 — no podspec) need nothing; Expo Go / simulator reloads never need a rebuild. Confirm linkage with `grep RNCAsyncStorage ios/Podfile.lock`.

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

## Playground (`playground/`)

Don't touch unless the user explicitly asks. Throw-away Python scripts for poking at APIs.

Package manager: **`uv`** (not pip / poetry / pipenv). Python pinned to 3.13 via `.python-version`. Commands run from `playground/`:

```bash
cd playground
uv sync                # install deps from uv.lock into .venv/
uv run main.py         # run a script
uv add <pkg>           # add a dependency
```

Env var is `GOLEMIO_API_KEY` in `playground/.env.local` — same token as mobile's `EXPO_PUBLIC_API_KEY`, loaded via `python-dotenv`. Current deps: `httpx`, `python-dotenv`, `rich`. See `playground/README.md` for details.
