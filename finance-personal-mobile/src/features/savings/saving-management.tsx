import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/api/errors';
import { AppAlert } from '@/feedback/app-alert';
import { Button, Input, MoneyInput, Screen } from '@/ui/primitives';
import { MotionModal } from '@/ui/motion-modal';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ScreenHeader } from '@/ui/headers';
import { useUnsavedForm, hasFormChanges } from '@/features/forms/use-unsaved-form';
import {
  deleteSavingGoal,
  getSavingMovements,
  setSavingStatus,
  updateSavingGoal,
  type SavingGoal,
} from '@/features/secondary/secondary-api';
import { colors, typography } from '@/theme';
import { formatLocalDate } from '@/utils/local-date';
import { savingGoalSchema } from './savings-schemas';
import { requestAmount, savingsAmount } from './savings-money';

function SavingEditor({ goal, onClose, onSaved }: { goal: SavingGoal; onClose(): void; onSaved(): void }) {
  const [version] = useState(goal.version);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const form = useForm({
    resolver: zodResolver(savingGoalSchema),
    defaultValues: {
      name: goal.name ?? '',
      description: goal.description ?? '',
      targetAmount: String(goal.targetAmount ?? ''),
      targetDate: goal.targetDate ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateSavingGoal>[1]) => updateSavingGoal(goal.id!, data),
    retry: false,
  });
  const guard = useUnsavedForm({
    dirty: hasFormChanges(form.watch(), form.formState.defaultValues),
    busy: mutation.isPending,
    onBack: onClose,
  });
  const close = () => {
    if (!busy.current) guard.request(onClose);
  };
  return (
    <MotionModal visible onRequestClose={close}>
      <Screen scroll keyboard>
        <ScreenHeader title="Editar meta" back onBack={close} />
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <Input
              label="Nombre"
              value={field.value}
              onChangeText={field.onChange}
              maxLength={100}
              disabled={mutation.isPending}
              error={form.formState.errors.name?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Input
              label="Descripción · opcional"
              value={field.value}
              onChangeText={field.onChange}
              maxLength={500}
              disabled={mutation.isPending}
              error={form.formState.errors.description?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <MoneyInput
              label="Objetivo"
              currency={goal.currency ?? ''}
              value={field.value}
              onChangeText={field.onChange}
              disabled={mutation.isPending}
              error={form.formState.errors.targetAmount?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="targetDate"
          render={({ field }) => (
            <FinancialDateField
              label="Fecha objetivo · opcional"
              value={field.value ?? ''}
              onChange={field.onChange}
              error={form.formState.errors.targetDate?.message}
            />
          )}
        />
        <Button variant="ghost" disabled={mutation.isPending} onPress={() => form.setValue('targetDate', '')}>
          Quitar fecha objetivo
        </Button>
        {error !== '' && (
          <Text accessibilityRole="alert" style={typography.bodySecondary}>
            {error}
          </Text>
        )}
        <Button
          loading={mutation.isPending}
          disabled={mutation.isPending || version === undefined}
          onPress={() => {
            if (busy.current) return;
            busy.current = true;
            void form.handleSubmit(
              async (data) => {
                try {
                  await mutation.mutateAsync({
                    name: data.name,
                    description: data.description?.trim(),
                    targetAmount: requestAmount(data.targetAmount)!,
                    targetDate: data.targetDate || undefined,
                    version: version!,
                  });
                  form.reset(data);
                  onSaved();
                } catch (failure) {
                  setError(
                    failure instanceof ApiError && failure.status
                      ? failure.message
                      : 'No pudimos confirmar el cambio. Consulta la meta antes de volver a guardar.',
                  );
                  if (failure instanceof ApiError)
                    for (const field of ['name', 'description', 'targetAmount', 'targetDate'] as const)
                      if (failure.fieldErrors[field])
                        form.setError(field, { message: failure.fieldErrors[field] });
                } finally {
                  busy.current = false;
                }
              },
              () => {
                busy.current = false;
              },
            )();
          }}
        >
          Guardar cambios
        </Button>
      </Screen>
    </MotionModal>
  );
}

export function SavingManagement({
  goal,
  hidden,
  onWithdraw,
  onDeleted,
}: {
  goal: SavingGoal;
  hidden: boolean;
  onWithdraw(): void;
  onDeleted(): void;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const history = useQuery({
    queryKey: ['savings', goal.id, 'movements'],
    queryFn: () => getSavingMovements(goal.id!),
    enabled: (showHistory || goal.currentAmount === 0) && goal.id !== undefined,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (action: 'DELETE' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'): Promise<void> => {
      if (action === 'DELETE') await deleteSavingGoal(goal.id!, goal.version!);
      else await setSavingStatus(goal.id!, action, goal.version!);
    },
    retry: false,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['savings'] }),
      client.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };
  const change = (action: 'DELETE' | 'ACTIVE' | 'CLOSED' | 'CANCELLED') => {
    if (locked.current || goal.version === undefined) return;
    AppAlert.alert(
      action === 'DELETE'
        ? 'Eliminar meta vacía'
        : action === 'ACTIVE'
          ? 'Reabrir meta'
          : action === 'CLOSED'
            ? 'Cerrar meta'
            : 'Cancelar meta',
      action === 'DELETE'
        ? 'Solo se eliminará si nunca tuvo movimientos. No se modifican tus cuentas.'
        : 'Sus aportes y retiros se conservarán. Esta acción no mueve dinero entre cuentas.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Confirmar',
          style: action === 'DELETE' || action === 'CANCELLED' ? 'destructive' : 'default',
          onPress: () => {
            if (locked.current) return;
            locked.current = true;
            setError('');
            void mutation
              .mutateAsync(action)
              .then(async () => {
                await refresh();
                if (action === 'DELETE') onDeleted();
              })
              .catch((failure) =>
                setError(
                  failure instanceof ApiError && failure.status
                    ? failure.message
                    : 'No pudimos confirmar la operación. Actualiza tus metas antes de reintentar.',
                ),
              )
              .finally(() => {
                locked.current = false;
              });
          },
        },
      ],
    );
  };
  const archived = goal.status === 'CLOSED' || goal.status === 'CANCELLED';
  return (
    <View style={{ gap: 12 }}>
      {goal.description && <Text style={typography.bodySecondary}>{goal.description}</Text>}
      {goal.targetDate && (
        <Text style={typography.bodySecondary}>Fecha objetivo · {formatLocalDate(goal.targetDate)}</Text>
      )}
      <Text style={typography.caption}>
        Los aportes y retiros anotan tu progreso. No alteran los saldos de tus cuentas ni crean ingresos o
        gastos.
      </Text>
      <Button
        variant="secondary"
        disabled={mutation.isPending || goal.version === undefined}
        onPress={() => setEditing(true)}
      >
        Editar meta
      </Button>
      {(goal.currentAmount ?? 0) > 0 && goal.currency && (
        <Button variant="outline" disabled={mutation.isPending} onPress={onWithdraw}>
          Retirar de esta meta
        </Button>
      )}
      <Button variant="secondary" onPress={() => setShowHistory((value) => !value)}>
        {showHistory ? 'Ocultar aportes y retiros' : 'Ver aportes y retiros'}
      </Button>
      {showHistory && (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Historial de la meta
          </Text>
          <Text style={typography.caption}>
            Anotaciones de dinero apartado. No son movimientos bancarios.
          </Text>
          {history.isPending && <Text style={typography.bodySecondary}>Consultando movimientos…</Text>}
          {history.isError && (
            <Button variant="secondary" onPress={() => void history.refetch()}>
              Reintentar historial
            </Button>
          )}
          {history.data?.length === 0 && (
            <Text style={typography.bodySecondary}>Aún no tiene movimientos.</Text>
          )}
          {history.data?.map((movement) => (
            <View
              key={movement.id}
              style={{
                borderLeftWidth: 2,
                borderColor: movement.type === 'WITHDRAWAL' ? colors.info : colors.success,
                paddingLeft: 12,
                paddingVertical: 5,
                gap: 4,
              }}
            >
              <Text style={typography.label}>
                {movement.type === 'WITHDRAWAL' ? 'Retiro' : 'Aporte'} ·{' '}
                {savingsAmount(movement.amount, hidden, goal.currency)}
              </Text>
              <Text style={typography.caption}>
                {formatLocalDate(movement.movementDate)}
                {movement.description ? ` · ${movement.description}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
      {error !== '' && (
        <Text accessibilityRole="alert" style={typography.bodySecondary}>
          {error}
        </Text>
      )}
      {archived ? (
        <Button
          variant="secondary"
          disabled={mutation.isPending || goal.version === undefined}
          onPress={() => change('ACTIVE')}
        >
          Reabrir meta
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            disabled={mutation.isPending || goal.version === undefined}
            onPress={() => change('CLOSED')}
          >
            Cerrar meta
          </Button>
          <Button
            variant="ghost"
            disabled={mutation.isPending || goal.version === undefined}
            onPress={() => change('CANCELLED')}
          >
            Cancelar meta
          </Button>
        </>
      )}
      {goal.currentAmount === 0 && history.isSuccess && history.data.length === 0 && (
        <Button
          variant="outline"
          tone="danger"
          disabled={mutation.isPending || goal.version === undefined}
          onPress={() => change('DELETE')}
        >
          Eliminar meta sin movimientos
        </Button>
      )}
      {editing && (
        <SavingEditor
          goal={goal}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void refresh();
          }}
        />
      )}
    </View>
  );
}
