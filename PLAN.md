# Stations Page — Stop Selection (IMPLEMENTED)

> Status: **done & verified** (tsc clean, iOS bundle builds, runtime-checked in the simulator).
> This file now records what was actually built, including where it diverged from the original plan.

## Goal

Add a **Stations** tab where the user searches all Prague stops, expands stop groups, and toggles individual platforms on/off. The set of selected stops is a **candidate pool** persisted across launches (AsyncStorage).

**Important correction to the original plan:** the proximity logic on the Times tab is *kept*. The Times tab still shows only the **5 stops closest to the user's current location** — but now those 5 are chosen from the user-selected pool instead of from all metro stops. The Stations tab manipulates the pool, not the displayed list. (Selecting "all metro" and querying ~114 platform ids at once returns a `400` from the Golemio API and would render 57 cards — that is not the intent.)

---

## 1. Pre-process stops.json → compact asset ✅

`scripts/process-stops.ts` reads `playground/stops.json` (~18 MB) and writes `mobile/src/data/allStops.json`.

- **Run with:** `node scripts/process-stops.ts` (run from repo root). Node 24+ strips TS types natively — no `ts-node`/`tsx` needed.
- **Filter:** Prague only via `districtCode === "AB"`.
- **Output:** 1468 stop groups (57 metro), **420 KB**.

Shapes (in `mobile/src/data/stops.ts`):

```ts
type CompactPlatform = {
  id: string;        // PID stop id used by the departureboards API, e.g. "U321Z101P"
  platform: string;  // platform label, e.g. "M1", "A", "1"
  type: string;      // platform mainTrafficType, e.g. "metroA" | "tram" | "bus"  (ADDED vs original plan)
  lines: string[];   // deduped, sorted line names, e.g. ["A"] or ["9", "22"]
};
type CompactStop = {
  id: string;              // first platform's gtfsId — stable & unique within Prague
  name: string;            // stopGroup.uniqueName
  avgLat: number;
  avgLon: number;
  mainTrafficType: string; // "metroA" | "metroAB" | "tram" | "bus" | ...
  stops: CompactPlatform[];
};
```

Script details / decisions:
- **Group `id` = first platform's gtfsId**, NOT `node`. `node` is not unique within Prague (adjacent stations like Anděl / Na Knížecí share node 1040). The chosen first-platform id is globally unique (script throws on collision).
- `CompactPlatform.type` was **added** (not in the original plan) — needed for the metro-only default and for coloring line tags by mode.
- Platforms are **sorted metro-first** (then tram/trolleybus/bus/train), so for metro groups the group id is the metro platform id and the expanded list reads naturally.
- Platforms with **no lines** (station entrances, etc.) are dropped; groups left with zero platforms are dropped.
- `id` chosen per platform: prefer the `gtfsId` ending in `P` (the PID stop id the API echoes back), else the first.

---

## 2. Persist user selections — `useSelectedStops` ✅

`mobile/src/hooks/use-selected-stops.ts` — a **context provider** (`SelectedStopsProvider`) + `useSelectedStops()` hook, so the Times and Stations tabs share live state and re-render together. Mounted in `mobile/src/app/_layout.tsx` (replaced the old `AppContextProvider`).

AsyncStorage key `"selectedStops"`, shape:

```ts
type Selection = {
  [groupId: string]: { all: boolean; platforms: string[] };
};
```

