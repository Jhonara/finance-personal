/* global require, module, process */
/* eslint-disable @typescript-eslint/no-require-imports -- Expo config plugins run as CommonJS in Prebuild. */
const { withAndroidManifest } = require('expo/config-plugins');

const QA_API = 'http://10.0.2.2:8095/api/v1';

function withAndroidWidgetQaNetwork(config) {
  if (process.env.EXPO_PUBLIC_API_BASE_URL !== QA_API) return config;
  return withAndroidManifest(config, (mod) => {
    // Android 9+ blocks plain HTTP in release APKs. Only the isolated emulator
    // fixture uses it; normal builds retain the platform's secure default.
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return mod;
  });
}

module.exports = withAndroidWidgetQaNetwork;
