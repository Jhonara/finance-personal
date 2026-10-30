import type { HomeWidgetBridge } from './home-widget-types';

/** Non-Android platforms and Vitest never load an Android native module. */
export const homeWidgetBridge: HomeWidgetBridge = {
  available: false,
  setSnapshot() {},
  setVisible() {},
  getVisible() {
    return false;
  },
  setAppHidden() {},
  markOffline() {},
  clear() {},
};
