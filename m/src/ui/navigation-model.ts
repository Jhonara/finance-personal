export const dockItems = [
  { name: 'index', label: 'Inicio', accessibilityLabel: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
  {
    name: 'transactions',
    label: 'Movimientos',
    accessibilityLabel: 'Movimientos',
    icon: 'swap-horizontal-outline',
    activeIcon: 'swap-horizontal',
  },
  {
    name: 'action',
    label: 'Nuevo',
    accessibilityLabel: 'Registrar movimiento',
    icon: 'add',
    activeIcon: 'add',
  },
  {
    name: 'accounts',
    label: 'Cuentas',
    accessibilityLabel: 'Cuentas',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
  },
  {
    name: 'plan',
    label: 'Menú',
    accessibilityLabel: 'Menú: reportes y herramientas',
    icon: 'grid-outline',
    activeIcon: 'grid',
  },
] as const;
export function dockIndex(route: string) {
  if (route === 'more') return -1;
  if (route === 'index' || route === 'guide') return 0;
  if (
    route === 'transactions' ||
    route === 'inbox' ||
    route === 'shortcuts' ||
    route === 'purchase-review' ||
    route === 'report-transactions' ||
    route.startsWith('new-')
  )
    return 1;
  if (route.startsWith('account') || route === 'recurrences' || route === 'recurring-form') return 3;
  return 4;
}
