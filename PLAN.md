# Metro Times — Next.js → Expo Rewrite Plan

## Goal

Port the existing Next.js web app to a native iOS app using Expo + React Native, **with the visual output identical to the current web version**. The screen on the iPhone should be indistinguishable from the web app rendered at iPhone width — same colors, same spacing, same typography, same card shapes, same icon, same departure layout.

## Visual contract (the source of truth for "looks the same")

Every phase's verification compares against the current web app running at `pnpm dev` (open in Safari on iPhone or Chrome devtools at iPhone 14 width — 390px). The non-negotiables (expressed as React Native style values):

- **Background**: pure black page background (`#000000`); departure cards are `#131313`.
- **Card shape**: `borderRadius: 24`, `padding: 22`, `gap: 8` between rows, `gap: 16` between cards.
- **Card width**: content column is `maxWidth: 338`, centered, with `paddingHorizontal: 16` page padding and `paddingTop: 48` top padding (below the safe-area inset).
- **Typography**: IBM Plex Mono, weights 400/500/600/700. Stop name is `fontSize: 16, fontWeight: '600'`. Departure rows and countdown use `fontSize: 16, fontWeight: '400'`. Text color `#FFFFFF` on cards.
- **Metro icon**: the SVG from `public/icons/metro.svg` rendered at `width={21} height={22}`, color driven by the line type (`metroA` = `#50AF32`, `metroB` = `#FFD500`, `metroC` = `#E63024`). Icon sits left of the stop name with `gap: 16` and `paddingBottom: 19` below the header row.
- **Departure row**: direction (headsign) left, countdown right (`mm:ss` format from `parseMiliseconds`); when `secondsLeft < 0` the right side reads `Departing`.
- **Polling cadence**: visually, the countdown ticks every second (driven by `useCurrentTime`), and the data refreshes every 2s — the user sees a smooth count-down between refetches.

Take a reference screenshot of the current web app at the start of Phase 1 and save it at `mobile/reference-web.png`. Every phase that touches UI ends by comparing the simulator screen to that screenshot side-by-side.

---

## Phase 1 — SVG support, black root, and tab rename

**What:** The Expo app is already bootstrapped at `mobile/` with an `expo-router` tabs scaffold. Wire SVG-as-component support, force a black background so there's no white flash, and rename the existing tabs to **Times** and **Stations**. No Tailwind, no NativeWind — we'll style everything with React Native's `style` prop (inline objects + `StyleSheet.create`) from here on.

**Steps:**
1. Take and save the reference screenshot: open the running web app on iPhone-width (390px), screenshot the departures screen with at least one card visible, save as `mobile/reference-web.png`.
2. In `mobile/`, install: `react-native-svg`, `react-native-svg-transformer`. Pin `react-native-svg` to the version Expo expects (`pnpm exec expo install --check` will surface the right pin).
3. Configure `metro.config.js` so `*.svg` files import as React components via `react-native-svg-transformer` (swap `svg` from `assetExts` to `sourceExts`, set `babelTransformerPath` to `react-native-svg-transformer/expo`).
4. Add a `*.svg` module declaration (`src/types/svg.d.ts`) so TypeScript treats imported SVGs as `React.FC<SvgProps>`. Include it in `tsconfig.json`.
5. Copy `public/icons/metro.svg` to `mobile/assets/icons/metro.svg`. Drop the `fill="currentColor"` attribute on the inner `<path>` so the imported component's `fill` prop propagates to the path (react-native-svg doesn't resolve `currentColor` like the browser).
6. Force a black background everywhere so there's no white flash:
   - Set the root view / safe-area background to `#000000`.
   - Set the navigator's `screenOptions.contentStyle.backgroundColor` (or equivalent for the existing tab layout) to `#000000`.
   - Set the tab bar background to `#000000` with white-ish active tint.
