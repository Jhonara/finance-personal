export const tourSteps = [
  {
    id: 'home',
    route: '/(app)',
    path: '/',
    title: 'Tu punto de partida',
    copy: 'Estos accesos te llevan a la ayuda, tus créditos y tu plan. Vamos a recorrer la app sin crear operaciones.',
    target: 'home-shortcuts',
    icon: 'compass-outline',
  },
  {
    id: 'accounts',
    route: '/(app)/accounts',
    path: '/accounts',
    title: '1. Crea una cuenta',
    copy: 'Toca Añadir para registrar tu banco, billetera o efectivo. Después abre la cuenta y registra tu saldo inicial.',
    target: 'add-account',
    icon: 'wallet-outline',
  },
  {
    id: 'categories',
    route: '/(app)/categories',
    path: '/categories',
    title: '2. Organiza tus categorías',
    copy: 'Elige Gastos o Ingresos y crea una categoría. Alimentación, transporte o nómina: usa nombres que reconozcas.',
    target: 'add-category',
    icon: 'pricetags-outline',
  },
  {
    id: 'movements',
    route: '/(app)/transactions',
    path: '/transactions',
    title: '3. Registra lo que pasó',
    copy: 'El botón + abre gasto, ingreso y transferencia. Cada ingreso o gasto necesita una cuenta y una categoría.',
    target: 'new-movement',
    icon: 'swap-vertical-outline',
  },
  {
    id: 'history',
    route: '/(app)/transactions',
    path: '/transactions',
    title: '4. Encuentra un movimiento',
    copy: 'Usa Filtros para buscar por fecha, cuenta o tipo. Abre un registro para consultar sus detalles.',
    target: 'movement-filters',
    icon: 'filter-outline',
  },
  {
    id: 'plan',
    route: '/(app)/plan',
    path: '/plan',
    title: '5. Dale un propósito',
    copy: 'Aquí se reúnen tus préstamos, presupuestos y metas. La tarjeta destacada abre tus créditos y sus pagos.',
    target: 'plan-credits',
    icon: 'grid-outline',
  },
  {
    id: 'budgets',
    route: '/(app)/budgets',
    path: '/budgets',
    title: '6. Pon un límite mensual',
    copy: 'Crea un presupuesto para una categoría. Sus gastos consumirán el límite; crearlo no retira dinero.',
    target: 'add-budget',
    icon: 'pie-chart-outline',
  },
  {
    id: 'savings',
    route: '/(app)/savings',
    path: '/savings',
    title: '7. Ahorra con un objetivo',
    copy: 'Crea una meta y registra tus aportes reales. Una cuenta dice dónde está el dinero; la meta, para qué lo separas.',
    target: 'add-saving',
    icon: 'flag-outline',
  },
  {
    id: 'credits',
    route: '/(app)/credits',
    path: '/credits',
    title: '8. Registra tu préstamo',
    copy: 'Usa + Nuevo. Si ya lo venías pagando, copia el saldo y la fecha de corte de tu extracto para empezar desde ahí.',
    target: 'add-credit',
    icon: 'card-outline',
  },
  {
    id: 'amortization',
    route: '/(app)/credits',
    path: '/credits',
    title: '9. Descubre tus abonos',
    copy: 'Abre uno de tus créditos y elige Ver amortización. Allí puedes probar varios abonos, terminar antes o bajar la cuota. Simular no realiza pagos.',
    target: 'credit-list',
    icon: 'calculator-outline',
  },
  {
    id: 'alerts',
    route: '/(app)/alerts',
    path: '/alerts',
    title: '10. Revisa tus avisos',
    copy: 'Cada aviso explica qué revisar. Si no aparecen alertas, puedes continuar: no hace falta crear datos para terminar el recorrido.',
    target: 'alerts-heading',
    icon: 'notifications-outline',
  },
  {
    id: 'profile',
    route: '/(app)/more',
    path: '/more',
    title: 'Todo listo para explorar',
    copy: 'Aquí conservas la guía para consultar, el tutorial para repetir y tus categorías. Empieza por una cuenta y registra solo tus operaciones reales.',
    target: 'profile-guide',
    icon: 'shield-checkmark-outline',
  },
] as const;
export type TourProgress = { step: number; done: boolean };
export const tourKey = (userId: number) => `finance-interactive-tour-v1.${userId}`;
export function parseTourProgress(raw: string | null): TourProgress {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value && Number.isInteger(value.step) && value.step >= 0 && value.step < tourSteps.length)
      return { step: value.step, done: value.done === true };
  } catch {
    /* A damaged reading preference must not affect financial data. */
  }
  return { step: 0, done: false };
}
