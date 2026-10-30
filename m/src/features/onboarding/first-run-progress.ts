export type SetupStepId = 'account' | 'openingBalance' | 'movement' | 'budget';

export type SetupStep = {
  id: SetupStepId;
  title: string;
  description: string;
  completed: boolean;
  resolutionLabel?: 'Inicio sin saldo inicial';
  actionLabel?: string;
};

type TransactionSignal = { type?: string; status?: string };

export function createSetupSteps({
  accountCount,
  budgetCount,
  openingBalanceRegistered,
  firstMovementRegistered,
  recentTransactions,
}: {
  accountCount: number;
  budgetCount: number;
  openingBalanceRegistered: boolean;
  firstMovementRegistered?: boolean;
  recentTransactions: TransactionSignal[];
}): SetupStep[] {
  const hasAccount = accountCount > 0;
  const hasMovement =
    firstMovementRegistered ??
    recentTransactions.some(
      (transaction) =>
        transaction.status === 'POSTED' &&
        (transaction.type === 'INCOME' || transaction.type === 'EXPENSE' || transaction.type === 'TRANSFER'),
    );
  const openingBalanceSkipped = hasMovement && !openingBalanceRegistered;
  return [
    {
      id: 'account',
      title: 'Crea tu primera cuenta',
      description: 'Define dónde manejas tu dinero.',
      completed: hasAccount,
      actionLabel: hasAccount ? undefined : 'Crear cuenta',
    },
    {
      id: 'openingBalance',
      title: openingBalanceSkipped
        ? 'Inicio sin saldo inicial'
        : openingBalanceRegistered
          ? 'Saldo inicial registrado'
          : 'Registra tu saldo inicial',
      description: openingBalanceSkipped
        ? 'Continuaste directamente con tus movimientos.'
        : hasAccount
          ? 'Añade el dinero con el que empiezas hoy.'
          : 'Disponible cuando crees una cuenta.',
      completed: openingBalanceRegistered || openingBalanceSkipped,
      resolutionLabel: openingBalanceSkipped ? 'Inicio sin saldo inicial' : undefined,
      actionLabel: hasAccount && !openingBalanceRegistered && !hasMovement ? 'Registrar saldo' : undefined,
    },
    {
      id: 'movement',
      title: 'Registra tu primer movimiento',
      description: hasAccount
        ? 'Anota un ingreso, gasto o transferencia.'
        : 'Disponible cuando crees una cuenta.',
      completed: hasMovement,
      actionLabel: hasAccount && !hasMovement ? 'Registrar movimiento' : undefined,
    },
    {
      id: 'budget',
      title: 'Crea tu primer presupuesto',
      description: 'Define un límite para una categoría de gasto.',
      completed: budgetCount > 0,
      actionLabel: budgetCount > 0 ? undefined : 'Crear presupuesto',
    },
  ];
}

export function setupProgress(steps: SetupStep[]) {
  const completed = steps.filter((step) => step.completed).length;
  return {
    completed,
    total: steps.length,
    isComplete: completed === steps.length,
    recommended: steps.find((step) => !step.completed)?.id,
  };
}
