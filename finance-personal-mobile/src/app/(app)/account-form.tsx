import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAccountMutation } from '@/features/mutations';
import { toApiError } from '@/api/errors';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import { colors, radius, spacing, typography } from '@/theme';
import { ModalSelector } from '@/ui/modal-selector';
import { Button, Input, Screen, SelectField } from '@/ui/primitives';
import { MovementFormHeader } from '@/ui/movement-form';

const accountTypes = [
  { id: 0, value: 'CASH', label: accountTypeLabel('CASH'), helper: 'Dinero que manejas en efectivo' },
  { id: 1, value: 'BANK', label: accountTypeLabel('BANK'), helper: 'Cuenta bancaria tradicional' },
  {
    id: 2,
    value: 'DIGITAL_WALLET',
    label: accountTypeLabel('DIGITAL_WALLET'),
    helper: 'Nequi, Daviplata u otra billetera',
  },
  { id: 3, value: 'SAVINGS', label: accountTypeLabel('SAVINGS'), helper: 'Dinero reservado para ahorrar' },
  {
    id: 4,
    value: 'INVESTMENT',
    label: accountTypeLabel('INVESTMENT'),
    helper: 'Inversiones y productos financieros',
  },
  { id: 5, value: 'OTHER', label: accountTypeLabel('OTHER'), helper: 'Otro lugar donde administras dinero' },
] as const;

function AccountForm() {
  const active = useFormSessionActive();
  const submitting = useRef(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof accountTypes)[number]['value']>('BANK');
  const [currency, setCurrency] = useState('COP');
  const [nameError, setNameError] = useState('');
  const [currencyError, setCurrencyError] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const mutation = useAccountMutation();
  const feedback = useFeedback();
  const tour = useTour();
  const selectedType = accountTypes.find((option) => option.value === type)!;
  const submit = () => {
    if (submitting.current) return;
    const validName = name.trim().length >= 2 && name.trim().length <= 100;
    const validCurrency = /^[A-Z]{3}$/.test(currency.trim());
    setNameError(validName ? '' : 'Escribe un nombre de 2 a 100 caracteres.');
    setCurrencyError(validCurrency ? '' : 'Usa un código de tres letras, como COP.');
    if (!validName || !validCurrency) return;
    submitting.current = true;
    mutation.mutate(
      { name: name.trim(), type, currency: currency.trim() },
      {
        onSuccess: () => {
          if (!active()) return;
          setName('');
          setType('BANK');
          setCurrency('COP');
          setSelectorOpen(false);
          mutation.reset();
          feedback.show('Cuenta creada. Ya puedes registrar movimientos.', 'success');
          tour?.completeStep?.('add-account');
          router.back();
        },
        onError: (error) => {
          if (!active()) return;
          if (toApiError(error).status === 409) setNameError('Ya existe una cuenta con ese nombre.');
          else feedback.show('No fue posible crear la cuenta. Inténtalo nuevamente.', 'error');
        },
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };
  return (
    <Screen entry scroll keyboard>
      <MovementFormHeader title="Nueva cuenta" onBack={() => router.back()} />
      <LinearGradient colors={[colors.primarySoft, '#F8FFFC']} style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="wallet-outline" size={25} color={colors.success} />
        </View>
        <View style={styles.introCopy}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Un lugar para tu dinero
          </Text>
          <Text style={typography.bodySecondary}>
            Registra una cuenta real y sigue su saldo con tus movimientos.
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={typography.cardTitle}>¿Cómo la reconoces?</Text>
          <Input
            label="Nombre"
            helperText="Ej. Bancolombia, efectivo o Nequi"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setNameError('');
            }}
            placeholder="Nombre de la cuenta"
            maxLength={100}
            error={nameError}
          />
          <SelectField
            label="Tipo de cuenta"
            value={selectedType.label}
            onPress={() => setSelectorOpen(true)}
          />
          <Text style={styles.helper}>{selectedType.helper}</Text>
        </View>
        <View style={styles.section}>
          <Text style={typography.cardTitle}>Moneda de la cuenta</Text>
          <CurrencySelector
            value={currency}
            onChange={(value) => {
              setCurrency(value);
              setCurrencyError('');
            }}
            error={currencyError}
            disabled={mutation.isPending}
          />
          {type === 'SAVINGS' ? (
            <Text style={styles.helper}>
              Una cuenta de ahorros guarda dinero. Una meta de ahorro es un objetivo y se sigue por separado.
            </Text>
          ) : null}
        </View>
        <Button loading={mutation.isPending} disabled={mutation.isPending} onPress={submit}>
          Crear cuenta
        </Button>
      </View>
      <ModalSelector
        visible={selectorOpen}
        label="Tipo de cuenta"
        selectedId={accountTypes.find((option) => option.value === type)?.id}
        subtitle="Elige dónde manejas ese dinero."
        options={accountTypes.map(({ id, label, helper, value }) => ({
          id,
          label,
          subtitle: helper,
          icon: (
            {
              CASH: 'cash-outline',
              BANK: 'business-outline',
              DIGITAL_WALLET: 'phone-portrait-outline',
              SAVINGS: 'sparkles-outline',
              INVESTMENT: 'trending-up-outline',
              OTHER: 'wallet-outline',
            } as const
          )[value],
        }))}
        onClose={() => setSelectorOpen(false)}
        onSelect={(id) => setType(accountTypes.find((option) => option.id === id)?.value ?? 'BANK')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
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
  form: { gap: spacing.lg, paddingTop: spacing.sm },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  helper: { ...typography.caption, color: colors.textSecondary },
});

export default withFormSession(AccountForm);
import { CurrencySelector } from '@/ui/currency-selector';
