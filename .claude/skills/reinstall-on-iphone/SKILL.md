---
name: reinstall-on-iphone
description: Re-build, re-sign, re-install, and verify the Metro Times app on a USB-connected iPhone using the free personal Apple ID. Use when the user wants to put the app back on their phone, re-sign the weekly-expired build, fix a "could not be verified"/"Untrusted Developer" launch failure, or asks to rebuild/reinstall/redeploy Metro Times to their device.
---

# Reinstall Metro Times on iPhone

Free Apple ID signatures expire after 7 days. This re-signs, reinstalls, and verifies
the standalone (no-dev-server) install. Background and one-time setup live in
`PUT_ON_IPHONE_PLAN.md`; this skill is the recurring re-sign flow.

## Workflow

1. **Pre-flight.** Confirm the iPhone is reachable. Use `devicectl` — it is the
   authoritative check because it shares the CoreDevice path the install/launch step
   actually uses:
   ```bash
   xcrun devicectl list devices
   ```
   The iPhone must show **State `available (paired)`** (it will, even when locked). If
   so, proceed — do not block on anything else.

   ⚠️ **Do NOT gate on `xcrun xctrace list devices`.** It uses an older connection path
   that frequently reports a perfectly-connected phone as `== Devices Offline ==` (seen
   2026-06: xctrace said offline, devicectl said `available (paired)`, build+install
   succeeded). If `xctrace` and `devicectl` disagree, **trust `devicectl`**.

   Only if `devicectl` does NOT list the phone (or shows it unavailable): ask the user
   to plug it in via USB, unlock it, and tap "Trust This Computer", then re-check. A
   missing "Trust This Computer" prompt is normal when the Mac is already paired — it is
   not a problem as long as `devicectl` shows `available (paired)`.

2. **Build + install + verify** — run the bundled script from `mobile/`:
   ```bash
   cd mobile && ./reinstall-iphone.sh
   ```
   It auto-detects the device UDID, builds Release with `-allowProvisioningUpdates`,
   installs via `devicectl`, then launches the app to verify. First build of a session
   is slow (compiles all pods); later ones are cached. Run it in the background and
   watch the log for the outcome — don't block narrating every compile line.

3. **Interpret the exit code:**
   - **0** → `✅ VERIFIED: ... launched`. Done. Tell the user it's live on the home screen.
   - **2** → installed but launch was denied. This means the developer cert needs
     (re-)trusting on the phone: **Settings → General → VPN & Device Management →
     Developer App → tap the Apple ID → Trust**. Have the user trust it, then re-run
     the script (or just re-run the launch) to confirm `0`.
   - **1** → no iPhone detected. Back to step 1.

4. **Report** a short status: VERIFIED + bundle id, or the exact trust step needed.
   Visual confirmation of *live departures* is the user's eyeball check — CLI verifies
   the process launched, not the screen contents.

## Notes & gotchas

- Bundle id is `com.valcik.metrotimes`, team `N86QCX9R46`, scheme `MetroTimes`.
- The native `ios/` project is gitignored. If the user ran `expo prebuild` since the
  last install, the signing tweaks are wiped — re-apply `CODE_SIGN_STYLE = Automatic`
  (both target configs in `ios/MetroTimes.xcodeproj/project.pbxproj`) and flip the
  `LaunchAction` build config to `Release` in `MetroTimes.xcscheme`, per
  `PUT_ON_IPHONE_PLAN.md`, before running the script.
- **Stock-Expo icon after an icon change?** The gitignored `pbxproj` froze
  `ASSETCATALOG_COMPILER_APPICON_NAME = expo` from the very first prebuild, but the
  asset catalog now ships the icon under `AppIcon.appiconset`. Because `expo prebuild`
  *reuses* an existing `ios/`, that stale build setting never updates and the build
  keeps shipping the old `expo` icon. Fix: set both `ASSETCATALOG_COMPILER_APPICON_NAME`
  lines in `ios/MetroTimes.xcodeproj/project.pbxproj` to `AppIcon`, delete the cached
  `ios/build/ddp/Build/Products/Release-iphoneos/MetroTimes.app` so actool recompiles,
  then rebuild. Verify with `PlistBuddy -c "Print :CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconName"`
  on the built `.app/Info.plist` (should print `AppIcon`). iOS also caches the home-screen
  icon — uninstall first, and reboot the phone if it still shows stale.
- Cadence: re-run weekly when the app stops launching ("could not be verified").
- `expo run:ios` does NOT work for this free-team path — it omits
  `-allowProvisioningUpdates`, so the profile can't be generated. Use the script.
