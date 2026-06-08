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
  // Plain SVG → tiny raster imageset; an SF Symbol template stays vector and
  // tints cleanly in the lock screen's single-color rendering. Referenced in
  // Swift as Image("MetroGlyph").
  images: {
    MetroGlyph: './MetroGlyph.svg',
  },
};
