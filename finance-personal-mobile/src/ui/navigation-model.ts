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
    label: 'Plan',
    accessibilityLabel: 'Plan: créditos, ahorros y presupuestos',
    icon: 'grid-outline',
    activeIcon: 'grid',
  },
] as const;
export function dockIndex(route: string) {
  if (route === 'index' || route === 'guide') return 0;
  if (route === 'transactions' || route.startsWith('new-')) return 1;
  if (route.startsWith('account')) return 3;
  return 4;
}
