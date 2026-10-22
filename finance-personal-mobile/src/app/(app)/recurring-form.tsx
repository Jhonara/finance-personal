import { useRef, useState } from 'react';
import { Text, View, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, type PathValue } from 'react-hook-form';
import { applyApiFieldErrors } from '@/auth/form-errors';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import { openForm, useFormSessionActive, withFormSession } from '@/features/forms/form-session';
import { useRecurringActions, useRecurringRules } from '@/features/recurrences/use-recurrences';
import {
  deviceTimeZone,
  frequencies,
  recurrenceError,
  scheduleLabel,
} from '@/features/recurrences/recurrence-presentation';
import type {
  Frequency,
  RecurringKind,
  RecurringMode,
  RecurringRule,
} from '@/features/recurrences/recurrence-api';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button, Card, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ModalSelector } from '@/ui/modal-selector';
import { QuickCategoryModal } from '@/ui/quick-category-modal';
import { ScreenHeader } from '@/ui/headers';
import { Disclosure } from '@/ui/disclosure';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { formatLocalDate, localDateFromNative } from '@/utils/local-date';
import { colors, spacing, typography } from '@/theme';

type Values = {
  name: string;
  amount: string;
  kind: RecurringKind;
  frequency: Frequency;
  mode: RecurringMode;
  accountId?: number;
  categoryId?: number;
  startDate: string;
  endDate: string;
  firstDay: number;
  secondDay: number;
};
function RecurringFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const rules = useRecurringRules();
  if (id && rules.isPending)
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (id && (rules.isError || !rules.data?.some((rule) => rule.id === Number(id))))
    return (
      <Screen>
        <ScreenHeader title="Programación" back backFallback="/(app)/recurrences" />
        <ErrorState onRetry={() => void rules.refetch()} />
      </Screen>
    );
  return <RecurringForm initial={rules.data?.find((rule) => rule.id === Number(id))} />;
}
function RecurringForm({ initial }: { initial?: RecurringRule }) {
  const { type, accountId } = useLocalSearchParams<{ type?: string; accountId?: string }>();
  const today = localDateFromNative(new Date());
  const activeSession = useFormSessionActive();
  const requestKey = useRef(
    initial?.requestKey ?? `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`,
  );
  const submitting = useRef(false);
  const [editingVersion] = useState(initial?.version);
  const [error, setError] = useState('');
  const [selector, setSelector] = useState<
    'account' | 'category' | 'frequency' | 'firstDay' | 'secondDay' | null
  >(null);
  const [quickCategory, setQuickCategory] = useState(false);
  const form = useForm<Values>({
    defaultValues: {
      name: initial?.name ?? '',
      amount: initial ? String(initial.amount) : '',
      kind: initial?.kind ?? (type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
      frequency: initial?.frequency ?? 'MONTHLY',
      mode: initial?.mode ?? (type === 'INCOME' ? 'AUTOMATIC' : 'CONFIRM'),
      accountId: initial?.accountId ?? (accountId ? Number(accountId) : undefined),
      categoryId: initial?.categoryId ?? undefined,
      startDate: initial ? (initial.nextDate < today ? today : initial.nextDate) : today,
      endDate: initial?.endDate ?? '',
      firstDay: initial?.firstDay ?? Number(today.slice(8)),
      secondDay: initial?.secondDay ?? 31,
    },
  });
  const values = form.watch();
  const accounts = useAccounts();
  const categories = useCategories(values.kind);
  const { save } = useRecurringActions();
  const feedback = useFeedback();
  const account = accounts.data?.find((item) => item.id === values.accountId);
  const category = categories.data?.find((item) => item.id === values.categoryId);
  const monthly = values.frequency === 'MONTHLY' || values.frequency === 'SEMIMONTHLY';
  function change<K extends keyof Values>(key: K, value: PathValue<Values, K>) {
    form.setValue(key, value);
    form.clearErrors(key);
    setError('');
  }
  const submit = form.handleSubmit(async (data) => {
    if (submitting.current) return;
    let invalid = false;
    const invalidField = (key: keyof Values, message: string) => {
      form.setError(key, { message });
      invalid = true;
    };
    if (!data.name.trim()) invalidField('name', 'Dale un nombre, por ejemplo Salario o Internet.');
    if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0)
      invalidField('amount', 'Ingresa un importe mayor que cero.');
    if (!account?.active) invalidField('accountId', 'Selecciona una cuenta activa.');
    if (data.kind === 'EXPENSE' && !data.categoryId)
      invalidField('categoryId', 'Selecciona una categoría de gasto.');
    if (data.startDate < today) invalidField('startDate', 'Elige hoy o una fecha posterior.');
    if (data.endDate && data.endDate < data.startDate)
      invalidField('endDate', 'El fin debe ser posterior al inicio.');
    if (invalid) return;
    submitting.current = true;
    try {
      await save.mutateAsync({
        id: initial?.id,
        data: {
          ...data,
          name: data.name.trim(),
          amount: Number(data.amount),
          accountId: data.accountId!,
          categoryId: data.categoryId,
          endDate: data.endDate || undefined,
          secondDay: data.frequency === 'SEMIMONTHLY' ? data.secondDay : undefined,
          timeZone: initial?.timeZone ?? deviceTimeZone(),
          requestKey: requestKey.current,
          version: editingVersion,
        },
      });
      if (activeSession()) {
        feedback.show('Programación guardada.', 'success');
        router.back();
      }
    } catch (failure) {
      if (activeSession()) {
        applyApiFieldErrors(failure, form.setError);
        setError(recurrenceError(failure));
      }
    } finally {
      submitting.current = false;
    }
  });
  const fieldError = (key: keyof Values) => form.formState.errors[key]?.message;
  return (
    <Screen entry scroll keyboard>
      <ScreenHeader
        title={
          initial
            ? 'Editar programación'
            : values.kind === 'INCOME'
              ? 'Nuevo ingreso fijo'
              : 'Nuevo gasto fijo'
        }
        subtitle="Elige el importe, la cuenta y las fechas."
        back
        backFallback="/(app)/recurrences"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['INCOME', 'EXPENSE'] as const).map((kind) => (
          <Button
            key={kind}
            style={{ flex: 1 }}
            variant={values.kind === kind ? 'primary' : 'secondary'}
            disabled={save.isPending}
            onPress={() => {
              change('kind', kind);
              change('categoryId', undefined);
              change('mode', kind === 'INCOME' ? 'AUTOMATIC' : 'CONFIRM');
            }}
          >
            {kind === 'INCOME' ? 'Ingreso' : 'Gasto'}
          </Button>
        ))}
      </View>
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <Input
            label="Nombre"
            placeholder={values.kind === 'INCOME' ? 'Ej. Salario' : 'Ej. Internet'}
            maxLength={100}
            value={field.value}
            onChangeText={(v) => change('name', v)}
            error={fieldError('name')}
          />
        )}
      />
      <SelectField
        label={values.kind === 'INCOME' ? 'Cuenta que recibe el dinero' : 'Cuenta de pago'}
        value={account ? `${account.name} · ${account.currency}` : undefined}
        onPress={() => setSelector('account')}
      />
      {accounts.isError && <ErrorState onRetry={() => void accounts.refetch()} />}
      {fieldError('accountId') && (
        <Text style={{ ...typography.caption, color: colors.danger }}>{fieldError('accountId')}</Text>
      )}
      <Controller
        control={form.control}
        name="amount"
        render={({ field }) => (
          <MoneyInput
            label="Importe de cada pago"
            currency={account?.currency ?? 'COP'}
            value={field.value}
            onChangeText={(v) => change('amount', v)}
            placeholder="0"
            error={fieldError('amount')}
            helperText={
              values.kind === 'INCOME'
                ? 'Si recibes 2 pagos de 1.500.000, escribe 1.500.000 aquí.'
                : values.mode === 'CONFIRM'
                  ? 'Podrás ajustar el importe al confirmar cada factura.'
                  : 'Se registrará este importe en cada fecha.'
            }
          />
        )}
      />
      <View style={{ gap: spacing.xs }}>
        <SelectField
          label={values.kind === 'INCOME' ? 'Categoría · opcional' : 'Categoría'}
          value={category?.name}
          onPress={() => setSelector('category')}
        />
        {categories.isError && <ErrorState onRetry={() => void categories.refetch()} />}
        {fieldError('categoryId') && (
          <Text style={{ ...typography.caption, color: colors.danger }}>{fieldError('categoryId')}</Text>
        )}
        <Button
          variant="ghost"
          size="compact"
          style={{ alignSelf: 'flex-end' }}
          onPress={() => setQuickCategory(true)}
        >
          + Crear categoría
        </Button>
      </View>
      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={typography.cardTitle}>Calendario de pagos</Text>
        <View style={{ gap: spacing.xs }}>
          <SelectField
            label="¿Cada cuánto?"
            value={frequencies.find((f) => f.value === values.frequency)?.label}
            onPress={() => setSelector('frequency')}
          />
          <Text style={typography.caption}>
            {frequencies.find((f) => f.value === values.frequency)?.detail}
          </Text>
        </View>
        {monthly && (
          <SelectField
            label={values.frequency === 'SEMIMONTHLY' ? 'Primer día del mes' : 'Día de pago'}
            value={values.firstDay === 31 ? 'Último día del mes' : `Día ${values.firstDay}`}
            onPress={() => setSelector('firstDay')}
          />
        )}
        {values.frequency === 'SEMIMONTHLY' && (
          <SelectField
            label="Segundo día del mes"
            value={values.secondDay === 31 ? 'Último día del mes' : `Día ${values.secondDay}`}
            onPress={() => setSelector('secondDay')}
          />
        )}
        <FinancialDateField
          label={monthly ? 'Empezar a partir de' : 'Primer pago'}
          value={values.startDate}
          onChange={(v) => change('startDate', v)}
          error={fieldError('startDate')}
        />
        {monthly && (
          <Text style={typography.caption}>Comienza con el siguiente día de pago desde esta fecha.</Text>
        )}
      </Card>
      <Card
        tone={values.mode === 'AUTOMATIC' ? 'tonal' : 'info'}
        style={{ padding: spacing.lg, gap: spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={typography.cardTitle}>Registro automático</Text>
            <Text style={typography.caption}>
              {values.mode === 'AUTOMATIC'
                ? 'Se registra al llegar el día de pago.'
                : 'Tú confirmas el importe y la fecha reales.'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Registro automático"
            value={values.mode === 'AUTOMATIC'}
            disabled={save.isPending}
            trackColor={{ false: colors.border, true: colors.primaryStrong }}
            thumbColor={values.mode === 'AUTOMATIC' ? colors.primary : colors.textMuted}
            onValueChange={(v) => change('mode', v ? 'AUTOMATIC' : 'CONFIRM')}
          />
        </View>
        <Text style={typography.caption}>
          {values.mode === 'AUTOMATIC'
            ? 'Actívalo para importes y fechas seguros. Solo anota el movimiento; no hace pagos en tu banco.'
            : 'Útil si el importe cambia. Hasta confirmar, no afecta tus saldos ni reportes.'}
        </Text>
      </Card>
      <Disclosure title="Fecha de fin y detalles" icon="options-outline">
        <FinancialDateField
          label="Terminar después de · opcional"
          value={values.endDate}
          onChange={(v) => change('endDate', v)}
          error={fieldError('endDate')}
        />
        {values.endDate && (
          <Button variant="ghost" onPress={() => change('endDate', '')}>
            Sin fecha de fin
          </Button>
        )}
        <Text style={typography.caption}>
          Horario: {initial?.timeZone ?? deviceTimeZone()}. Los fines de semana se mantiene la fecha elegida.
        </Text>
        {monthly && (
          <Text style={typography.caption}>
            Si el mes no tiene el día 29, 30 o 31 elegido, se usa su último día.
          </Text>
        )}
        <Text style={typography.caption}>
          Editar cambia los próximos pagos; los ya pendientes o registrados conservan sus datos. Pausar
          detiene las próximas fechas.
        </Text>
      </Disclosure>
      <Text style={typography.bodySecondary}>
        {scheduleLabel(values)} · desde {formatLocalDate(values.startDate)}.
      </Text>
      {values.mode === 'AUTOMATIC' && values.startDate === today && (
        <Text style={typography.caption}>
          Si hoy coincide con un día de pago, se registrará al guardar. Elige una fecha futura si ya lo
          anotaste.
        </Text>
      )}
      {error && (
        <Text accessibilityLiveRegion="polite" style={{ ...typography.body, color: colors.danger }}>
          {error}
        </Text>
      )}
      <Button onPress={() => void submit()} loading={save.isPending} disabled={save.isPending}>
        Guardar programación
      </Button>
      <ModalSelector
        visible={selector !== null}
        selectedId={
          selector === 'account'
            ? values.accountId
            : selector === 'category'
              ? values.categoryId
              : selector === 'frequency'
                ? frequencies.findIndex((f) => f.value === values.frequency)
                : selector === 'firstDay'
                  ? values.firstDay
                  : values.secondDay
        }
        label={
          selector === 'account'
            ? 'Cuenta'
            : selector === 'category'
              ? 'Categoría'
              : selector === 'frequency'
                ? 'Frecuencia'
                : 'Día del mes'
        }
        options={
          selector === 'account'
            ? (accounts.data ?? [])
                .filter((a) => a.active && a.id !== undefined)
                .map((a) => ({ id: a.id!, label: `${a.name} · ${a.currency}` }))
            : selector === 'category'
              ? (categories.data ?? [])
                  .filter((c) => c.active !== false && c.id !== undefined)
                  .map((c) => ({ id: c.id!, label: c.name ?? 'Categoría' }))
              : selector === 'frequency'
                ? frequencies.map((f, id) => ({ id, label: f.label, subtitle: f.detail }))
                : Array.from(
                    { length: selector === 'firstDay' && values.frequency === 'SEMIMONTHLY' ? 27 : 31 },
                    (_, i) => ({ id: i + 1, label: i === 30 ? 'Último día del mes' : `Día ${i + 1}` }),
                  ).filter((d) => selector !== 'secondDay' || d.id > values.firstDay)
        }
        loading={
          selector === 'account' ? accounts.isPending : selector === 'category' ? categories.isPending : false
        }
        onClose={() => setSelector(null)}
        onSelect={(id) => {
          if (selector === 'account') change('accountId', id);
          else if (selector === 'category') change('categoryId', id);
          else if (selector === 'frequency') {
            const frequency = frequencies[id];
            if (!frequency) return;
            change('frequency', frequency.value);
            if (frequency.value === 'SEMIMONTHLY') {
              change('firstDay', 15);
              change('secondDay', 31);
            }
          } else if (selector === 'firstDay') {
            change('firstDay', id);
            if (values.secondDay <= id) change('secondDay', 31);
          } else change('secondDay', id);
          setSelector(null);
        }}
        emptyActionLabel={
          selector === 'account' ? 'Crear cuenta' : selector === 'category' ? 'Crear categoría' : undefined
        }
        onEmptyAction={
          selector === 'account' || selector === 'category'
            ? () => {
                setSelector(null);
                if (selector === 'account') openForm('/(app)/account-form');
                else setQuickCategory(true);
              }
            : undefined
        }
      />
      <QuickCategoryModal
        visible={quickCategory}
        type={values.kind}
        onClose={() => setQuickCategory(false)}
        onCreated={(created) => {
          change('categoryId', created);
          setQuickCategory(false);
        }}
      />
    </Screen>
  );
}
export default withFormSession(RecurringFormRoute);
