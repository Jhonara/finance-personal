import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCredit, useCredit, useUpdateCredit } from '@/features/secondary/use-secondary';
import { createCreditSchema, openingPositionSchema, termsRequest } from '@/features/credits/credit-schemas';
import { CreditTermsFields } from '@/features/credits/credit-terms-fields';
import { CreditAccountSelector } from '@/features/credits/credit-account-selector';
import { useCreditSubmit } from '@/features/credits/use-credit-submit';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Input, MoneyInput, Screen } from '@/ui/primitives';
import { CurrencySelector } from '@/ui/currency-selector';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ErrorState, Skeleton } from '@/ui/states';
import { MovementFormHeader, MovementFormSection } from '@/ui/movement-form';
import { localDateFromNative } from '@/utils/local-date';
import { colors, radius, spacing, typography } from '@/theme';

function CreditForm() {
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const editing = params.mode === 'edit';
  const id = editing ? Number(params.id) : 0;
  const existing = useCredit(id);
  const update = useUpdateCredit();
  const loaded = useRef(false);
  const [imported, setImported] = useState(false);
  const [opening, setOpening] = useState({
    balance: '',
    date: localDateFromNative(new Date()),
    remainingMonths: '',
    nextPaymentDate: '',
  });
  const [openingErrors, setOpeningErrors] = useState<Record<string, string>>({});
  const active = useFormSessionActive();
  const form = useForm({
    defaultValues: {
      name: '',
      principal: '',
      annualRate: '',
      termMonths: '',
      paymentDay: '',
      disbursementDate: localDateFromNative(new Date()),
      currency: 'COP',
    },
    resolver: zodResolver(createCreditSchema),
  });
  const values = form.watch();
  useEffect(() => {
    if (!editing || !existing.data || loaded.current) return;
    loaded.current = true;
    const credit = existing.data;
    form.reset({
      name: credit.name ?? '',
      principal: String(credit.principal ?? ''),
      annualRate: String(credit.annualRate ?? ''),
      termMonths: String(credit.termMonths ?? ''),
      paymentDay: String(credit.paymentDay ?? ''),
      disbursementDate: credit.disbursementDate ?? '',
      currency: credit.currency ?? 'COP',
    });
    setImported(credit.openingBalance != null);
    if (credit.openingBalance != null)
      setOpening({
        balance: String(credit.openingBalance),
        date: credit.openingDate ?? '',
        remainingMonths: String(credit.openingRemainingMonths ?? ''),
        nextPaymentDate: credit.openingNextPaymentDate ?? '',
      });
  }, [editing, existing.data, form]);
  const [account, setAccount] = useState<number>();
  const [saved, setSaved] = useState(false);
  const mutation = useCreateCredit();
  const safety = useCreditSubmit();
  const changeOpening = (field: keyof typeof opening, value: string) => {
    setOpening((current) => ({ ...current, [field]: value }));
    setOpeningErrors((current) => ({ ...current, [field]: '' }));
    if (!safety.uncertain) safety.reset();
  };
  const feedback = useFeedback();
  const tour = useTour();
  const { hidden } = usePrivacy();
  const submit = () => {
    if (saved) return;
    void safety.run(
      () =>
        form.handleSubmit(async (data) => {
          setOpeningErrors({});
          let position = {};
          if (imported) {
            const parsed = openingPositionSchema.safeParse(opening);
            const errors: Record<string, string> = {};
            if (!parsed.success)
              for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
            if (Number(opening.balance) > Number(data.principal))
              errors.balance = 'El saldo no puede superar el monto original.';
            if (Number(opening.remainingMonths) > Number(data.termMonths))
              errors.remainingMonths = 'No puede superar el plazo original.';
            if (opening.date < data.disbursementDate)
              errors.date = 'El corte debe ser posterior al desembolso.';
            if (Object.keys(errors).length) {
              setOpeningErrors(errors);
              safety.setError(Object.values(errors).join(' '));
              return;
            }
            position = {
              openingBalance: Number(opening.balance),
              openingDate: opening.date,
              openingRemainingMonths: Number(opening.remainingMonths),
              openingNextPaymentDate: opening.nextPaymentDate,
            };
          }
          const request = {
            ...termsRequest(data),
            name: data.name,
            currency: data.currency,
            ...position,
            ...(account === undefined || imported || editing ? {} : { disbursementAccountId: account }),
          };
          if (editing)
            await update.mutateAsync({ id, data: { ...request, version: existing.data!.version! } });
          else await mutation.mutateAsync(request);
          if (!active()) return;
          form.reset();
          setAccount(undefined);
          setSaved(true);
          feedback.show(editing ? 'Crédito actualizado' : 'Crédito registrado', 'success');
          if (!editing) tour?.completeStep?.('add-credit');
          router.replace(editing ? { pathname: '/(app)/credit-detail', params: { id } } : '/(app)/credits');
        })(),
      (failure) => {
        for (const key of Object.keys(createCreditSchema.shape) as (keyof typeof values)[])
          if (failure.fieldErrors[key]) form.setError(key, { message: failure.fieldErrors[key] });
        const openingFields = {
          openingBalance: [
            'balance',
            'Saldo pendiente: escribe un valor mayor que cero, con máximo dos decimales.',
          ],
          openingDate: [
            'date',
            'Fecha de corte: debe ser de hoy o anterior. Verifica la fecha de tu extracto; si tu teléfono ya muestra otro día, revisa su zona horaria.',
          ],
          openingRemainingMonths: [
            'remainingMonths',
            'Cuotas que faltan: escribe un número entero entre 1 y 1200.',
          ],
          openingNextPaymentDate: [
            'nextPaymentDate',
            'Próximo pago: selecciona una fecha posterior al corte del saldo.',
          ],
        } as const;
        const fieldErrors: Record<string, string> = {};
        const messages: string[] = [];
        for (const [key, message] of Object.entries(failure.fieldErrors)) {
          const openingField = openingFields[key as keyof typeof openingFields];
          if (openingField) {
            fieldErrors[openingField[0]] = openingField[1];
            messages.push(openingField[1]);
          } else if (key in createCreditSchema.shape) messages.push(message);
        }
        setOpeningErrors(fieldErrors);
        if (messages.length) safety.setError(messages.join(' '));
        else if (failure.code === 'BAD_REQUEST') safety.setError(failure.message);
        else if (failure.status === 409)
          safety.setError(
            'El crédito cambió mientras lo editabas. Vuelve a abrirlo para ver los datos actuales.',
          );
      },
    );
  };
  if (editing && !existing.data)
    return (
      <Screen>
        {existing.isPending ? (
          <Skeleton height={240} />
        ) : (
          <ErrorState onRetry={() => void existing.refetch()} />
        )}
      </Screen>
    );
  if (editing && existing.data?.editable !== true)
    return (
      <Screen>
        <Text style={typography.body}>
          Este crédito tiene historial financiero. Sus condiciones están protegidas.
        </Text>
        <Button onPress={() => router.back()}>Volver al crédito</Button>
      </Screen>
    );
  return (
    <Screen entry scroll keyboard style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.lg }}>
        <MovementFormHeader
          title={editing ? 'Editar crédito' : 'Nuevo crédito'}
          onBack={() => {
            if (!safety.busy) router.replace('/(app)/credits');
          }}
        />
        <LinearGradient colors={[colors.creditSoft, '#F9FCFF']} style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="card-outline" size={25} color={colors.credit} />
          </View>
          <View style={styles.introCopy}>
            <Text accessibilityRole="header" style={typography.sectionTitle}>
              Conoce tu deuda
            </Text>
            <Text style={typography.bodySecondary}>
              Registra condiciones reales para seguir el saldo y tus pagos.
            </Text>
          </View>
        </LinearGradient>
        <MovementFormSection
          title="Identifica el crédito"
          subtitle="Dale un nombre fácil de reconocer."
          icon="document-text-outline"
        >
          <Input
            label="Nombre del crédito"
            accessibilityLabel="Nombre del crédito"
            placeholder="Ej. Crédito de vehículo"
            value={values.name}
            onChangeText={(v) => form.setValue('name', v)}
            error={form.formState.errors.name?.message}
            disabled={safety.busy || saved}
          />
          <CurrencySelector
            value={values.currency}
            onChange={(v) => {
              form.setValue('currency', v);
              setAccount(undefined);
            }}
            error={form.formState.errors.currency?.message}
            disabled={safety.busy || saved}
          />
        </MovementFormSection>
        <MovementFormSection
          title="¿Desde dónde empezamos?"
          subtitle="Elige cómo registrar tu crédito."
          icon="time-outline"
        >
          <Button
            variant={imported ? 'secondary' : 'primary'}
            disabled={safety.busy || saved}
            onPress={() => setImported(false)}
          >
            Desde el desembolso
          </Button>
          <Button
            variant={imported ? 'primary' : 'secondary'}
            disabled={safety.busy || saved}
            onPress={() => {
              setImported(true);
              setAccount(undefined);
            }}
          >
            Ya lo venía pagando
          </Button>
          {imported ? (
            <>
              <Text style={typography.bodySecondary}>
                Empieza con lo que debes según tu último extracto. Los pagos anteriores ya están incluidos en
                ese saldo; no necesitas registrarlos otra vez.
              </Text>
              <MoneyInput
                label="Saldo de capital pendiente"
                helperText="Dinero del préstamo que aún debes, sin sumar intereses futuros ni seguros."
                currency={values.currency}
                value={opening.balance}
                onChangeText={(balance) => changeOpening('balance', balance)}
                error={openingErrors.balance}
                secureTextEntry={hidden}
                disabled={safety.busy || saved}
              />
              <View pointerEvents={safety.busy || saved ? 'none' : 'auto'}>
                <FinancialDateField
                  label="Fecha de corte del saldo"
                  value={opening.date}
                  onChange={(date) => changeOpening('date', date)}
                  error={openingErrors.date}
                  maximumDate={localDateFromNative(new Date())}
                />
              </View>
              <Text style={typography.caption}>
                Día al que corresponde ese saldo en tu extracto. No es la próxima fecha de pago ni puede ser
                una fecha futura.
              </Text>
              <Input
                label="Cuotas que faltan"
                helperText="Pagos mensuales pendientes desde ese corte; no el plazo original completo."
                accessibilityLabel="Cuotas que faltan"
                keyboardType="number-pad"
                value={opening.remainingMonths}
                onChangeText={(remainingMonths) => changeOpening('remainingMonths', remainingMonths)}
                error={openingErrors.remainingMonths}
                disabled={safety.busy || saved}
              />
              <View pointerEvents={safety.busy || saved ? 'none' : 'auto'}>
                <FinancialDateField
                  label="Próximo pago del extracto"
                  value={opening.nextPaymentDate}
                  onChange={(nextPaymentDate) => changeOpening('nextPaymentDate', nextPaymentDate)}
                  error={openingErrors.nextPaymentDate}
                />
              </View>
              <Text style={typography.caption}>
                Primera cuota pendiente después del corte. Las siguientes usan el día de pago que indiques
                abajo.
              </Text>
              <Text style={typography.caption}>
                Esta opción supone que estabas al día en ese corte. No incluye cuotas que ya estuvieran
                atrasadas.
              </Text>
            </>
          ) : (
            <Text style={typography.caption}>
              Empieza desde el préstamo original y registra sus pagos en la app.
            </Text>
          )}
        </MovementFormSection>
        <MovementFormSection
          title="Condiciones"
          subtitle="Usaremos estos datos para calcular el plan de pagos."
          icon="calculator-outline"
        >
          <CreditTermsFields
            values={values}
            onChange={(key, value) => form.setValue(key, value)}
            errors={form.formState.errors}
            currency={values.currency}
            hidden={hidden}
            busy={safety.busy || saved}
          />
        </MovementFormSection>
        {!imported && !editing ? (
          <MovementFormSection
            title="Cuenta vinculada"
            subtitle="Solo si el dinero entró a una cuenta tuya."
            icon="wallet-outline"
          >
            <CreditAccountSelector
              label="Cuenta de desembolso"
              currency={values.currency}
              value={account}
              onChange={setAccount}
              disabled={safety.busy || saved}
            />
          </MovementFormSection>
        ) : null}
        {!!safety.error && (
          <Text accessibilityLiveRegion="polite" style={[typography.bodySecondary, { color: colors.danger }]}>
            {safety.error}
          </Text>
        )}
        {safety.uncertain && (
          <Button variant="secondary" onPress={() => router.replace('/(app)/credits')}>
            Revisar créditos
          </Button>
        )}
        <Button onPress={submit} loading={safety.busy} disabled={safety.uncertain || saved}>
          {editing ? 'Guardar cambios' : 'Registrar crédito'}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
  },
  introIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  introCopy: { flex: 1, gap: spacing.xs },
});

export default withFormSession(CreditForm);
