## TODO — Standalone install on iPhone (no dev server) - can be done later

**Status: 🚧 In progress** — native iOS project generated and opened in Xcode; remaining work is the user-side signing flow + first install.

**What:** Get the app installable on the iPhone home screen as a regular app icon that launches without `expo start` running. Use the **free Apple ID** signing path (no $99 Apple Developer Program) — accept the trade-off that Apple expires sideloaded apps every 7 days and the install must be refreshed weekly via Xcode.

**Decision log:**
- Chose Option A (Xcode local install with free Apple ID) over: TestFlight (requires the paid Apple Developer Program), AltStore/SideStore (same 7-day cert + extra helper to maintain), and staying on Expo Go (works but isn't "tap your icon on the home screen").
- Switching the Run scheme to **Release** config is what makes the install independent of the dev server: the JS bundle gets embedded in the `.app` at build time instead of being fetched from Metro at launch.

**Steps:**
1. Update `mobile/app.json` for a real-app identity:
   - `name`: `Metro Times`
   - `slug`: `metro-times`
   - `scheme`: `metrotimes`
   - `ios.bundleIdentifier`: `com.valcik.metrotimes`
2. Generate the native iOS project from the Expo config:
   ```
   cd mobile && pnpm exec expo prebuild --platform ios
   ```
   This creates `mobile/ios/` (already in `.gitignore`) and runs `pod install`. CocoaPods is required; if not installed, prebuild installs it itself.
3. Open the generated workspace in Xcode (the `.xcworkspace`, **not** the `.xcodeproj`):
   ```
   open mobile/ios/MetroTimes.xcworkspace
   ```
4. In Xcode, sign in with your free Apple ID once: **Xcode → Settings → Accounts → + → Apple ID** → sign in.
5. Configure signing on the `MetroTimes` target:
   - Click the blue `MetroTimes` project in the Project Navigator → select the `MetroTimes` target.
   - **Signing & Capabilities** tab.
   - Check **Automatically manage signing**.
   - **Team**: pick your name suffixed with **`(Personal Team)`**.
   - Bundle Identifier should read `com.valcik.metrotimes` from `app.json`. If Xcode reports it as taken, append a digit.
6. Switch the Run scheme to **Release** (so the install doesn't depend on the dev server):
   - **Product → Scheme → Edit Scheme…** → **Run** (left sidebar) → **Info** tab → **Build Configuration: Release**.
7. Plug the iPhone into the Mac via USB:
   - Unlock the phone and tap **Trust This Computer** when prompted; enter passcode.
   - In Xcode: **Window → Devices and Simulators** (⇧⌘2). Wait for the phone to finish **"Preparing device for development"** (downloads debug symbols; several minutes on first connect).
8. Enable **Developer Mode** on the iPhone (iOS 16+):
   - **Settings → Privacy & Security → Developer Mode → On** → reboot the phone when prompted. (The toggle only appears after Xcode has attempted an install once; if you don't see it yet, do step 9 first and it'll appear.)
9. Pick the iPhone in Xcode's device dropdown (top toolbar, next to the run button), then **⌘R** to build, sign, install, and launch.
10. On first launch, the iPhone shows **"Untrusted Developer"**:
    - **Settings → General → VPN & Device Management** → tap your Apple ID under "Developer App" → **Trust**.
    - Tap the app icon on the home screen — runs standalone, no Mac required.
11. **Weekly re-sign**: plug the phone back in, open the same workspace, hit **⌘R**. Same bundle ID + team → reinstalls in place.

**Verification:**
- App icon labelled "Metro Times" appears on the iPhone home screen.
- Launching the app with `pnpm expo start` **not** running still shows live departures.
- After ~7 days the app stops launching ("could not be verified" / cert expired); re-running ⌘R in Xcode restores it.

**Delivered so far (steps 1–3 of the flow above):**
- `mobile/app.json` updated: `name` → "Metro Times", `slug` → "metro-times", `scheme` → "metrotimes", added `ios.bundleIdentifier` = "com.valcik.metrotimes".
- `pnpm exec expo prebuild --platform ios` ran successfully:
  - CocoaPods CLI was not installed; `gem install cocoapods` failed → Homebrew fallback installed `cocoapods 1.16.2_2` (pulled in `ruby 4.0.4` and `openssl@3 3.6.2`).
  - `mobile/ios/` generated with `MetroTimes.xcworkspace`, `MetroTimes.xcodeproj`, `Pods/`, `Podfile`, `Podfile.lock`.
- Workspace opened in Xcode (`open mobile/ios/MetroTimes.xcworkspace`) — Xcode is running on the user's machine with the project loaded.

**Still to do (steps 4–11, user-side; signing not yet finished):**
- Apple ID sign-in in Xcode Settings → Accounts.
- Target signing config: enable "Automatically manage signing", pick the "(Personal Team)" team.
- Switch the Run scheme's Build Configuration from Debug to Release.
- Plug iPhone in via USB, Trust This Computer, wait for Xcode to finish "Preparing device for development".
- Enable Developer Mode on iPhone (iOS 16+).
- Select device in Xcode, ⌘R to build + install.
- Trust the developer cert on the phone after first install.

**Open issues / troubleshooting:**
- **iPhone not yet connected** — this is the current blocker. Xcode reported **"No profiles for 'com.valcik.metrotimes' were found"** and **"Your team has no devices from which to generate a provisioning profile"**. Root cause: the personal team can only synthesise a provisioning profile for devices it has registered, and no iPhone has been plugged in + trusted yet, so there are zero devices on the team. Resolution path:
  1. Plug iPhone in via USB (a data-capable cable, not charge-only).
  2. Unlock the phone; tap **Trust This Computer** + passcode.
  3. In Xcode: **Window → Devices and Simulators** (⇧⌘2) — wait until the phone shows "Connected" with no spinner ("Preparing device for development" finishes).
  4. Enable Developer Mode on the phone (step 8 above) — required on iOS 16+.
  5. Back in **Signing & Capabilities**, click **Try Again** on the red error (or toggle "Automatically manage signing" off/on). Xcode then registers the device with the personal team and synthesises the provisioning profile.

**Out of scope (intentionally deferred):**
- App icon + splash screen artwork (still using the default Expo icon).
- Pull-to-refresh on the departures list.
- `refetchInterval` tuning by network type.
- TestFlight distribution via `eas submit` (would require the $99/yr Apple Developer Program).
- Background-polling pause is already wired in Phase 4's `_layout.tsx` (`AppState` → `focusManager.setFocused(...)`); no further work needed there.

---

## Cleanup 

Once the Expo app is verifiably at parity:
- Move the Next.js code into a `web/` subfolder (or delete it) so the repo root is no longer a confusing mix.
- Update `README.md` with `mobile/` setup instructions.
- Decide whether to keep `web/` as a fallback or remove it entirely.
