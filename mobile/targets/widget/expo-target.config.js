/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  // Product name for the extension. Kept distinct from the app target ("MetroTimes").
  name: 'MetroTimesWidget',
  displayName: 'Metro Times',
  // Leading dot → appended to the app bundle id: com.valcik.metrotimes.widget
  bundleIdentifier: '.widget',
  // Accessory (lock-screen) widgets require iOS 16+. App target stays at 15.1.
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  // No image/symbol assets: the metro "M" is drawn as a SwiftUI vector path in
  // index.swift (MetroGlyphShape) so nothing depends on an asset loading.
};