7. Rename the existing two tabs to **Times** and **Stations**:
   - `Times` is the current `index.tsx` (departures will live here in Phase 4).
   - `Stations` replaces the current `explore.tsx`. For now it can render a single centered `<Text style={{ color: '#FFFFFF' }}>Stations</Text>` placeholder — content lands later.
   - Update the tab labels, the route filenames if needed (`src/app/(tabs)/...` or wherever the scaffold puts them), and any references in `src/components/app-tabs.tsx`.

**Verification (must all pass before moving to Phase 2):**
- `pnpm expo start` boots without errors; pressing `i` opens the iOS simulator and lands on the **Times** tab with a pure-black background and no white flash on launch.
- The tab bar shows two tabs labeled **Times** and **Stations**; tapping **Stations** navigates to the placeholder screen, also black.
- An import of `metro.svg` rendered inline as `<MetroIcon width={21} height={22} fill="#50AF32" />` on the Times screen shows a green metro icon. Swapping `fill` to `"#FFD500"` and `"#E63024"` renders yellow and red respectively (sanity check that the line colors will work in Phase 4).
- `mobile/reference-web.png` exists and shows at least one departure card from the current web app.
- `pnpm tsc --noEmit` from `mobile/` is clean.

---

## Phase 2 — Port shared logic (pure TypeScript, no UI)

**What:** Move all non-DOM logic over. These files have zero React Native dependencies and should compile unchanged or near-unchanged.

**Steps:**
1. Copy `src/types.ts` → `mobile/types.ts` (unchanged).
2. Copy `src/data/stops.ts` → `mobile/data/stops.ts` (unchanged).
3. Copy `src/hooks/use-current-time.tsx` → `mobile/hooks/use-current-time.ts` (unchanged; uses only `setInterval`).
4. Copy `src/lib/utils.ts` → `mobile/lib/utils.ts`. **Drop** the `cn`/`twMerge`/`clsx` export — we're not using className anywhere. **Keep** `calcDistance`, `parseDeparture`, `parseMiliseconds`, `parseDistance`.
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
3. Verify `mobile/assets/icons/metro.svg` imports as a component (already validated in Phase 1) and accepts a `fill` prop. Note: SVG `currentColor` does not propagate in `react-native-svg` the way it does in the browser — we drop `fill="currentColor"` from the path in Phase 1 and pass the line color via the `fill` prop on `<MetroIcon fill={typeToColor[stop.type]} />`.

**Verification:**
- On a real iPhone (via Expo Go or dev client), the app prompts for location permission on first launch with the string from `app.config.ts`.
- After granting, a debug `console.log(coords)` prints a `[lat, lon]` array roughly matching the device's actual location.
- In the simulator without granting, the Myslbach fallback kicks in and `coords` is non-null within a second.
- `<MetroIcon fill="#FFD500" />` renders yellow; `fill="#E63024"` renders red. Confirms color propagation works for B and C lines, not just A.

---

## Phase 4 — Build the UI (this is the look-the-same phase)

**What:** Port `Departures.tsx` and `Tag.tsx` to React Native using only the `style` prop (inline objects and `StyleSheet.create`), achieving pixel-level parity with the reference screenshot.

