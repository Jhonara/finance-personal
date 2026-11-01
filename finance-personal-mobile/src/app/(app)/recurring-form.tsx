import { useEffect, useRef, useState } from 'react';
import { Text, View, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, type PathValue } from 'react-hook-form';
import { applyApiFieldErrors } from '@/auth/form-errors';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import { useCredits } from '@/features/secondary/use-secondary';
import { openForm, useFormSessionActive, withFormSession } from '@/features/forms/form-session';
import {
  useRecurringActions,
  useRecurringRules,
  useRecurringPreview,
} from '@/features/recurrences/use-recurrences';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { hasFormChanges, useUnsavedForm } from '@/features/forms/use-unsaved-form';
import {
  deviceTimeZone,
  frequencies,
  frequencyLabel,
  monthlyAmountFromPayment,
  recurrenceError,
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
import { CategoryHierarchyField } from '@/ui/category-hierarchy-field';
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
  creditId?: number;
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
  const { type, accountId, editEnd, creditId } = useLocalSearchParams<{
    type?: string;
    accountId?: string;
    editEnd?: string;
    creditId?: string;
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
    'account' | 'credit' | 'frequency' | 'firstDay' | 'secondDay' | null
  >(null);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const form = useForm<Values>({
    defaultValues: {
      name: initial?.name ?? '',
      amount: initial ? String(monthlyAmountFromPayment(initial.amount, initial.frequency)) : '',
      kind: initial?.kind ?? (type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
      frequency: initial?.frequency ?? 'MONTHLY',
      mode: initial?.mode ?? (type === 'INCOME' ? 'AUTOMATIC' : 'CONFIRM'),
      accountId: initial?.accountId ?? (accountId ? Number(accountId) : undefined),
      categoryId: initial?.categoryId ?? undefined,
      creditId: initial?.creditId ?? (creditId ? Number(creditId) : undefined),
      startDate: initial ? (initial.nextDate < today ? today : initial.nextDate) : today,
      endDate: initial?.endDate ?? '',
      firstDay: initial?.firstDay ?? Number(today.slice(8)),
      secondDay: initial?.secondDay ?? 31,
    },
  });
  const values = form.watch();
  const accounts = useAccounts();
  const credits = useCredits();
  const categories = useCategories(values.kind);
  const { save } = useRecurringActions();
  const feedback = useFeedback();
  const account = accounts.data?.find((item) => item.id === values.accountId);
  const linkedCredit = credits.data?.find((item) => item.id === values.creditId);
  const presetApplied = useRef(false);
  useEffect(() => {
    if (initial || !creditId || !credits.data || presetApplied.current) return;
    const credit = credits.data.find((item) => item.id === Number(creditId));
    if (!credit) return;
    presetApplied.current = true;
    const dueDate =
      credit.nextPaymentDate && credit.nextPaymentDate >= today ? credit.nextPaymentDate : today;
    form.setValue('kind', 'EXPENSE');
    form.setValue('mode', 'CONFIRM');
    form.setValue('creditId', credit.id);
    form.setValue('name', `Cuota de ${credit.name ?? 'crédito'}`);
    form.setValue('amount', credit.expectedPaymentAmount == null ? '' : String(credit.expectedPaymentAmount));
    form.setValue('frequency', 'MONTHLY');
    form.setValue('firstDay', Number(dueDate.slice(8)));
    form.setValue('startDate', dueDate);
  }, [initial, creditId, credits.data, form, today]);
  const monthly = values.frequency === 'MONTHLY' || values.frequency === 'SEMIMONTHLY';
  const preview = useRecurringPreview({
    frequency: values.frequency,
    amountBasis: 'MONTHLY_TOTAL',
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
    suspended: selector !== null || hierarchyOpen,
    onBack: leave,
  });
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
    if (data.kind === 'EXPENSE' && !data.categoryId && !data.creditId)
      invalidField('categoryId', 'Selecciona una categoría de gasto.');
    if (data.creditId && !linkedCredit)
      invalidField('creditId', 'El crédito ya no está disponible. Actualiza la lista e inténtalo de nuevo.');
    if (linkedCredit?.status === 'PAID') invalidField('creditId', 'Este crédito ya está pagado.');
    if (linkedCredit && linkedCredit.currency !== account?.currency)
      invalidField('accountId', 'Elige una cuenta con la misma moneda que el crédito.');
    if (data.creditId && data.frequency !== 'MONTHLY')
      invalidField('frequency', 'Las cuotas de crédito se programan una vez al mes.');
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
          creditId: data.creditId,
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
        subtitle="Indica el total mensual, la frecuencia y la cuenta."
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
              change('kind', kind);
              if (kind === 'INCOME') change('creditId', undefined);
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
            label={values.kind === 'INCOME' ? 'Total mensual del ingreso' : 'Total mensual del gasto'}
            currency={account?.currency ?? 'COP'}
            value={field.value}
            onChangeText={(v) => change('amount', v)}
            placeholder="0"
            error={fieldError('amount')}
            helperText="Escribe el total de todo un mes; lo repartimos entre las fechas que elijas."
          />
        )}
      />
      {values.kind === 'EXPENSE' && (
        <View style={{ gap: spacing.sm }}>
          <SelectField
            label="Vincular con una cuota de crédito · opcional"
            value={linkedCredit?.name}
            onPress={() => setSelector('credit')}
          />
          {credits.isError && <ErrorState onRetry={() => void credits.refetch()} />}
          {linkedCredit && (
            <Card tone="info" style={{ padding: spacing.md, gap: spacing.xs }}>
              <Text style={typography.label}>Pago del crédito · {linkedCredit.name}</Text>
              <Text style={typography.caption}>
                La cuenta elegida se descontará y el pago también reducirá esta deuda. No se creará otro
                gasto.
              </Text>
              <Text style={typography.caption}>
                Cuota estimada:{' '}
                {linkedCredit.expectedPaymentAmount == null
                  ? 'El importe se define al registrar el pago.'
                  : formatPrivateMoney(
                      linkedCredit.expectedPaymentAmount,
                      linkedCredit.currency ?? 'COP',
                      false,
                    )}
                {linkedCredit.nextPaymentDate
                  ? ` · Próximo pago ${formatLocalDate(linkedCredit.nextPaymentDate)}`
                  : ''}
              </Text>
            </Card>
          )}
          {fieldError('creditId') && (
            <Text style={{ ...typography.caption, color: colors.danger }}>{fieldError('creditId')}</Text>
          )}
        </View>
      )}
      {!values.creditId && (
        <View style={{ gap: spacing.sm }}>
          <CategoryHierarchyField
            categories={categories.data ?? []}
            type={values.kind}
            optional={values.kind === 'INCOME'}
            value={values.categoryId}
            loading={categories.isPending}
            error={fieldError('categoryId')}
            onSelectorOpenChange={setHierarchyOpen}
            onChange={(id) => change('categoryId', id)}
          />
          {categories.isError && <ErrorState onRetry={() => void categories.refetch()} />}
        </View>
      )}
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
            <Text style={typography.cardTitle}>
              {values.creditId ? 'Registro del pago del crédito' : 'Registro automático'}
            </Text>
            <Text style={typography.caption}>
              {values.mode === 'AUTOMATIC'
                ? values.creditId
                  ? 'Al llegar la fecha, se anotará el pago del crédito y se descontará de la cuenta.'
                  : 'Se registra al llegar el día de pago.'
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
            ? 'La app no realiza pagos en tu banco. Si el valor puede cambiar, elige confirmar cada pago.'
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
              <Text style={typography.label}>Frecuencia de pago: {frequencyLabel(values.frequency)}</Text>
              <Text style={typography.label}>{money(preview.data.amountPerPayment)} por pago</Text>
              {preview.data.fullMonthTotal != null ? (
                <Text style={typography.caption}>
                  {monthly ? 'Total mensual programado' : 'Promedio mensual'}:{' '}
                  {money(preview.data.fullMonthTotal)}.
                </Text>
              ) : (
                <Text style={typography.caption}>
                  El total mensual varía según cuántas fechas de pago tenga el mes.
                </Text>
              )}
              {(values.frequency === 'WEEKLY' || values.frequency === 'BIWEEKLY') && (
                <Text style={typography.caption}>
                  Los pagos se calculan con el promedio anual; algunos meses tienen más fechas que otros.
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
            : selector === 'credit'
              ? (values.creditId ?? 0)
              : selector === 'frequency'
                ? frequencies.findIndex((f) => f.value === values.frequency)
                : selector === 'firstDay'
                  ? values.firstDay
                  : values.secondDay
        }
        label={
          selector === 'account'
            ? 'Cuenta'
            : selector === 'credit'
              ? 'Crédito relacionado'
              : selector === 'frequency'
                ? 'Frecuencia'
                : 'Día del mes'
        }
        options={
          selector === 'account'
            ? (accounts.data ?? [])
                .filter(
                  (a) =>
                    a.active && a.id !== undefined && (!linkedCredit || a.currency === linkedCredit.currency),
                )
                .map((a) => ({ id: a.id!, label: `${a.name} · ${a.currency}` }))
            : selector === 'credit'
              ? [
                  { id: 0, label: 'No asociar a un crédito' },
                  ...(credits.data ?? [])
                    .filter((credit) => credit.status !== 'PAID' && credit.id !== undefined)
                    .map((credit) => ({
                      id: credit.id!,
                      label: credit.name ?? 'Crédito',
                      subtitle:
                        credit.expectedPaymentAmount == null
                          ? (credit.currency ?? 'Moneda no definida')
                          : `${formatPrivateMoney(credit.expectedPaymentAmount, credit.currency ?? 'COP', false)} · ${credit.currency ?? 'COP'}`,
                    })),
                ]
              : selector === 'frequency'
                ? frequencies.map((f, id) => ({ id, label: f.label, subtitle: f.detail }))
                : Array.from(
                    { length: selector === 'firstDay' && values.frequency === 'SEMIMONTHLY' ? 27 : 31 },
                    (_, i) => ({ id: i + 1, label: i === 30 ? 'Último día del mes' : `Día ${i + 1}` }),
                  ).filter((d) => selector !== 'secondDay' || d.id > values.firstDay)
        }
        loading={
          selector === 'account' ? accounts.isPending : selector === 'credit' ? credits.isPending : false
        }
        onClose={() => setSelector(null)}
        onSelect={(id) => {
          if (selector === 'account') change('accountId', id);
          else if (selector === 'credit') {
            const nextCredit = id === 0 ? undefined : credits.data?.find((item) => item.id === id);
            change('creditId', nextCredit?.id);
            if (nextCredit) {
              change('kind', 'EXPENSE');
              change('categoryId', undefined);
              change('mode', 'CONFIRM');
              change('name', `Cuota de ${nextCredit.name ?? 'crédito'}`);
              change(
                'amount',
                nextCredit.expectedPaymentAmount == null ? '' : String(nextCredit.expectedPaymentAmount),
              );
              change('frequency', 'MONTHLY');
              const dueDate =
                nextCredit.nextPaymentDate && nextCredit.nextPaymentDate >= today
                  ? nextCredit.nextPaymentDate
                  : today;
              change('firstDay', Number(dueDate.slice(8)));
              change('startDate', dueDate);
              if (account && account.currency !== nextCredit.currency) change('accountId', undefined);
            }
          } else if (selector === 'frequency') {
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
        emptyActionLabel={selector === 'account' ? 'Crear cuenta' : undefined}
        onEmptyAction={
          selector === 'account'
            ? () => {
                setSelector(null);
                openForm('/(app)/account-form');
              }
            : undefined
        }
      />
    </Screen>
  );
}
export default withFormSession(RecurringFormRoute);
