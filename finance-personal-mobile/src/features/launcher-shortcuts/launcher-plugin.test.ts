/// <reference types="node" />
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
type ManifestNode = { $: Record<string, string> };
type Manifest = {
  manifest: {
    $: Record<string, string>;
    application: Array<
      ManifestNode & {
        activity: Array<
          ManifestNode & {
            'intent-filter': Array<{ action: ManifestNode[]; category: ManifestNode[] }>;
            'meta-data': ManifestNode[];
          }
        >;
      }
    >;
  };
};
const require = createRequire(import.meta.url);
const plugin = require('../../../plugins/with-android-launcher-shortcuts.cjs') as {
  shortcutResources(packageName: string): Record<string, string>;
  registerShortcutMetadata(manifest: Manifest): Manifest;
};
const manifest = (): Manifest => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    application: [
      {
        $: { 'android:name': '.MainApplication' },
        activity: [
          {
            $: { 'android:name': '.MainActivity' },
            'intent-filter': [
              {
                action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
              },
            ],
            'meta-data': [{ $: { 'android:name': 'preserve.me', 'android:value': 'true' } }],
          },
        ],
      },
    ],
  },
});
describe('Prebuild launcher shortcut resources', () => {
  it('publishes exactly four explicit, navigation-only intents and their resources', () => {
    const files = plugin.shortcutResources('com.jr.financepersonal');
    const xml = files['xml/finance_shortcuts.xml']!;
    expect(xml.match(/<shortcut /g)).toHaveLength(4);
    for (const id of ['expense', 'income', 'transfer', 'balance']) {
      expect(xml).toContain(`android-shortcut?action=${id}`);
      expect(files[`drawable/finance_shortcut_${id}.xml`]).toContain('<vector');
      expect(files['values/finance_shortcuts.xml']).toContain(`name="finance_shortcut_${id}"`);
    }
    expect(xml.match(/android:targetClass="com.jr.financepersonal.MainActivity"/g)).toHaveLength(4);
    expect(xml).not.toMatch(/token|amount|accountId|password/);
    expect(() => plugin.shortcutResources('bad"package')).toThrow();
  });
  it('regenerates without duplicate metadata and preserves unrelated manifest entries', () => {
    const first = plugin.registerShortcutMetadata(manifest());
    const snapshot = JSON.stringify(first);
    expect(JSON.stringify(plugin.registerShortcutMetadata(first))).toBe(snapshot);
    expect(snapshot).toContain('preserve.me');
    expect(snapshot.match(/android.app.shortcuts/g)).toHaveLength(1);
    expect(plugin.shortcutResources('com.jr.financepersonal')).toEqual(
      plugin.shortcutResources('com.jr.financepersonal'),
    );
  });
  it('fails visibly instead of replacing another shortcut provider', () => {
    const input = manifest();
    input.manifest.application![0]!.activity![0]!['meta-data']!.push({
      $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/other' },
    });
    expect(() => plugin.registerShortcutMetadata(input)).toThrow(/Another plugin/);
  });
});
