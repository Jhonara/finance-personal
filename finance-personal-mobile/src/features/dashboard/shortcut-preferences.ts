import { priorityShortcuts, type HomePriority } from './home-priority';
export const homeShortcutOptions = [
  { key: 'budgets', title: 'Presupuestos', icon: 'pie-chart-outline', route: '/(app)/budgets', tone: 'info' },
  { key: 'savings', title: 'Metas', icon: 'flag-outline', route: '/(app)/savings', tone: 'success' },
  { key: 'credits', title: 'Créditos', icon: 'card-outline', route: '/(app)/credits', tone: 'credit' },
  { key: 'reports', title: 'Reportes', icon: 'stats-chart-outline', route: '/(app)/reports', tone: 'info' },
  { key: 'inbox', title: 'Por revisar', icon: 'file-tray-outline', route: '/(app)/inbox', tone: 'warning' },
  {
    key: 'recurrences',
    title: 'Pagos fijos',
    icon: 'repeat-outline',
    route: '/(app)/recurrences',
    tone: 'success',
  },
  {
    key: 'categories',
    title: 'Categorías',
    icon: 'pricetags-outline',
    route: '/(app)/categories',
    tone: 'accent',
  },
] as const;
export type HomeShortcutId = (typeof homeShortcutOptions)[number]['key'];
export function parseShortcutPreference(raw: string | null): HomeShortcutId[] | undefined {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    if (!Array.isArray(parsed)) return undefined;
    const keys = [
      ...new Set(
        parsed.filter((key): key is HomeShortcutId =>
          homeShortcutOptions.some((option) => option.key === key),
        ),
      ),
    ].slice(0, 4);
    return keys.length ? keys : undefined;
  } catch {
    return undefined;
  }
}
export const shortcutPreferenceKey = (userId: number) => `finance-home-shortcuts-v1.${userId}`;
export function defaultShortcuts(priority: HomePriority): HomeShortcutId[] {
  return [...priorityShortcuts[priority]];
}
