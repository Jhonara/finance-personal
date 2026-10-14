import { StyleSheet } from 'react-native';
import { getThemeRevision } from './index';

// Styles are evaluated when read, so existing screens pick up a saved appearance
// without duplicating every StyleSheet definition for light and dark palettes.
export function themedStyleSheet<T extends StyleSheet.NamedStyles<T>>(factory: () => T): T {
  let revision = -1;
  let styles: T;
  const current = () => {
    if (revision !== getThemeRevision()) {
      styles = StyleSheet.create(factory());
      revision = getThemeRevision();
    }
    return styles;
  };
  return new Proxy({} as T, {
    get(_target, key) {
      return Reflect.get(current(), key);
    },
    ownKeys() {
      return Reflect.ownKeys(current());
    },
    getOwnPropertyDescriptor(_target, key) {
      return Reflect.getOwnPropertyDescriptor(current(), key);
    },
  });
}
