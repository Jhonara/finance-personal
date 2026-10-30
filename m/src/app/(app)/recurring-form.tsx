import { useRef, useState } from 'react';
import { Text, View, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, type PathValue } from 'react-hook-form';
import { applyApiFieldErrors } from '@/auth/form-errors';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import { openForm, useFormSessionActive, withFormSession } from '@/features/forms/form-session';
import {
  useRecurringActions,
  useRecurringRules,
  useRecurringPreview,
} from '@/features/recurrences/use-recurrences';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { hasFormChanges, useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { deviceTimeZone, frequencies, recurrenceError } from '@/features/recurrences/recurrence-presentation';
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
  amountBasis: 'PER_PAYMENT' | 'MONTHLY_TOTAL';
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
  const { type, accountId, editEnd } = useLocalSearchParams<{
    type?: string;
    accountId?: string;
    editEnd?: string;
  }>();
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
      amountBasis: 'PER_PAYMENT',
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
  const preview = useRecurringPreview({
    frequency: values.frequency,
    amountBasis: values.amountBasis,
    amount: Number(values.amount),
    firstDay: values.firstDay,
    secondDay: values.secondDay,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
  });
  const money = (amount: number) => formatPrivateMoney(amount, account?.currency ?? 'COP', false);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(app)/recurrences'));
  const guard = useUnsavedForm({
    dirty: hasFormChanges(values, form.formState.defaultValues),
    busy: save.isPending,
    suspended: selector !== null || quickCategory,
    onBack: leave,
  });
  function change<K extends keyof Values>(key: K, value: PathValue<Values, K>) {
    form.setValue(key, value);
    form.clearErrors(key);
    setError('');
  }
  function changeAmountBasis(basis: Values['amountBasis']) {
    if (basis === values.amountBasis) return true;
    if (Number(values.amount) > 0) {
      if (!preview.data || preview.waiting || preview.isError) {
        setError(
          'Revisa el importe y las fechas de la vista previa antes de cambiar cómo se reparte el pago.',
        );
        return false;
      }
      change(
        'amount',
        String(basis === 'MONTHLY_TOTAL' ? preview.data.fullMonthTotal : preview.data.amountPerPayment),
      );
    }
    change('amountBasis', basis);
    return true;
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
    if (!preview.data || preview.waiting || preview.isError) {
      setError('Revisa la vista previa antes de guardar. Puedes volver a intentar la consulta.');
      return;
    }
    submitting.current = true;
    try {
      await save.mutateAsync({
        id: initial?.id,
        data: {
          kind: data.kind,
          frequency: data.frequency,
          mode: data.mode,
          firstDay: data.firstDay,
          startDate: data.startDate,
          name: data.name.trim(),
          amount: preview.data.amountPerPayment,
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
        onBack={() => guard.request(leave)}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['INCOME', 'EXPENSE'] as const).map((kind) => (
          <Button
            key={kind}
            style={{ flex: 1 }}
            variant={values.kind === kind ? 'primary' : 'secondary'}
            disabled={save.isPending}
            onPress={() => {
              if (kind === 'EXPENSE' && values.amountBasis === 'MONTHLY_TOTAL') {
                if (!changeAmountBasis('PER_PAYMENT')) return;
              }
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
      {values.kind === 'INCOME' && monthly && (
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.label}>¿Qué importe vas a escribir?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['PER_PAYMENT', 'MONTHLY_TOTAL'] as const).map((basis) => (
              <Button
                key={basis}
                size="compact"
                style={{ flex: 1 }}
                disabled={preview.waiting || save.isPending}
                variant={values.amountBasis === basis ? 'primary' : 'secondary'}
                onPress={() => {
                  changeAmountBasis(basis);
                }}
              >
                {basis === 'PER_PAYMENT' ? 'Por pago' : 'Total mensual'}
              </Button>
            ))}
          </View>
        </View>
      )}
      <Controller
        control={form.control}
        name="amount"
        render={({ field }) => (
          <MoneyInput
            label={
              values.amountBasis === 'MONTHLY_TOTAL' ? 'Total que recibes al mes' : 'Importe de cada pago'
            }
            currency={account?.currency ?? 'COP'}
            value={field.value}
            onChangeText={(v) => change('amount', v)}
            placeholder="0"
            error={fieldError('amount')}
            helperText={
              values.amountBasis === 'MONTHLY_TOTAL'
                ? 'Se divide entre los pagos de cada mes.'
                : values.kind === 'INCOME'
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
          {values.frequency === 'BIWEEKLY' && (
            <Text style={typography.caption}>Cada 14 días; las fechas cambian de un mes a otro.</Text>
          )}
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
            ? 'Solo registra el movimiento; no realiza pagos en tu banco.'
            : 'Hasta confirmar, no cambia tus saldos ni reportes.'}
        </Text>
      </Card>
      <Disclosure title="Fecha de fin y detalles" icon="options-outline" defaultOpen={editEnd === '1'}>
        {initial?.state === 'FINISHED' && (
          <Text style={typography.caption}>
            Esta programación terminó. Elige una nueva fecha de fin o quítala. Después de guardar podrás
            reanudarla desde la lista.
          </Text>
        )}
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
            Empieza en la primera fecha de pago desde el día indicado. Un primer mes incompleto solo incluye
            las fechas restantes. Si el mes no tiene el día 29, 30 o 31 elegido, se usa su último día.
          </Text>
        )}
        <Text style={typography.caption}>
          Usa el registro automático si el importe y la fecha son seguros. Para facturas variables, déjalo
          desactivado y confirma cada pago con su importe real.
        </Text>
        <Text style={typography.caption}>
          Editar cambia los próximos pagos; los ya pendientes o registrados conservan sus datos. Pausar
          detiene las próximas fechas.
        </Text>
      </Disclosure>
      {Number(values.amount) > 0 && (
        <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Así quedarán tus próximos pagos</Text>
          {preview.waiting ? (
            <Text style={typography.caption}>Preparando las fechas…</Text>
          ) : preview.isError ? (
            <>
              <Text style={{ ...typography.caption, color: colors.danger }}>
                {recurrenceError(preview.error)}
              </Text>
              <Button variant="ghost" size="compact" onPress={() => void preview.refetch()}>
                Reintentar vista previa
              </Button>
            </>
          ) : preview.data ? (
            <>
              <Text style={typography.label}>{money(preview.data.amountPerPayment)} por pago</Text>
              {preview.data.fullMonthTotal != null ? (
                <Text style={typography.caption}>
                  {money(preview.data.fullMonthTotal)} en un mes completo.
                </Text>
              ) : (
                <Text style={typography.caption}>
                  El total mensual varía según cuántas fechas de pago tenga el mes.
                </Text>
              )}
              {preview.data.months.map((month) => (
                <View key={month.month} style={{ gap: spacing.xs }}>
                  <Text style={typography.label}>
                    {formatLocalDate(month.month, 'compact').replace(/^1\s/, '')} · {money(month.total)}
                  </Text>
                  <Text style={typography.caption}>
                    {month.dates.length
                      ? month.dates.map((date) => formatLocalDate(date, 'compact')).join(' · ')
                      : 'Sin pagos en este mes.'}
                  </Text>
                </View>
              ))}
              <Text style={typography.caption}>
                Es una previsión. Solo los pagos registrados cambian tus saldos y reportes.
              </Text>
            </>
          ) : null}
        </Card>
      )}
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
      <Button
        onPress={() => void submit()}
        loading={save.isPending}
        disabled={save.isPending || preview.waiting}
      >
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
            if (
              (frequency.value === 'WEEKLY' || frequency.value === 'BIWEEKLY') &&
              values.amountBasis === 'MONTHLY_TOTAL'
            ) {
              if (!changeAmountBasis('PER_PAYMENT')) {
                setSelector(null);
                return;
              }
            }
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
