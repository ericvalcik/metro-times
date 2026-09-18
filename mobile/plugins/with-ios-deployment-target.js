const { withPodfile, withPodfileProperties } = require('expo/config-plugins');

/**
 * Pins the iOS deployment target for the app and every pod.
 *
 * Two separate problems, one knob:
 *
 * 1. `expo-router@55` calls UIAction.subtitle (iOS 16+) unguarded in
 *    LinkPreview/LinkPreviewNativeActionView.swift while its podspec claims
 *    15.1 — an upstream oversight (the keepsMenuPresented call just above it
 *    *is* guarded). Building at 15.1 fails to compile ExpoRouter, so the floor
 *    has to be 16.0.
 * 2. Some pods' generated resource-bundle targets (RNCAsyncStorage_resources
 *    13.4, RNSVGFilters 12.4, SDWebImage 9.0) keep their podspec's ancient
 *    deployment target, which current Xcode rejects outright:
 *    "The iOS deployment target ... is set to 9.0, but the range of supported
 *    deployment target versions is 15.0 to 27.0.x."
 *    The stock react_native_post_install doesn't normalize those, so the
 *    Podfile gets a post_install pass that floors every target and project.
 */

const DEPLOYMENT_TARGET = '16.0';

const MARKER = '# with-ios-deployment-target';

const POST_INSTALL_FLOOR = `
    ${MARKER}: some pods (especially their generated *_resources bundle
    # targets) declare deployment targets below what current Xcode accepts,
    # which fails the build. Floor everything at the project's own minimum.
    min_target = podfile_properties['ios.deploymentTarget'] || '${DEPLOYMENT_TARGET}'
    projects = [installer.pods_project] + installer.generated_aggregate_targets.map { |t| t.user_project }
    projects.compact.uniq.each do |project|
      configurations = project.build_configurations + project.targets.flat_map(&:build_configurations)
      configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && Gem::Version.new(current) < Gem::Version.new(min_target)
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_target
        end
      end
      project.save
    end
`;

// Tail of the generated react_native_post_install(...) call inside post_install.
const ANCHOR = `      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
`;

module.exports = function withIosDeploymentTarget(config) {
  config = withPodfileProperties(config, (config) => {
    config.modResults['ios.deploymentTarget'] = DEPLOYMENT_TARGET;
    return config;
  });

  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }

    if (!contents.includes(ANCHOR)) {
      throw new Error(
        'with-ios-deployment-target could not find the react_native_post_install ' +
          'anchor in the Podfile. Without the floor, pods with pre-15.0 ' +
          'deployment targets fail the build — update the anchor in ' +
          'plugins/with-ios-deployment-target.js.'
      );
    }

    config.modResults.contents = contents.replace(
      ANCHOR,
      ANCHOR + POST_INSTALL_FLOOR
    );
    return config;
  });
};
