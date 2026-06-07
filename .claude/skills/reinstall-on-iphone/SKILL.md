---
name: reinstall-on-iphone
description: Re-build, re-sign, re-install, and verify the Metro Times app on a USB-connected iPhone using the free personal Apple ID. Use when the user wants to put the app back on their phone, re-sign the weekly-expired build, fix a "could not be verified"/"Untrusted Developer" launch failure, or asks to rebuild/reinstall/redeploy Metro Times to their device.
---

# Reinstall Metro Times on iPhone

Free Apple ID signatures expire after 7 days. This re-signs, reinstalls, and verifies
the standalone (no-dev-server) install. Background and one-time setup live in
`PUT_ON_IPHONE_PLAN.md`; this skill is the recurring re-sign flow.

## Workflow

1. **Pre-flight.** Confirm an iPhone is connected and online:
   ```bash
   xcrun xctrace list devices | sed -n '/== Devices ==/,/== Simulators ==/p' | grep -i iphone
   ```
   The phone must appear under `== Devices ==`, not `== Devices Offline ==`. If it's
   missing or offline, ask the user to plug it in via USB, unlock it, and tap
   "Trust This Computer". Don't proceed until it shows online.

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
- Cadence: re-run weekly when the app stops launching ("could not be verified").
- `expo run:ios` does NOT work for this free-team path — it omits
  `-allowProvisioningUpdates`, so the profile can't be generated. Use the script.
