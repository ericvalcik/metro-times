# Metro Times — Next.js → Expo Rewrite Plan

## Goal

Port the existing Next.js web app to a native iOS app using Expo + React Native, **with the visual output identical to the current web version**. The screen on the iPhone should be indistinguishable from the web app rendered at iPhone width — same colors, same spacing, same typography, same card shapes, same icon, same departure layout.

## Visual contract (the source of truth for "looks the same")

Every phase's verification compares against the current web app running at `pnpm dev` (open in Safari on iPhone or Chrome devtools at iPhone 14 width — 390px). The non-negotiables:

- **Background**: pure black page background; departure cards are `#131313`.
- **Card shape**: `rounded-3xl` (24px radius), `p-[22px]` interior padding, `gap-2` between rows, `gap-4` between cards.
- **Card width**: content column is `max-w-[338px]`, centered, with `px-4` page padding and `pt-12` top padding.
- **Typography**: IBM Plex Mono, weights 400/500/600/700. Stop name uses `text-base font-semibold`. Departure rows and countdown use the default body size in IBM Plex Mono. Text color white on cards.
- **Metro icon**: the SVG from `public/icons/metro.svg` rendered at `width=21 height=22`, color driven by the line type (`metroA` = `#50AF32`, `metroB` = `#FFD500`, `metroC` = `#E63024`). Icon sits left of the stop name with `gap-4` and `pb-[19px]` below.
- **Departure row**: direction (headsign) left, countdown right (`mm:ss` format from `parseMiliseconds`); when `secondsLeft < 0` the right side reads `Departing`.
- **Polling cadence**: visually, the countdown ticks every second (driven by `useCurrentTime`), and the data refreshes every 2s — the user sees a smooth count-down between refetches.

Take a reference screenshot of the current web app at the start of Phase 1 and save it at `mobile/reference-web.png`. Every phase that touches UI ends by comparing the simulator screen to that screenshot side-by-side.

---

## Phase 1 — Scaffold

**What:** Stand up a fresh Expo app inside this repo at `mobile/`, with Tailwind v4 + NativeWind v5 wired up. Keep the Next.js app untouched at the repo root so we can run both side-by-side.

