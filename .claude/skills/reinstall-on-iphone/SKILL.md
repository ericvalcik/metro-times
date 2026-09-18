---
name: reinstall-on-iphone
description: Re-build, re-sign, re-install, and verify the Metro Times app on the iPhone (over Wi-Fi, no cable required once paired) using the free personal Apple ID. Use when the user wants to put the app back on their phone, re-sign the weekly-expired build, fix a "could not be verified"/"Untrusted Developer" launch failure, or asks to rebuild/reinstall/redeploy Metro Times to their device.
---

# Reinstall Metro Times on iPhone

Free Apple ID signatures expire after 7 days. This re-signs, reinstalls, and verifies
the standalone (no-dev-server) install. This skill is the recurring re-sign flow.
(`PUT_ON_IPHONE_PLAN.md` used to hold the one-time setup notes; it was deleted in
`20afa2f`. Everything still needed now lives in this file and in `mobile/plugins/`.)

## Workflow

1. **Pre-flight.** Confirm the iPhone is reachable. Use `devicectl` — it is the
   authoritative check because it shares the CoreDevice path the install/launch step
   actually uses:
   ```bash
   xcrun devicectl list devices
   ```
   The iPhone must show **State `available (paired)`** (it will, even when locked, and
   even with no cable plugged in — confirmed end-to-end 2026-08: build, `devicectl
   install`, and launch all succeeded over Wi-Fi with zero USB connection). If so,
   proceed — do not block on anything else.

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
- **The lock-screen widget ships automatically — nothing extra to do.** The
  `MetroTimesWidget` target (bundle id `com.valcik.metrotimes.widget`, via
  `@bacons/apple-targets`) is an *embedded* extension: the `MetroTimes` scheme builds it
  as a dependency, `-allowProvisioningUpdates` signs it on the same free team, and it
  lands inside the app bundle at `MetroTimes.app/PlugIns/MetroTimesWidget.appex`.
  Installing the `.app` installs the widget. Sanity-check after a build:
  `ls ios/build/ddp/Build/Products/Release-iphoneos/MetroTimes.app/PlugIns/`.
  (Free Apple ID burns a second App ID slot per rebuild for the widget id — fine within
  the 10/7-day allowance.)
- **App installs but launches to a blank/broken screen?** Check the bundled JS isn't
  empty: `ls -la …/MetroTimes.app/main.jsbundle` should be a few MB, not ~0. The cause
  seen 2026-06: `@bacons/apple-targets` flips `ENABLE_USER_SCRIPT_SANDBOXING = YES`,
  which sandboxes the RN "Bundle … code and images" phase (`Sandbox: node(...) deny
  file-write-create … main.jsbundle`) and produces an empty bundle. Durable fix is
  already in place: `mobile/plugins/with-disable-script-sandboxing.js` (registered last
  in `app.json` plugins) flips it back to `NO` on every prebuild. If the symptom returns,
  verify `grep -c "ENABLE_USER_SCRIPT_SANDBOXING = NO" ios/MetroTimes.xcodeproj/project.pbxproj`
  is 4 and that the plugin is still registered. NOTE: a build into Xcode's *default*
  DerivedData can keep a stale empty bundle — this script's clean `ios/build/ddp` avoids that.
- **`expo prebuild` needs no manual follow-up any more.** The native `ios/` project is
  still gitignored and still regenerated, but every tweak it used to wipe is now an
  Expo config plugin in `mobile/plugins/`, registered in `app.json`:
  `with-ios-scene-lifecycle` (UIScene adoption — without it iOS 26+ terminates the app
  at launch), `with-ios-deployment-target` (iOS 16.0 floor for the app and every pod),
  `with-free-signing` (`CODE_SIGN_STYLE = Automatic` so `-allowProvisioningUpdates` can
  sign on the free team) and `with-disable-script-sandboxing`. Verified end to end:
  `expo prebuild --platform ios --clean` followed by a plain `./reinstall-iphone.sh`
  reproduces a working install with no hand edits. The script builds
  `-configuration Release` explicitly, so the scheme's `LaunchAction` config is
  irrelevant to it — that only matters for ⌘R in Xcode.
- **Crash on launch? Pull the real crash report — don't guess.** The script's
  "VERIFIED launch" only proves the process spawned.
  `xcrun devicectl device info files --device <UDID> --domain-type systemCrashLogs`
  lists them, then
  `xcrun devicectl device copy from --device <UDID> --domain-type systemCrashLogs --source <name>.ips --destination ./crash.ips`.
  An `.ips` is a JSON header line + JSON body; the triggered thread's frames name the
  fault. `log stream` does not work against a device on this Mac, and `--console`
  only shows JS-level output, so a native termination prints nothing useful.
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
