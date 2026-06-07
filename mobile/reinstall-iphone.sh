#!/usr/bin/env bash
# Re-sign + reinstall + verify Metro Times on a USB-connected iPhone using the
# free personal Apple ID. Free-team signatures expire after 7 days, so re-run
# this weekly (or whenever the app shows "could not be verified" on launch).
#
# Usage:  plug the iPhone in, unlock it, then:  ./reinstall-iphone.sh
#
# Note: this builds from the existing native ios/ project (gitignored). If you
# re-run `expo prebuild`, the signing tweaks are regenerated away — re-apply
# CODE_SIGN_STYLE=Automatic + the Release LaunchAction per ../PUT_ON_IPHONE_PLAN.md.
set -euo pipefail
cd "$(dirname "$0")"

BUNDLE_ID="com.valcik.metrotimes"

# Auto-detect the first connected physical iPhone's UDID.
UDID=$(xcrun xctrace list devices 2>/dev/null \
  | sed -n '/== Devices ==/,/== Simulators ==/p' \
  | grep -i 'iphone' \
  | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}' \
  | head -1)

if [ -z "${UDID:-}" ]; then
  echo "❌ No iPhone detected. Plug it in via USB, unlock it, tap 'Trust This Computer', then retry."
  exit 1
fi

echo "▶ Building Release for device $UDID ..."
xcodebuild -workspace ios/MetroTimes.xcworkspace -scheme MetroTimes \
  -configuration Release -destination "id=$UDID" \
  -allowProvisioningUpdates -derivedDataPath ios/build/ddp build

echo "▶ Installing onto device ..."
xcrun devicectl device install app --device "$UDID" \
  ios/build/ddp/Build/Products/Release-iphoneos/MetroTimes.app

# Verify by launching the app and confirming the process actually started.
echo "▶ Verifying launch ..."
if xcrun devicectl device process launch --device "$UDID" "$BUNDLE_ID" 2>&1 \
     | grep -q "Launched application"; then
  echo "✅ VERIFIED: Metro Times launched on the device. Standalone install is live."
  exit 0
else
  echo "⚠️  Installed, but the app would not launch. Almost always the cert needs"
  echo "   (re-)trusting: Settings → General → VPN & Device Management → Developer App → Trust."
  echo "   Trust it, then tap the Metro Times icon (or re-run this script to re-verify)."
  exit 2
fi
