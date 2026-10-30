export type HomeWidgetSnapshot = Record<
  'ownerId' | 'month' | 'currency' | 'balance' | 'income' | 'expense' | 'monthlyAvailable' | 'updatedAt',
  string
>;

export type HomeWidgetBridge = {
  available: boolean;
  setSnapshot(snapshot: HomeWidgetSnapshot): void;
  setVisible(visible: boolean): void;
  getVisible(): boolean;
  setAppHidden(hidden: boolean): void;
  markOffline(): void;
  clear(): void;
};
