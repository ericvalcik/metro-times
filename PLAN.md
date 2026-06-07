# Lock-Screen Widget Plan

Add a tappable lock-screen widget to the Metro Times iOS app that opens the app
straight to the departures screen.

This is companion work to `PUT_ON_IPHONE_PLAN.md` (the free-Apple-ID install flow)
and to the `reinstall-on-iphone` skill. Read those first — the build/sign/install
mechanics here are the same, with **one extra target to sign**.

## Goal

A round `.accessoryCircular` lock-screen widget showing the monochrome Metro Times
logo. Tapping it unlocks → launches the app → lands on the departures index.

## Resolved decisions

| Decision | Outcome | Why |
|---|---|---|
| Placement | Lock screen `.accessoryCircular` (round) | User wants a lock-screen tap target; the lock screen has no square — circle is the closest. |
| Glyph | `mobile/assets/icons/metro.svg` → monochrome **template** image | On-brand, single clean path, converts crisply. |
| Color | Monochrome only | iOS forces single-tint rendering for accessory widgets. Line colors (A/B/C) are N/A here. |
| Tap behavior | `widgetURL("metrotimes:///")` → departures index | Predictable "straight into the app"; ignores last-viewed tab. |
| Tooling | `@bacons/apple-targets` (latest: 4.0.7) | Config plugin recreates the widget target on every `expo prebuild`. peer `expo >=52` ✓ (we're on SDK 55). |
| Deployment target | Widget target = **iOS 16.0**; app stays 15.1 | Accessory widgets require iOS 16+. Phone confirmed 16+. |
| Data sharing | **None** (no App Group) | Static widget — no live data. Avoids the App-Group capability wall on free Apple IDs. |
| Bundle id | `com.valcik.metrotimes.widget` | Second App ID; ~2 of the 10/7-day free-account slots per rebuild. Plenty of headroom. |
| Widget kind / display name | kind `MetroTimesWidget`, gallery name "Metro Times" | — |

## Constraints & gotchas

- **iOS 16+ only.** Widget won't appear on iOS 15. Phone confirmed on 16+.
- **Monochrome.** Don't expect color art; design the glyph to read as a single tint.
- **Two targets to sign.** Each weekly re-sign in Xcode now sets the team on **both**
  the app target *and* the widget target. Xcode usually remembers between builds, but
  may reset after a prebuild — re-confirm if signing errors appear.
- **The widget's SwiftUI is hand-maintained source**, living in the repo under
  `mobile/targets/widget/`. It is not generated from JS — WidgetKit never runs our
  JS bundle.
- **Deep link must resolve.** `metrotimes:///` must route to the index. expo-router
  handles `scheme` URLs automatically (`scheme: "metrotimes"` is set in `app.json`),
  and `index.tsx` is the root route — so no app-side code change is expected. Verify
  it anyway (step V0).
- **No App Group** means the widget can never show live departures without a later,
  bigger change (App Groups → likely a paid Apple account). Out of scope here.

## Implementation steps

> All paths relative to repo root. App code lives in `mobile/`.

1. **Add the plugin** (from `mobile/`):
   ```bash
   cd mobile
   pnpm add -D @bacons/apple-targets
   ```

2. **Register the plugin** in `mobile/app.json` under `expo.plugins`:
   ```json
   "plugins": [
     "expo-router",
     ["expo-splash-screen", { /* existing */ }],
     "@bacons/apple-targets"
   ]
   ```

3. **Create the widget target dir** `mobile/targets/widget/` with:

   - `expo-target.config.js`:
     ```js
     /** @type {import('@bacons/apple-targets').Config} */
     module.exports = {
       type: 'widget',
       name: 'MetroTimes',
       deploymentTarget: '16.0',
     };
     ```

   - `index.swift` — the SwiftUI widget (static timeline, `.accessoryCircular`,
     `AccessoryWidgetBackground()`, the template `Image`, and
     `.widgetURL(URL(string: "metrotimes:///"))`). Supported families:
     `[.accessoryCircular]`.

   - **Glyph asset** — convert `mobile/assets/icons/metro.svg` to a PDF (or 1x/2x/3x
     PNG), add it to the target's `Assets.xcassets` as a **template** image
     (`Render As: Template Image`) named e.g. `MetroGlyph`, referenced by `Image("MetroGlyph")`.
     Follow the `@bacons/apple-targets` asset-catalog convention for placing assets in
     the target dir.

4. **Regenerate native project**:
   ```bash
   cd mobile
   pnpm exec expo prebuild --platform ios --clean
   ```

5. **Open & sign**: open `mobile/ios/MetroTimes.xcworkspace` in Xcode. Set the signing
   team (free Apple ID) on **both** the `MetroTimes` app target and the new widget
   target. Switch the Run scheme to **Release** (per `PUT_ON_IPHONE_PLAN.md`).

6. **Build & install** to the USB-connected iPhone (⌘R), same as the existing flow.

## Verification steps

Run these in order. Each has an explicit pass condition.

- **V0 — Deep link resolves (do this before building the widget).**
  With the app installed, from `mobile/`:
  ```bash
  pnpm exec uri-scheme open "metrotimes:///" --ios
  ```
  (or `xcrun simctl openurl booted "metrotimes:///"` on a simulator with the app installed).
  **Pass:** app opens to the **departures index**, not the stations tab.
  *If it doesn't route correctly, fix routing before wiring the widget — the widget
  will only ever be as good as this link.*

- **V1 — Prebuild generates the target.**
  After step 4, `mobile/ios/` contains a widget target/scheme.
  **Pass:** `grep -rl "MetroTimesWidget\|widget" mobile/ios/*.xcodeproj/project.pbxproj`
  finds the target; the widget scheme is visible in Xcode's scheme picker.

- **V2 — Both targets build & sign.**
  **Pass:** ⌘B succeeds with no signing errors on either target; build installs to the
  device without "Untrusted Developer" beyond the normal one-time trust step.

- **V3 — Widget appears in the gallery.**
  On the iPhone: long-press the lock screen → **Customize** → **Lock Screen** → tap a
  widget slot → scroll the gallery.
  **Pass:** "Metro Times" appears with a circular widget option; placing it shows the
  metro glyph (monochrome) on a faint circular background, legibly.

- **V4 — Tap opens to departures.**
  Lock the phone. Tap the widget. Authenticate (Face ID / passcode).
  **Pass:** app launches and lands on the **departures index**.

- **V5 — Tap target is deterministic.**
  Open the app, switch to the **stations** tab, background it, lock the phone, tap the
  widget.
  **Pass:** app opens on **departures**, not stations (confirms `widgetURL` overrides
  resume-last-state).

- **V6 — Survives a clean prebuild.**
  Run `pnpm exec expo prebuild --platform ios --clean` again, rebuild.
  **Pass:** the widget target still exists and still works (confirms the plugin, not a
  manual Xcode edit, owns the target).

## Rollback

1. Remove `"@bacons/apple-targets"` from `app.json` plugins.
2. `pnpm remove @bacons/apple-targets` and delete `mobile/targets/widget/`.
3. `pnpm exec expo prebuild --platform ios --clean`.
4. Rebuild — the widget target is gone; the app is unchanged.

## Out of scope (would need a bigger plan)

- Showing **live departures** on the widget → requires an App Group (likely a paid
  Apple Developer account) + a data feed (background refresh or shared file) + a
  WidgetKit timeline.
- Home Screen square widget, `.accessoryRectangular`, or `.accessoryInline` variants.
- Android lock-screen / home-screen widgets (different platform model entirely).
