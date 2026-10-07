import { openForm } from '@/features/forms/form-session';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { Button, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import {
  MovementAmountPanel,
  MovementFormHeader,
  MovementFormIntro,
  MovementFormSection,
} from '@/ui/movement-form';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useTransferMutation } from '@/features/mutations';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
import { useFeedback } from '@/feedback/feedback-provider';
import { isInsufficientBalanceError } from '@/features/transactions/transfer-errors';
import { financialErrorMessage, unavailableResource } from '@/features/transactions/form-errors';
import { accountKeys } from '@/features/accounts/use-accounts';
import { ModalSelector } from '@/ui/modal-selector';
import { colors, radius, spacing, typography } from '@/theme';
function NewTransferScreen() {
  const activeSession = useFormSessionActive();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<number>();
  const [destination, setDestination] = useState<number>();
  const [effectiveDate, setEffectiveDate] = useState(() => localDateFromNative(new Date()));
  const [selector, setSelector] = useState<'source' | 'destination' | null>(null);
  const accounts = useAccounts();
  const mutation = useTransferMutation();
  const feedback = useFeedback();
  const client = useQueryClient();
  const active = accounts.data?.filter((a) => a.active) ?? [];
  const sourceAccount = active.find((account) => account.id === source);
  const destinations = sourceAccount
    ? active.filter((account) => account.id !== source && account.currency === sourceAccount.currency)
    : [];
  const submit = () => {
    const parsedAmount = Number(amount);
    if (
      !source ||
      !destination ||
      source === destination ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      feedback.show('Selecciona cuentas distintas de la misma moneda e ingresa un monto válido.', 'warning');
      return;
    }
    mutation.mutate(
      {
        sourceAccountId: source,
        destinationAccountId: destination,
        amount: parsedAmount,
        effectiveDate,
      },
      {
        onSuccess: () => {
          if (!activeSession()) return;
          setAmount('');
          setSource(undefined);
          setDestination(undefined);
          setEffectiveDate(localDateFromNative(new Date()));
          setSelector(null);
          mutation.reset();
          feedback.show('Transferencia realizada.', 'success');
          router.back();
        },
        onError: (error) => {
          if (!activeSession()) return;
          if (isInsufficientBalanceError(error)) {
            feedback.show('Saldo insuficiente para realizar la transferencia.', 'error');
            return;
          }
          const resource = unavailableResource(error);
          if (resource === 'account') {
            feedback.show('La cuenta seleccionada ya no está disponible.', 'error');
            void client.invalidateQueries({ queryKey: accountKeys.all });
            return;
          }
          const message = financialErrorMessage(error);
          if (message) feedback.show(message, 'error');
        },
      },
    );
  };
  return (
    <Screen entry scroll keyboard>
      <MovementFormHeader title="Nueva transferencia" onBack={() => router.back()} />
      <View style={styles.form}>
        <MovementFormIntro
          kind="transfer"
          title="Mueve dinero entre cuentas"
          description="Elige origen y destino de la misma moneda."
        />
        {active.length < 2 ? (
          <View style={styles.needAccount}>
            <Text style={typography.cardTitle}>Necesitas otra cuenta</Text>
            <Text style={typography.bodySecondary}>
              Las transferencias mueven dinero entre dos cuentas de la misma moneda.
            </Text>
            <Button variant="secondary" onPress={() => openForm('/(app)/account-form')}>
              Crear cuenta
            </Button>
          </View>
        ) : null}
        <MovementFormSection
          title="De dónde a dónde"
          subtitle="Primero elige la cuenta de salida."
          icon="swap-horizontal-outline"
        >
          <SelectField
            label="Cuenta de origen"
            value={sourceAccount?.name}
            placeholder="Selecciona una cuenta"
            onPress={() => setSelector('source')}
          />
          <SelectField
            label="Cuenta de destino"
            value={destinations.find((a) => a.id === destination)?.name}
            placeholder={source ? 'Selecciona una cuenta destino' : 'Elige primero la cuenta origen'}
            disabled={!source}
            onPress={() => source && setSelector('destination')}
          />
          {source && destination ? (
            <Button
              variant="secondary"
              size="compact"
              accessibilityLabel="Intercambiar cuentas"
              onPress={() => {
                const nextSource = destination;
                const nextDestination = source;
                if (
                  active.find((account) => account.id === nextSource)?.currency ===
                  active.find((account) => account.id === nextDestination)?.currency
                ) {
                  setSource(nextSource);
                  setDestination(nextDestination);
                }
              }}
            >
              Intercambiar cuentas
            </Button>
          ) : null}
          {source && !destinations.length ? (
            <Text style={styles.warning}>
              Necesitas al menos dos cuentas de la misma moneda para transferir dinero.
            </Text>
          ) : null}
        </MovementFormSection>
        <MovementAmountPanel kind="transfer">
          <MoneyInput
            label="Monto a transferir"
            placeholder="0"
            currency={sourceAccount?.currency ?? 'COP'}
            value={amount}
            onChangeText={setAmount}
          />
        </MovementAmountPanel>
        <MovementFormSection
          title="Fecha"
          subtitle="Hoy por defecto; puedes elegir otra fecha."
          icon="calendar-outline"
        >
          <FinancialDateField label="Fecha" value={effectiveDate} onChange={setEffectiveDate} />
        </MovementFormSection>
        <Text style={styles.explanation}>Las transferencias no cuentan como ingreso ni gasto.</Text>
        <Button
          loading={mutation.isPending}
          disabled={mutation.isPending || active.length < 2}
          onPress={submit}
        >
          Transferir
        </Button>
      </View>
      <ModalSelector
        visible={selector === 'source'}
        label="Cuenta origen"
        selectedId={source}
        loading={accounts.isPending}
        options={active
          .filter((account) => account.id !== undefined)
          .map((account) => ({
            id: account.id!,
            label: `${account.name ?? 'Cuenta'} · ${account.currency}`,
          }))}
        onClose={() => setSelector(null)}
        onSelect={(id) => {
          setSource(id);
          setDestination(undefined);
        }}
      />
      <ModalSelector
        visible={selector === 'destination'}
        label="Cuenta destino"
        selectedId={destination}
        options={destinations
          .filter((account) => account.id !== undefined)
          .map((account) => ({
            id: account.id!,
            label: `${account.name ?? 'Cuenta'} · ${account.currency}`,
          }))}
        onClose={() => setSelector(null)}
        onSelect={setDestination}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingTop: spacing.sm },
  warning: { ...typography.caption, color: colors.warning },
  explanation: { ...typography.caption, color: colors.textSecondary },
  needAccount: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.warningSoft,
  },
});

export default withFormSession(NewTransferScreen);
