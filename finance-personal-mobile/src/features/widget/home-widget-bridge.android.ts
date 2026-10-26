import { requireOptionalNativeModule } from 'expo';
import type { HomeWidgetBridge, HomeWidgetSnapshot } from './home-widget-types';

type NativeHomeWidget = {
  setSnapshot(snapshot: HomeWidgetSnapshot): void;
  setVisible(visible: boolean): void;
  getVisible(): boolean;
  setAppHidden(hidden: boolean): void;
  markOffline(): void;
  clear(): void;
};

const native = requireOptionalNativeModule<NativeHomeWidget>('FinanceHomeWidget');

/** Expo Go remains usable, while the development build loads the native module. */
export const homeWidgetBridge: HomeWidgetBridge = {
  available: native !== null,
  setSnapshot(snapshot) {
    native?.setSnapshot(snapshot);
  },
  setVisible(visible) {
    native?.setVisible(visible);
  },
  getVisible() {
    return native?.getVisible() ?? false;
  },
  setAppHidden(hidden) {
    native?.setAppHidden(hidden);
  },
  markOffline() {
    native?.markOffline();
  },
  clear() {
    native?.clear();
  },
};