**Steps:**
1. Take and save the reference screenshot: open the running web app on iPhone-width (390px), screenshot the departures screen with at least one card visible, save as `mobile/reference-web.png`.
2. From repo root: `pnpm create expo-app@latest mobile -t default` (TypeScript + Expo Router).
3. `cd mobile` and install: NativeWind v5, Tailwind v4, react-native-css, TanStack Query, expo-location, expo-font, react-native-svg, react-native-svg-transformer, lucide-react-native.
4. Wire Tailwind v4 per the `expo:expo-tailwind-setup` skill: `tailwind.config.js`, `global.css`, `metro.config.js` (SVG transformer + NativeWind), `babel.config.js`.
5. Configure `metro.config.js` so `*.svg` files import as React components via `react-native-svg-transformer`.
6. Copy the relevant color extensions from the current `tailwind.config.ts` into the new Expo Tailwind config (we won't need the shadcn HSL variables — those are only used by removed components).
7. Set the root background to black in `app/_layout.tsx` so there's no white flash.

**Verification (must all pass before moving to Phase 2):**
- `pnpm expo start` boots without errors; pressing `i` opens the iOS simulator and renders a blank black screen with no white flash on launch.
- A throwaway `<Text className="text-white text-base">hello</Text>` placed in `app/index.tsx` renders white-on-black at the expected size (proves NativeWind is wired).
- An import of `metro.svg` (copied to `mobile/assets/icons/metro.svg`) renders as a component via `<MetroIcon width={21} height={22} fill="#50AF32" />` — green metro icon visible.
- `mobile/reference-web.png` exists and shows at least one departure card from the current web app.

---

## Phase 2 — Port shared logic (pure TypeScript, no UI)

**What:** Move all non-DOM logic over. These files have zero React Native dependencies and should compile unchanged or near-unchanged.

**Steps:**
1. Copy `src/types.ts` → `mobile/types.ts` (unchanged).
2. Copy `src/data/stops.ts` → `mobile/data/stops.ts` (unchanged).
3. Copy `src/hooks/use-current-time.tsx` → `mobile/hooks/use-current-time.ts` (unchanged; uses only `setInterval`).
4. Copy `src/lib/utils.ts` → `mobile/lib/utils.ts`. **Drop** the `cn`/`twMerge`/`clsx` export — NativeWind handles class merging via its own runtime. **Keep** `calcDistance`, `parseDeparture`, `parseMiliseconds`, `parseDistance`.
5. Copy `src/api/fetchStops.ts` → `mobile/api/fetchStops.ts`. Replace `process.env.NEXT_PUBLIC_API_KEY` with `Constants.expoConfig?.extra?.apiKey` and wire `app.config.ts` to read from `.env` so the key is injected at build time. Add `mobile/.env` with `EXPO_PUBLIC_API_KEY=...` (or use the `extra` field — pick one and stick with it).
6. Copy `src/components/AppContext.tsx` → `mobile/components/AppContext.tsx` (unchanged; pure React).

**Verification:**
- `pnpm tsc --noEmit` from `mobile/` succeeds with no errors.
- In a temporary debug screen, call `fetchStops` with a known stopId (e.g. `U321Z101P` for Dejvická) and `console.log` the response — the log shows a JSON object with a non-empty array of departures. Confirms the API key wiring works on the device.
- `calcDistance([50.07777, 14.41741], [50.098341, 14.362833])` returns roughly `4000` (meters) — sanity check that the math ported correctly.
- `parseMiliseconds(125000)` returns `"2:05"`.

---

## Phase 3 — Native replacements

**What:** Swap the two browser-only pieces (geolocation and the SVG import path) for their Expo equivalents.

**Steps:**
1. Rewrite `useGeolocation` in `mobile/hooks/use-geolocation.ts` using `expo-location`:
   - Call `Location.requestForegroundPermissionsAsync()` once on mount.
   - If granted, call `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })` and set `[latitude, longitude]`.
   - Keep the **dev-mode Myslbach fallback** (`[50.07777384729586, 14.417414782736316]`) so the simulator works without permission grants — gate it on `__DEV__`.
   - Return type stays `Coords | null` so callers don't change.
2. Add the location permission strings to `app.config.ts` under `ios.infoPlist.NSLocationWhenInUseUsageDescription` with a short user-facing reason.
3. Verify `mobile/assets/icons/metro.svg` imports as a component (already validated in Phase 1) and accepts a `fill` prop. Note: SVG `currentColor` does not propagate in `react-native-svg` the way it does in the browser — we pass the line color via the `fill` prop on `<MetroIcon fill={typeToColor[stop.type]} />` instead of wrapping in a colored `<View>`.

**Verification:**
- On a real iPhone (via Expo Go or dev client), the app prompts for location permission on first launch with the string from `app.config.ts`.
- After granting, a debug `console.log(coords)` prints a `[lat, lon]` array roughly matching the device's actual location.
- In the simulator without granting, the Myslbach fallback kicks in and `coords` is non-null within a second.
- `<MetroIcon fill="#FFD500" />` renders yellow; `fill="#E63024"` renders red. Confirms color propagation works for B and C lines, not just A.

---

## Phase 4 — Build the UI (this is the look-the-same phase)

**What:** Port `Departures.tsx` and `Tag.tsx` to React Native, achieving pixel-level parity with the reference screenshot.

**DOM → RN element mapping (apply consistently):**
- `<div>` (layout) → `<View>`
- `<div>` (text container with text directly inside) → `<View>` wrapping `<Text>` for the text
- `<p>`, `<h1>`, `<h3>`, raw text → `<Text>` (text **must** be inside `<Text>` in RN, not bare in a `<View>`)
- `flex flex-row` → already the RN default (View defaults to `flex-direction: column` though, opposite of web — be explicit with `flex-row` on rows)
- `gap-*`, `padding`, `rounded-*`, color classes → carry over via NativeWind

**Steps:**
1. `app/_layout.tsx`:
   - Load IBM Plex Mono (all four weights, normal + italic) via `expo-font` and gate render on `useFonts` ready.
   - Wrap children in `QueryClientProvider` (single client instance) and `AppContextProvider`.
   - Apply IBM Plex Mono globally — easiest path is a custom `<Text>` wrapper or `Text.defaultProps.style = { fontFamily: 'IBMPlexMono_400Regular' }` at app startup. Confirm fallback fonts never render.
   - Root view: `flex-1 bg-black` with `SafeAreaView` for top inset.
2. `app/index.tsx`:
   - Mirror `src/app/page.tsx`: a `<ScrollView>` (or `<View>` if it fits) with `className="px-4 pb-6"`, inner container `className="max-w-[338px] mx-auto w-full pt-12"`. Render `<Departures />`.
   - Use `useGeolocation` here only if you need to compute distances at the page level — otherwise leave it inside `<Departures />` as today.
3. `components/Tag.tsx` (port):
   - Replace `<div>` wrapper with `<View>` and the inner text with `<Text>`.
   - Same `typeToColor` / `typeToName` maps — unchanged.
   - Inline `style={{ color, borderColor: color }}` works identically in RN.
   - Note: `Tag.tsx` is imported but not visibly used in the current `Departures.tsx`; port it for completeness but don't render it unless the web app does.
4. `components/Departures.tsx` (port — the critical one for visual parity):
   - Outer wrapper: `<View className="w-full">` with `<View className="flex-col gap-4">` for the list.
   - `StopDepartureGroup`: `<View className="rounded-3xl p-[22px] flex-col gap-2 bg-[#131313]">`. Header row: `<View className="flex-row gap-4 items-center pb-[19px]">` containing `<MetroIcon width={21} height={22} fill={typeToColor[stop.type]} />` and `<Text className="text-base font-semibold text-white">{stop.name}</Text>`.
   - `Departure` row: `<View className="flex-row justify-between gap-2">` with direction `<Text>` left and countdown `<Text>` right, both white.
   - Loading / error / "Getting location..." states render as a single centered `<Text className="text-white">` — same copy as the web version.
5. Performance tweak (does **not** change visuals): set TanStack Query `refetchInterval: 2000` as today, but also pause on background via `focusManager` + `AppState` listener so we don't burn battery when the screen isn't visible.

**Verification — visual parity (this is the gate; all must pass):**
- Side-by-side: simulator iPhone 14 (390pt) next to Safari at 390px width on the same departure stops. The two screenshots overlay with **no card-shape, padding, color, or font-weight differences**.
- Card background color sampled with a color picker reads `#131313` on both.
- Card corner radius measures the same (24px / `rounded-3xl`).
- Content column is centered with the same left/right gutter; max card width is 338px on both.
- Top padding from the safe-area inset down to the first card matches the web's `pt-12` (48px) — adjust by adding `pt-12` *below* the safe-area inset, not on top of it.
- Metro icon: A=green, B=yellow, C=red, sized 21×22, positioned left of the stop name with the same gap.
- Countdown text and direction text use IBM Plex Mono — confirm by inspecting a screenshot character shape (the Plex Mono lowercase `a` has a distinctive double-storey form; if you see a single-storey `a` the font isn't loading).
- Countdown ticks down by 1 each second smoothly; switches to `Departing` at `<0` seconds.
- A full data refetch every 2 seconds doesn't cause flicker or remount (the countdown keeps ticking through the refetch).

**Verification — behavior:**
- App boots → location permission prompt → cards appear within ~2s on a real device.
- All 5 nearest stops render as separate cards, ordered nearest-first (same order as the web app for the same coordinates).
- Stops with no current departures collapse out (same as web — `if (stopDepartures.length === 0) return null`).
- Killing the app and reopening restores the same view without a white flash.

---

## Phase 5 — Run on your iPhone

**What:** Get the app onto your physical phone in the simplest way that works, before committing to a full TestFlight pipeline.

**Pick one path:**

**Path A — Expo Go (fastest, recommended first):**
1. `pnpm expo start` in `mobile/`.
2. Open the Camera app on the iPhone, scan the QR code from the terminal.
3. App loads inside Expo Go.

This works because we use only modules supported by Expo Go (expo-location, expo-font, react-native-svg, expo-router, NativeWind).

**Path B — Dev Client (when Expo Go isn't enough):**
1. Set up EAS: `pnpm dlx eas-cli login` then `eas build:configure`.
2. `eas build --profile development --platform ios` — choose "ad-hoc" provisioning and register your iPhone's UDID when prompted.
3. Install the resulting `.ipa` via the link EAS gives you, or via TestFlight.
4. Run `pnpm expo start --dev-client` and open the installed app to connect.

Use Path B once you want a custom app icon/name or add a native module Expo Go doesn't bundle.

**Verification:**
- Phone shows the app icon (default Expo icon on Path A; your custom icon on Path B).
- Tapping the icon (or opening Expo Go and selecting the project) loads the same screen you saw in the simulator, with the same departures for your real location.
- Location permission prompt appears exactly once on first launch; subsequent launches skip it.
- Visually compare on the actual phone screen to `mobile/reference-web.png` — same parity checklist as Phase 4.

---

## Phase 6 — Polish (optional, post-MVP)

Only after Phases 1–5 pass:

1. App icon + splash screen via `expo-splash-screen` and an icon set generated from a source PNG.
2. Pull-to-refresh on the departures list (`RefetchControl` on the `ScrollView`).
3. Pause polling when the app is backgrounded (`AppState` → `focusManager.setFocused(false)`); resume on foreground.
4. Consider bumping `refetchInterval` from 2000 → 5000 on cellular to save battery; keep the per-second visual countdown.
5. TestFlight distribution via `eas submit` once you want it on your phone permanently without re-running `expo start`.

**Verification:**
- App icon visible on the home screen and in the app switcher.
- Splash screen shows briefly on cold launch with no white flash before or after.
- Pull-down on the list triggers an immediate refetch and the spinner disappears within ~1s.
- Locking the phone for 30s and reopening: countdown picks up correctly (not frozen at the lock-time value).

---

## Cleanup (after Phase 5 verification passes)

Once the Expo app is verifiably at parity:
- Move the Next.js code into a `web/` subfolder (or delete it) so the repo root is no longer a confusing mix.
- Update `README.md` with `mobile/` setup instructions.
- Decide whether to keep `web/` as a fallback or remove it entirely.
