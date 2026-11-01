import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { AppAlert } from '@/feedback/app-alert';
import { ApiError } from '@/api/errors';
import { useChangeBudgetState } from '@/features/secondary/use-secondary';
import type { Budget } from '@/features/secondary/secondary-api';
import { Button } from '@/ui/primitives';
import { typography } from '@/theme';

export function BudgetLifecycle({ budget }: { budget: Budget }) {
  const mutation = useChangeBudgetState();
  const locked = useRef(false);
  const [error, setError] = useState('');
  const inactive = budget.active === false;
  return (
    <View style={{ gap: 10 }}>
      {inactive && (
        <Text style={typography.bodySecondary}>
          Presupuesto desactivado. Su límite anterior sigue guardado. Sus gastos permanecen en los reportes y
          pueden figurar sin presupuesto.
        </Text>
      )}
      <Button
        variant="outline"
        tone={inactive ? 'primary' : 'danger'}
        disabled={mutation.isPending || budget.version === undefined}
        loading={mutation.isPending}
        onPress={() => {
          if (locked.current) return;
          AppAlert.alert(
            inactive ? 'Reactivar presupuesto' : 'Desactivar presupuesto',
            inactive
              ? 'Se recuperará este límite para su mismo mes y categoría.'
              : 'Se quitará este límite del plan activo. Se conservarán la categoría, sus gastos y el límite anterior. Los presupuestos de sus subcategorías seguirán activos.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Confirmar',
                style: inactive ? 'default' : 'destructive',
                onPress: () => {
                  if (locked.current) return;
                  locked.current = true;
                  setError('');
                  void mutation
                    .mutateAsync({ id: budget.id!, version: budget.version!, active: inactive })
                    .catch((failure) =>
                      setError(
                        failure instanceof ApiError && failure.status
                          ? failure.message
                          : 'No pudimos confirmar el cambio. Actualiza el presupuesto antes de reintentar.',
                      ),
                    )
                    .finally(() => {
                      locked.current = false;
                    });
                },
              },
            ],
          );
        }}
      >
        {inactive ? 'Reactivar presupuesto' : 'Desactivar presupuesto'}
      </Button>
      {error !== '' && (
        <Text accessibilityRole="alert" style={typography.bodySecondary}>
          {error}
        </Text>
      )}
    </View>
  );
}
