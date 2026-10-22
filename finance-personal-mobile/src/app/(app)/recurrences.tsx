import { useCallback, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  useRecurringActions,
  useRecurringAgenda,
  useRecurringRules,
} from '@/features/recurrences/use-recurrences';
import { recurrenceError, scheduleLabel } from '@/features/recurrences/recurrence-presentation';
import type { RecurringEntry, RecurringRule } from '@/features/recurrences/recurrence-api';
import { openForm } from '@/features/forms/form-session';
import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { useCredits } from '@/features/secondary/use-secondary';
import type { Credit } from '@/features/secondary/secondary-api';
import { CreditPaymentForm } from '@/features/credits/credit-payment-form';
import { creditMoney } from '@/features/credits/credit-presentation';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { Button, Card, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { Disclosure } from '@/ui/disclosure';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { FinancialDateField } from '@/ui/financial-date-field';
import { MotionModal } from '@/ui/motion-modal';
import { formatLocalDate, localDateFromNative } from '@/utils/local-date';
import { colors, spacing, typography } from '@/theme';

export default function RecurrencesScreen() {
  const [tab, setTab] = useState<'agenda' | 'rules'>('agenda');
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const rules = useRecurringRules();
  const agenda = useRecurringAgenda(period.year, period.month);
  const credits = useCredits();
  const actions = useRecurringActions();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const [entry, setEntry] = useState<RecurringEntry>();
  const [credit, setCredit] = useState<Credit>();
  const changing = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void rules.refetch();
      void agenda.refetch();
      void credits.refetch();
      // Queries retain data; revisit refreshes executions that happened while the app was away.
    }, [rules.refetch, agenda.refetch, credits.refetch]),
  );
  const refresh = () => {
    void rules.refetch();
    void agenda.refetch();
    void credits.refetch();
  };
  const entries = agenda.data?.entries ?? [];
  const pending = entries.filter((item) => item.status === 'PENDING');
  const planned = entries.filter((item) => item.status === 'PLANNED');
  const history = entries.filter((item) => ['POSTED', 'SKIPPED', 'REVERSED'].includes(item.status));
  const toggle = (rule: RecurringRule) => {
    if (changing.current) return;
    const run = async () => {
      if (changing.current) return;
      changing.current = true;
      try {
        await actions.active.mutateAsync({ id: rule.id, active: !rule.active, version: rule.version });
        feedback.show(rule.active ? 'Programación pausada.' : 'Programación reanudada desde hoy.', 'success');
      } catch (error) {
        feedback.show(recurrenceError(error), 'error');
      } finally {
        changing.current = false;
      }
    };
    Alert.alert(
      rule.active ? '¿Pausar esta programación?' : '¿Reanudar desde hoy?',
      rule.active
        ? 'Se detienen las próximas fechas. Los pagos ya pendientes o registrados se conservan.'
        : 'Se retoma la siguiente fecha disponible. No se crean pagos por el tiempo que estuvo pausada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: rule.active ? 'Pausar' : 'Reanudar', onPress: () => void run() },
      ],
    );
  };
  return (
    <Screen entry scroll refreshing={rules.isRefetching || agenda.isRefetching} onRefresh={refresh}>
      <ScreenHeader
        title="Ingresos y gastos fijos"
        subtitle="Tu salario, servicios y cuotas, en orden."
        back
        backFallback="/(app)/accounts"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          onPress={() => openForm('/(app)/recurring-form', { type: 'INCOME' })}
        >
          + Ingreso fijo
        </Button>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          onPress={() => openForm('/(app)/recurring-form', { type: 'EXPENSE' })}
        >
          + Gasto fijo
        </Button>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          style={{ flex: 1 }}
          variant={tab === 'agenda' ? 'primary' : 'secondary'}
          onPress={() => setTab('agenda')}
        >
          Agenda
        </Button>
        <Button
          style={{ flex: 1 }}
          variant={tab === 'rules' ? 'primary' : 'secondary'}
          onPress={() => setTab('rules')}
        >
          Programaciones
        </Button>
      </View>
      {tab === 'agenda' ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Button
              size="compact"
              variant="ghost"
              accessibilityLabel="Mes anterior"
              disabled={period.year <= 2000 && period.month === 1}
              onPress={() => setPeriod(shiftDashboardPeriod(period, -1))}
            >
              ‹
            </Button>
            <Text style={{ ...typography.label, flex: 1, textAlign: 'center' }}>
              {formatDashboardPeriod(period)}
            </Text>
            <Button
              size="compact"
              variant="ghost"
              accessibilityLabel="Mes siguiente"
              disabled={period.year >= 2100 && period.month === 12}
              onPress={() => setPeriod(shiftDashboardPeriod(period, 1))}
            >
              ›
            </Button>
          </View>
          <Text style={typography.caption}>
            Lo previsto no cambia tu saldo. Solo cuentan los movimientos registrados.
          </Text>
          {agenda.isPending ? (
            <SkeletonRow />
          ) : agenda.isError ? (
            <ErrorState onRetry={() => void agenda.refetch()} />
          ) : (
            <>
              {pending.length > 0 && (
                <View style={{ gap: spacing.md }}>
                  <Text style={typography.sectionTitle}>Pendientes · {pending.length}</Text>
                  <Text style={typography.caption}>Incluye pendientes de meses anteriores.</Text>
                  {pending.map((item) => (
                    <EntryCard
                      key={`${item.ruleId}-${item.dueDate}`}
                      entry={item}
                      hidden={hidden}
                      onConfirm={() => setEntry(item)}
                    />
                  ))}
                </View>
              )}
              {planned.length > 0 && (
                <View style={{ gap: spacing.md }}>
                  <Text style={typography.sectionTitle}>Próximos del mes</Text>
                  {planned.map((item) => (
                    <EntryCard key={`${item.ruleId}-${item.dueDate}`} entry={item} hidden={hidden} />
                  ))}
                </View>
              )}
              {!entries.length && (
                <EmptyState
                  title="Sin pagos programados este mes"
                  description="Añade un ingreso fijo o un servicio para ver sus próximas fechas aquí."
                />
              )}
              {history.length > 0 && (
                <Disclosure title={`Historial del mes · ${history.length}`} icon="receipt-outline">
                  {history.map((item) => (
                    <EntryCard key={`${item.ruleId}-${item.dueDate}`} entry={item} hidden={hidden} />
                  ))}
                </Disclosure>
              )}
            </>
          )}
          <Disclosure title="Próximas cuotas de tus créditos" icon="card-outline">
            <Text style={typography.caption}>
              Son las próximas cuotas actuales, independientes del mes de la agenda. Registra cada pago aquí
              para actualizar también la deuda; no crees otro gasto fijo para la misma cuota.
            </Text>
            {credits.isPending ? (
              <SkeletonRow />
            ) : credits.isError ? (
              <ErrorState onRetry={() => void credits.refetch()} />
            ) : !(credits.data ?? []).some((c) => c.status !== 'PAID') ? (
              <Text style={typography.bodySecondary}>No tienes créditos pendientes.</Text>
            ) : (
              (credits.data ?? [])
                .filter((c) => c.status !== 'PAID')
                .map((item) => (
                  <Card key={item.id} tone="info" style={{ padding: spacing.lg, gap: spacing.md }}>
                    <Text style={typography.cardTitle}>{item.name}</Text>
                    <Text style={typography.bodySecondary}>
                      {item.nextPaymentDate
                        ? formatLocalDate(item.nextPaymentDate)
                        : 'Consulta la fecha en el crédito'}
                    </Text>
                    <Text style={typography.moneySmall}>
                      {creditMoney(item.expectedPaymentAmount, item.currency, hidden)}
                    </Text>
                    {item.status === 'LATE' && (
                      <Text style={{ ...typography.caption, color: colors.warning }}>
                        Hay pagos del calendario por revisar.
                      </Text>
                    )}
                    <Button variant="secondary" onPress={() => setCredit(item)}>
                      Registrar pago de crédito
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      onPress={() =>
                        router.push({ pathname: '/(app)/credit-detail', params: { id: item.id } })
                      }
                    >
                      Ver crédito y pagos
                    </Button>
                  </Card>
                ))
            )}
          </Disclosure>
        </>
      ) : rules.isPending ? (
        <SkeletonRow />
      ) : rules.isError ? (
        <ErrorState onRetry={() => void rules.refetch()} />
      ) : !rules.data?.length ? (
        <EmptyState
          title="Configúralo una vez"
          description="Empieza por tu salario o un servicio. Elige su cuenta, frecuencia y cómo registrarlo."
        />
      ) : (
        rules.data.map((rule) => (
          <Card key={rule.id} style={{ padding: spacing.lg, gap: spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text style={{ ...typography.cardTitle, flex: 1 }}>{rule.name}</Text>
              <Text style={typography.caption}>{rule.active ? 'Activa' : 'Pausada / finalizada'}</Text>
            </View>
            <Text style={typography.moneySmall}>
              {formatPrivateMoney(rule.amount, rule.currency, hidden)}
            </Text>
            <Text style={typography.bodySecondary}>
              {scheduleLabel(rule)} · {rule.accountName}
            </Text>
            <Text style={typography.caption}>
              {rule.mode === 'AUTOMATIC' ? 'Registro automático' : 'Confirmar cada pago'}
              {rule.active ? ` · Próximo: ${formatLocalDate(rule.nextDate)}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                variant="outline"
                size="compact"
                style={{ flex: 1 }}
                onPress={() => openForm('/(app)/recurring-form', { id: String(rule.id), type: rule.kind })}
              >
                Editar
              </Button>
              <Button
                variant="outline"
                size="compact"
                style={{ flex: 1 }}
                disabled={actions.active.isPending}
                onPress={() => toggle(rule)}
              >
                {rule.active ? 'Pausar' : 'Reanudar'}
              </Button>
            </View>
          </Card>
        ))
      )}
      <Disclosure title="Cómo funciona" icon="help-circle-outline">
        <Text style={typography.bodySecondary}>
          Automático: anota el ingreso o gasto en su fecha. Confirmación: espera a que indiques que ocurrió y
          te deja ajustar el importe.
        </Text>
        <Text style={typography.caption}>
          No se conecta a tu banco ni realiza cobros. Evita registrar manualmente lo que ya aparece en el
          historial. Si ya anotaste un pendiente por otra vía, usa «Omitir este pago».
        </Text>
      </Disclosure>
      {entry && (
        <ConfirmEntry
          key={`${entry.ruleId}-${entry.dueDate}`}
          entry={entry}
          onClose={() => setEntry(undefined)}
        />
      )}
      {credit && (
        <CreditPaymentForm
          credit={credit}
          visible
          onClose={() => setCredit(undefined)}
          onSaved={() => {
            setCredit(undefined);
            refresh();
          }}
          onReview={() => {
            setCredit(undefined);
            router.push({ pathname: '/(app)/credit-detail', params: { id: credit.id } });
          }}
        />
      )}
    </Screen>
  );
}

function EntryCard({
  entry,
  hidden,
  onConfirm,
}: {
  entry: RecurringEntry;
  hidden: boolean;
  onConfirm?: () => void;
}) {
  const awaitingAutomatic = entry.status === 'PENDING' && entry.mode === 'AUTOMATIC' && entry.id === null;
  const status = {
    PLANNED: 'Previsto',
    PENDING: 'Por confirmar',
    POSTED: 'Registrado',
    SKIPPED: 'Omitido',
    REVERSED: 'Revertido',
  }[entry.status];
  return (
    <Card
      tone={entry.status === 'PENDING' ? 'warning' : 'default'}
      style={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text style={typography.cardTitle}>{entry.name}</Text>
      <Text style={typography.caption}>
        {entry.kind === 'INCOME' ? 'Ingreso' : 'Gasto'} · {formatLocalDate(entry.dueDate)} ·{' '}
        {awaitingAutomatic ? 'En proceso' : status}
      </Text>
      <Text
        style={{
          ...typography.moneySmall,
          color: entry.kind === 'INCOME' ? colors.success : colors.textPrimary,
        }}
      >
        {formatPrivateMoney(entry.amount, entry.currency, hidden)}
      </Text>
      <Text style={typography.caption}>
        {entry.accountName}
        {entry.status === 'PLANNED'
          ? ` · ${entry.mode === 'AUTOMATIC' ? 'Automático al llegar el día' : 'Requiere confirmación'}`
          : ''}
      </Text>
      {entry.issue && <Text style={typography.bodySecondary}>{entry.issue}</Text>}
      {entry.recordedDate && (
        <Text style={typography.caption}>
          Registrado el {formatLocalDate(entry.recordedDate)} · Movimiento #{entry.transactionId}
        </Text>
      )}
      {awaitingAutomatic && (
        <Text style={typography.caption}>
          Se registrará automáticamente. La agenda se actualiza cada minuto.
        </Text>
      )}
      {onConfirm && !awaitingAutomatic && (
        <Button variant="secondary" onPress={onConfirm}>
          {entry.kind === 'INCOME' ? 'Confirmar ingreso' : 'Confirmar pago'}
        </Button>
      )}
    </Card>
  );
}

function ConfirmEntry({ entry, onClose }: { entry: RecurringEntry; onClose(): void }) {
  const [amount, setAmount] = useState(String(entry.amount));
  const [date, setDate] = useState(localDateFromNative(new Date()));
  const [error, setError] = useState('');
  const actions = useRecurringActions();
  const feedback = useFeedback();
  const submitting = useRef(false);
  const busy = actions.confirm.isPending || actions.skip.isPending;
  const act = async (skip = false) => {
    if (submitting.current) return;
    if (!skip && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      setError('Ingresa un importe mayor que cero.');
      return;
    }
    if (!skip && (date < entry.dueDate || date > localDateFromNative(new Date()))) {
      setError('Usa una fecha entre el día programado y hoy.');
      return;
    }
    submitting.current = true;
    try {
      if (skip) await actions.skip.mutateAsync(entry);
      else await actions.confirm.mutateAsync({ entry, amount: Number(amount), date });
      feedback.show(
        skip ? 'Se omitió este pago. La programación continúa.' : 'Movimiento registrado.',
        'success',
      );
      onClose();
    } catch (failure) {
      setError(recurrenceError(failure));
    } finally {
      submitting.current = false;
    }
  };
  return (
    <MotionModal
      visible
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <Screen scroll keyboard>
        <ScreenHeader
          title={entry.kind === 'INCOME' ? 'Confirmar ingreso' : 'Confirmar pago'}
          subtitle={entry.name}
          back
          onBack={() => {
            if (!busy) onClose();
          }}
        />
        <Text style={typography.bodySecondary}>
          Confirma únicamente si ya ocurrió. Se registrará en {entry.accountName}.
        </Text>
        <MoneyInput
          label="Importe real"
          currency={entry.currency}
          value={amount}
          onChangeText={setAmount}
          disabled={busy}
        />
        <FinancialDateField
          label="Fecha real"
          value={date}
          onChange={setDate}
          maximumDate={localDateFromNative(new Date())}
        />
        {error && (
          <Text accessibilityLiveRegion="polite" style={{ ...typography.body, color: colors.danger }}>
            {error}
          </Text>
        )}
        <Button loading={busy} disabled={busy} onPress={() => void act()}>
          Registrar movimiento
        </Button>
        <Disclosure title="Ya lo registré por otra vía o no ocurrió">
          <Text style={typography.caption}>Omitir no mueve dinero ni cancela las siguientes fechas.</Text>
          <Button
            variant="outline"
            disabled={busy}
            onPress={() =>
              Alert.alert('¿Omitir este pago?', 'Se conservará como omitido, sin modificar saldos.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Omitir', onPress: () => void act(true) },
              ])
            }
          >
            Omitir este pago
          </Button>
        </Disclosure>
      </Screen>
    </MotionModal>
  );
}