Exported API:
- `hydrated: boolean` — true once the persisted value has been read.
- `selectedStops: CompactStop[]` — resolved pool (each group's `stops` filtered to selected platforms), name-sorted.
- `toggleGroup(groupId)` — cycles `none → all → none`; `some → all`.
- `togglePlatform(groupId, platformId)` — toggles one platform; auto-promotes to `all` when all are on, removes the group when the last one is turned off.
- `isGroupSelected(groupId): 'all' | 'some' | 'none'`
- `isPlatformSelected(groupId, platformId): boolean`

**First-launch default:** only the **metro platforms** of metro stations are selected (user-chosen). Surface platforms at metro stations and all tram/bus/train stops start off. So metro transfer stations show as *indeterminate* (`some`) until their surface platforms are added.

---

## 3. Wire selections into Departures ✅

`mobile/src/components/Departures.tsx`:
- Always reads location via `useGeolocation()`.
- Computes the **5 closest** groups in `selectedStops` (haversine to each group's `avgLat/avgLon`), and queries only those platform ids (~10–20 ids → safely under the API cap).
- States: not hydrated → "Loading…"; empty pool → "No stops selected. Add some on the Stations tab."; no coords yet → "Getting location…".
- **Guard:** `const departures = Array.isArray(data?.[0]) ? data[0] : []` — the departureboards API returns one array per group on success but an error *object* on a bad request, so we never `.filter` undefined again (this was the cause of the original crash).
- Card icon color = the stop's first metro line color, else neutral gray (`stopIconColor`). `fetchStops` / query shape unchanged.

`mobile/src/hooks/use-geolocation.ts` is unchanged from `main` (a temporary lazy `enabled` flag was added and then reverted once proximity became always-on again).

---

## 4. Stations screen UI ✅

`mobile/src/app/(tabs)/stations.tsx` — full rewrite.

- `SafeAreaView` → header (title, search `TextInput`, "Selected only" `Switch`) → `FlashList`.
- `FlashList` is fed a **flattened row list** (`group` rows, plus `platform` rows when a group is expanded); `getItemType` keeps recycling correct across the two row kinds.
- **Search:** diacritic-insensitive (`normalize` maps Czech diacritics, so "namesti" matches "Náměstí") — a small upgrade over the plan's plain `includes`.
- **Checkboxes:** filled (`all`), dash/indeterminate (`some`), empty (`none`).
- **"Selected only" toggle:** filters the list to groups whose `isGroupSelected !== 'none'`.
- **Line tags:** compact pills via `LineTag` (added to `mobile/src/components/Tag.tsx`), colored by `lineColor(platformType, name)` — metro A/B/C use their line colors, everything else neutral gray.

---

## 5. Files changed / created

| File | Change |
|---|---|
| `scripts/process-stops.ts` | NEW — one-off build script |
| `mobile/src/data/allStops.json` | NEW — generated compact asset (420 KB) |
| `mobile/src/data/stops.ts` | REWRITE — typed wrapper around the JSON (`CompactStop`/`CompactPlatform`, `allStops`, `isMetroType`) |
| `mobile/src/hooks/use-selected-stops.ts` | NEW — context provider + persistence + selection logic |
| `mobile/src/app/(tabs)/stations.tsx` | REWRITE — full UI |
| `mobile/src/components/Departures.tsx` | EDIT — pool → 5 closest, response guard |
| `mobile/src/components/Tag.tsx` | EDIT — added `lineColor` + `LineTag` |
| `mobile/src/app/_layout.tsx` | EDIT — `SelectedStopsProvider` replaces `AppContextProvider` |
| `mobile/src/components/AppContext.tsx` | REMOVED — selections replace context state |
| `mobile/src/hooks/use-geolocation.ts` | (net no change) |

**Dependencies added** (`mobile/package.json`): `@shopify/flash-list@2.0.2`, `@react-native-async-storage/async-storage@2.2.0`. Only AsyncStorage is a **native** module (needs `pod install` — see §9); `@shopify/flash-list` v2 is **JS-only** (no podspec).

---

## 6. Decisions made

- **Default selection = metro platforms only** of metro stations (user choice). Tram/bus/train off until enabled.
- **Times tab = 5 closest from the pool** (proximity retained; the plan's "show all selected" reading was wrong — see Goal).
- **Prague = `districtCode "AB"`** (no bounding box needed; 420 KB asset).
- **All transport types are searchable/selectable** on the Stations tab.

---

## 7. Follow-ups / notes

- **Native rebuild — DONE (§9).** AsyncStorage's pod was missing, so the first device build crashed on launch with `NativeModule: AsyncStorage is null`; fixed with `pod install --project-directory=ios` (no full `expo prebuild` needed) + a reinstall. Going forward, any **new native dependency** needs a `pod install` before the next device build; JS-only reloads in Expo Go / simulator never need a rebuild.
- **Transfer stations are now single cards.** Můstek (A+B) and Muzeum (A+C) render as one card combining both lines, deduped by destination — previously they were per-line cards. Splitting per line again would be a small follow-up.
- **API id cap.** The departureboards endpoint rejects very large `stopIds` (10 ok, 114 → `400`; exact cap between 50–114, not pinned down). Only 5 stops are ever queried, so this is not hit in practice; the `Array.isArray` guard degrades gracefully if it ever is. No chunking implemented.
- **pnpm store quirk.** `node_modules` was linked from store `v11/v10` (a pnpm 11 on this machine) while the active pnpm is 10.30.3 (store `v10`); the deps install used `--config.store-dir=…/v11/v10`. Harmless, but a future plain `pnpm install` may warn about the store location.
- **`pnpm lint` doesn't run** — eslint isn't installed (`expo lint` installs it interactively on first run); unrelated to this work. `pnpm exec tsc --noEmit` is the working gate.
- **Regenerating the asset:** `node scripts/process-stops.ts` from the repo root.

---

## 8. Times tab departure rows — two-line layout

Later change to `mobile/src/components/Departures.tsx` (+ `mobile/src/lib/utils.ts`), independent of the Stations work. Each departure row now shows the connection **name + headsign** on top and the **countdown(s)** below, e.g.:

```
22  Vozovna Vokovice
12:01 (18:34)
```

- `parseDeparture` (`utils.ts`) now also returns `name` (`route.short_name`) and `type` (`route.type`).
- `uniqByHeadsign` (kept one departure per destination) was replaced by **`groupByHeadsign`**, which preserves order and keeps the **first two** departures per headsign as `{ first, second? }`.
- `Departure` renders the name colored via `lineColor(type, name)` + headsign on the top line; the closest countdown in **white 16px**, and — when a `second` exists and is still in the future — the next countdown after it in **gray brackets**. New styles: `rowTop` / `rowName` / `rowDirection` / `rowTimers` / `rowTimer` / `rowTimerNext`.
- Dedup still keys on headsign only, so two different lines to the same destination collapse to the first line's name (unchanged behavior; possible follow-up = key on name+headsign).

---

## 9. Device install: `AsyncStorage is null` crash — resolved

The native rebuild predicted in §7 was carried out. The first standalone build after the Stations work **crashed immediately on launch**:

```
RCTFatalException: Unhandled JS Exception:
Error: [@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.
```

**Root cause:** `@react-native-async-storage/async-storage` was added in JS (`use-selected-stops.ts`) but its native pod was never linked — `RNCAsyncStorage` was absent from `ios/Podfile.lock`. The build shipped a healthy 3.4 MB JS bundle (so *not* the empty-bundle/sandboxing issue); the crash fired during expo-router's initial route load when the provider imported AsyncStorage.

**Fix (no full prebuild needed):**
1. `pod install --project-directory=ios` from `mobile/` → installed `RNCAsyncStorage (2.2.0)`, now in `Podfile.lock`.
2. Re-ran the `reinstall-on-iphone` skill → `BUILD SUCCEEDED`, installed, console-attached relaunch confirmed JS evaluated with **no crash**.

`pod install` alone was sufficient and avoided `expo prebuild` (which would have wiped the manual signing tweaks). `@shopify/flash-list@2.0.2` turned out **JS-only** (no podspec), so it needed no pod install — correcting §5's earlier claim.

**Debugging technique (reusable):** the reinstall script's "VERIFIED launch" only proves the process *spawned*. To catch a crash that happens a moment later, relaunch with the console attached and watch stdout/stderr for `RCTFatalException` / `signal 6`:

```bash
xcrun devicectl device process launch --console --terminate-existing \
  --device <UDID> com.valcik.metrotimes   # UDID from `xcrun devicectl list devices`
```