**DOM → RN element mapping (apply consistently):**
- `<div>` (layout) → `<View>`
- `<div>` (text container with text directly inside) → `<View>` wrapping `<Text>` for the text
- `<p>`, `<h1>`, `<h3>`, raw text → `<Text>` (text **must** be inside `<Text>` in RN, not bare in a `<View>`)
- Tailwind classes from the web → equivalent `style` properties. View defaults to `flex-direction: 'column'` (opposite of web's `flex-direction: row` default), so be explicit with `flexDirection: 'row'` for horizontal rows.

**Style equivalents (use these consistently — define once in a `StyleSheet.create` block per component):**
- `rounded-3xl` → `borderRadius: 24`
- `p-[22px]` → `padding: 22`
- `gap-2` → `gap: 8`
- `gap-4` → `gap: 16`
- `pb-[19px]` → `paddingBottom: 19`
- `px-4` → `paddingHorizontal: 16`
- `pt-12` → `paddingTop: 48`
- `pb-6` → `paddingBottom: 24`
- `max-w-[338px]` → `maxWidth: 338`
- `mx-auto w-full` → `alignSelf: 'stretch', maxWidth: 338` on the inner container; the outer container handles centering with `alignItems: 'center'`
- `text-base font-semibold` → `fontSize: 16, fontWeight: '600'`
- `text-white` → `color: '#FFFFFF'`
- `bg-black` → `backgroundColor: '#000000'`
- `bg-[#131313]` → `backgroundColor: '#131313'`

**Steps:**
1. Root layout (the file driving the tabs from Phase 1):
   - Load IBM Plex Mono (all four weights, normal + italic) via `expo-font` and gate render on `useFonts` ready.
   - Wrap children in `QueryClientProvider` (single client instance) and `AppContextProvider`.
   - Apply IBM Plex Mono globally by setting `Text.defaultProps.style = { fontFamily: 'IBMPlexMono_400Regular' }` (and matching for bold via component-level styles). Confirm fallback fonts never render.
   - Root view: `style={{ flex: 1, backgroundColor: '#000000' }}` with `SafeAreaView` for top inset. Tab bar background also `#000000`.
2. `Times` tab screen (the renamed `index.tsx`):
   - Mirror `src/app/page.tsx`: a `<ScrollView>` (or `<View>` if it fits) with the page padding/centering set via `contentContainerStyle`. Inner container: `{ alignSelf: 'stretch', maxWidth: 338, width: '100%', paddingTop: 48 }` centered inside an outer container with `{ paddingHorizontal: 16, paddingBottom: 24, alignItems: 'center' }`. Render `<Departures />` inside.
   - Use `useGeolocation` here only if you need to compute distances at the page level — otherwise leave it inside `<Departures />` as today.
3. `components/Tag.tsx` (port):
   - Replace `<div>` wrapper with `<View>` and the inner text with `<Text>`.
   - Same `typeToColor` / `typeToName` maps — unchanged.
   - Inline `style={{ color, borderColor: color }}` works identically in RN.
   - Note: `Tag.tsx` is imported but not visibly used in the current `Departures.tsx`; port it for completeness but don't render it unless the web app does.
4. `components/Departures.tsx` (port — the critical one for visual parity):
   - Outer wrapper: `<View style={{ width: '100%' }}>` with an inner `<View style={{ flexDirection: 'column', gap: 16 }}>` for the list.
   - `StopDepartureGroup`: `<View style={{ borderRadius: 24, padding: 22, flexDirection: 'column', gap: 8, backgroundColor: '#131313' }}>`. Header row: `<View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', paddingBottom: 19 }}>` containing `<MetroIcon width={21} height={22} fill={typeToColor[stop.type]} />` and `<Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>{stop.name}</Text>`.
   - `Departure` row: `<View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>` with direction `<Text>` left and countdown `<Text>` right, both `color: '#FFFFFF'`.
   - Loading / error / "Getting location..." states render as a single centered `<Text style={{ color: '#FFFFFF' }}>` — same copy as the web version.
   - Move the repeated style objects into a `StyleSheet.create({ card, header, row, ... })` block at the bottom of the file to keep the JSX readable.
5. Performance tweak (does **not** change visuals): set TanStack Query `refetchInterval: 2000` as today, but also pause on background via `focusManager` + `AppState` listener so we don't burn battery when the screen isn't visible.

**Verification — visual parity (this is the gate; all must pass):**
- Side-by-side: simulator iPhone 14 (390pt) next to Safari at 390px width on the same departure stops. The two screenshots overlay with **no card-shape, padding, color, or font-weight differences**.
- Card background color sampled with a color picker reads `#131313` on both.
- Card corner radius measures the same (24px).
- Content column is centered with the same left/right gutter; max card width is 338px on both.
- Top padding from the safe-area inset down to the first card matches the web's 48px — apply that `paddingTop` *below* the safe-area inset, not on top of it.
- Metro icon: A=green, B=yellow, C=red, sized 21×22, positioned left of the stop name with the same gap (16px).
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

This works because we use only modules supported by Expo Go (expo-location, expo-font, react-native-svg, expo-router).

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
