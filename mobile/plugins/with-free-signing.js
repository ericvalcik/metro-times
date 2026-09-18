const { withXcodeProject } = require('expo/config-plugins');

/**
 * Keeps every target on automatic signing so `reinstall-iphone.sh` can sign
 * with the free personal Apple ID via -allowProvisioningUpdates. Manual signing
 * can't generate a profile on a free team, so the build fails with
 * "No profiles for 'com.valcik.metrotimes' were found".
 *
 * Belt-and-braces: the generated project usually already comes out Automatic,
 * but ios/ is gitignored and regenerated, so this makes the guarantee explicit
 * rather than something to remember to re-apply by hand after a prebuild.
 *
 * Registered after "@bacons/apple-targets" so the widget target gets it too.
 */
module.exports = function withFreeSigning(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(buildConfigs)) {
      const entry = buildConfigs[key];
      // Skip the `<id>_comment` string entries; real entries have buildSettings.
      if (!entry || !entry.buildSettings) continue;
      // Only touch targets that actually sign — the Pods/project-level configs
      // have no product to sign.
      if (!entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) continue;

      entry.buildSettings.CODE_SIGN_STYLE = 'Automatic';
      entry.buildSettings.PROVISIONING_PROFILE_SPECIFIER = '""';
    }

    return config;
  });
};
