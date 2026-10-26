/* global require, module */
/* eslint-disable @typescript-eslint/no-require-imports -- Expo config plugins run as CommonJS in Prebuild. */
const {
  withAndroidManifest,
  withDangerousMod,
  withGradleProperties,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const shortcuts = [
  { id: 'expense', label: 'Registrar gasto', path: 'M5,11h14v2H5z' },
  { id: 'income', label: 'Registrar ingreso', path: 'M11,5h2v6h6v2h-6v6h-2v-6H5v-2h6z' },
  {
    id: 'transfer',
    label: 'Transferir dinero',
    path: 'M4,7h12l-3,-3 1.4,-1.4L20.8,9H4z M20,17H8l3,3 -1.4,1.4L3.2,15H20z',
  },
  { id: 'balance', label: 'Consultar saldo', path: 'M3,5h18v14H3z M5,7v10h14V7z M15,10h3v4h-3z' },
];

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function shortcutResources(packageName) {
  if (!/^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$/.test(packageName ?? '')) {
    throw new Error('Android launcher shortcuts require a valid android.package.');
  }
  const files = {
    'xml/finance_shortcuts.xml': `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${shortcuts
  .map(
    ({ id }) => `  <shortcut android:shortcutId="finance_${id}" android:enabled="true"
    android:icon="@drawable/finance_shortcut_${id}" android:shortcutShortLabel="@string/finance_shortcut_${id}"
    android:shortcutLongLabel="@string/finance_shortcut_${id}">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="${packageName}"
      android:targetClass="${packageName}.MainActivity"
      android:data="financepersonalmobile:///android-shortcut?action=${id}" />
  </shortcut>`,
  )
  .join('\n')}
</shortcuts>
`,
    'values/finance_shortcuts.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
${shortcuts.map(({ id, label }) => `  <string name="finance_shortcut_${id}">${escapeXml(label)}</string>`).join('\n')}
</resources>
`,
  };
  for (const shortcut of shortcuts) {
    files[`drawable/finance_shortcut_${shortcut.id}.xml`] = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="48dp" android:height="48dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#0D414C" android:pathData="${escapeXml(shortcut.path)}" />
</vector>
`;
  }
  return files;
}

function registerShortcutMetadata(manifest) {
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  const existing = activity['meta-data'] ?? [];
  const otherDefinition = existing.find((item) => item.$['android:name'] === 'android.app.shortcuts');
  if (otherDefinition && otherDefinition.$['android:resource'] !== '@xml/finance_shortcuts') {
    throw new Error('Another plugin already defines android.app.shortcuts. Merge definitions explicitly.');
  }
  activity['meta-data'] = [
    ...existing.filter((item) => item.$['android:name'] !== 'android.app.shortcuts'),
    { $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/finance_shortcuts' } },
  ];
  return manifest;
}

function withAndroidLauncherShortcuts(config) {
  // Android-only mods: iOS App Intents and its native sources are untouched.
  // SDK 58 Gradle serializes watched Swift-only directories as `[app-intents]`, which the
  // Android autolinker cannot parse as JSON. There are no Kotlin inline modules to mirror.
  config = withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.map((item) =>
      item.type === 'property' && item.key === 'expo.inlineModules.watchedDirectories'
        ? { ...item, value: '[]' }
        : item,
    );
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    mod.modResults = registerShortcutMetadata(mod.modResults);
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const resources = shortcutResources(mod.android?.package);
      for (const [relativePath, contents] of Object.entries(resources)) {
        const file = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res', relativePath);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, contents, 'utf8');
      }
      return mod;
    },
  ]);
}

module.exports = withAndroidLauncherShortcuts;
module.exports.shortcutResources = shortcutResources;
module.exports.registerShortcutMetadata = registerShortcutMetadata;
