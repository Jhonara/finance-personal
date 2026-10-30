/* global require, module, process */
/* eslint-disable @typescript-eslint/no-require-imports -- Expo config plugins run as CommonJS in Prebuild. */
const { withAndroidManifest } = require('expo/config-plugins');

const EMULATOR_QA_APIS = new Set(['http://10.0.2.2:8095/api/v1', 'http://10.0.2.2:8080/api/v1']);
const LAN_QA_API =
  /^http:\/\/(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}):8080\/api\/v1$/;

function withAndroidWidgetQaNetwork(config) {
  const endpoint = process.env.EXPO_PUBLIC_API_BASE_URL;
  const emulatorQa = EMULATOR_QA_APIS.has(endpoint);
  const physicalQa = process.env.EXPO_PUBLIC_CAPTURE_QA === 'true' && LAN_QA_API.test(endpoint ?? '');
  if (!emulatorQa && !physicalQa) return config;
  return withAndroidManifest(config, (mod) => {
    // The QA-only APK may point to a different private LAN IP at runtime.
    // Production builds retain Android's secure cleartext default.
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return mod;
  });
}

module.exports = withAndroidWidgetQaNetwork;
