const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * iOS 26+ requires apps to adopt the UIScene lifecycle. When an app built
 * against that SDK has not, UIKit terminates it at scene creation:
 *
 *   EXC_BREAKPOINT (SIGTRAP)
 *   __UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke
 *   -[UIApplication workspace:didCreateScene:withTransitionContext:completion:]
 *
 * Expo SDK 55 / RN 0.83 predate this and ship neither the Info.plist manifest
 * nor a scene delegate, so the generated app crashes on launch on iOS 26+.
 *
 * The UIApplicationSceneManifest key alone is NOT enough — verified shipping in
 * the built .app while it still crashed identically. UIKit wants real adoption:
 * a UIWindowSceneDelegate plus a configurationForConnecting hook. Both are
 * injected into AppDelegate.swift rather than a new file, because a new .swift
 * would have to be registered in the (gitignored) project.pbxproj.
 *
 * Drop this plugin once Expo ships scene support upstream.
 */

const SCENE_DELEGATE_MARKER = 'class SceneDelegate';

const CONFIGURATION_FOR_CONNECTING = `
  // iOS 26+ requires UIScene lifecycle adoption; UIKit terminates the app at
  // scene creation otherwise. Injected by plugins/with-ios-scene-lifecycle.js.
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: nil,
      sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

const SCENE_DELEGATE = `
/// Hands the scene the window that startReactNative already mounted React onto,
/// instead of building a second one. Injected by
/// plugins/with-ios-scene-lifecycle.js.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let existingWindow = appDelegate.window else {
      return
    }

    existingWindow.windowScene = windowScene
    window = existingWindow
    existingWindow.makeKeyAndVisible()
  }
}
`;

// End of the generated didFinishLaunchingWithOptions override. Stable across
// the Expo templates we build from; if it ever moves, fail loudly rather than
// emit an app that crashes on every launch.
const ANCHOR = `    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
`;

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
    };
    return config;
  });

  return withAppDelegate(config, (config) => {
    const { language } = config.modResults;
    if (language !== 'swift') {
      throw new Error(
        `with-ios-scene-lifecycle expects a Swift AppDelegate, got "${language}".`
      );
    }

    let contents = config.modResults.contents;
    if (contents.includes(SCENE_DELEGATE_MARKER)) {
      return config;
    }

    if (!contents.includes(ANCHOR)) {
      throw new Error(
        'with-ios-scene-lifecycle could not find the didFinishLaunchingWithOptions ' +
          'anchor in AppDelegate.swift. Without the scene delegate the app ' +
          'terminates at launch on iOS 26+, so update the anchor in ' +
          'plugins/with-ios-scene-lifecycle.js.'
      );
    }

    contents = contents.replace(ANCHOR, ANCHOR + CONFIGURATION_FOR_CONNECTING);
    config.modResults.contents = contents + SCENE_DELEGATE;
    return config;
  });
};
