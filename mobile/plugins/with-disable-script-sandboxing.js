const { withXcodeProject } = require('expo/config-plugins');

/**
 * Adding @bacons/apple-targets flips ENABLE_USER_SCRIPT_SANDBOXING to YES on the
 * project's build configs. That sandboxes the React Native "Bundle ... code and
 * images" build phase, so the node bundler can't write main.jsbundle into the
 * Release products dir ("Sandbox: node(...) deny file-write-create ...").
 *
 * Flip it back to NO on every build configuration. Registered AFTER
 * "@bacons/apple-targets" in app.json so this runs last and wins. Lives here
 * because ios/ is regenerated on every `expo prebuild --clean`.
 */
module.exports = function withDisableScriptSandboxing(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(buildConfigs)) {
      const entry = buildConfigs[key];
      // Skip the `<id>_comment` string entries; real entries have buildSettings.
      if (entry && entry.buildSettings) {
        entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return config;
  });
};
