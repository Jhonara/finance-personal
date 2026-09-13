import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAccountMutation } from '@/features/mutations';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, spacing, typography } from '@/theme';
import { ScreenHeader } from '@/ui/headers';
import { ModalSelector } from '@/ui/modal-selector';
import { Button, Input, Screen, SelectField } from '@/ui/primitives';

const accountTypes = [
  { id: 0, value: 'CASH', label: 'Efectivo', helper: 'Dinero que manejas en efectivo' },
  { id: 1, value: 'BANK', label: 'Banco', helper: 'Cuenta bancaria tradicional' },
  { id: 2, value: 'DIGITAL_WALLET', label: 'Billetera digital', helper: 'Nequi, Daviplata u otra billetera' },
  { id: 3, value: 'SAVINGS', label: 'Ahorros', helper: 'Dinero reservado para ahorrar' },
  { id: 4, value: 'INVESTMENT', label: 'Inversión', helper: 'Inversiones y productos financieros' },
  { id: 5, value: 'OTHER', label: 'Otro', helper: 'Otro lugar donde administras dinero' },
] as const;

export default function AccountForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof accountTypes)[number]['value']>('CASH');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const mutation = useAccountMutation();
  const feedback = useFeedback();
  const selectedType = accountTypes.find((option) => option.value === type)!;
  const submit = () => {
    if (!name.trim()) return;
    mutation.mutate(
      { name: name.trim(), type, currency: 'COP' },
      {
        onSuccess: () => {
          feedback.show('Cuenta creada. Ya puedes registrar movimientos.', 'success');
          router.back();
        },
        onError: () => feedback.show('No fue posible crear la cuenta. Inténtalo nuevamente.', 'error'),
      },
    );
  };
  return (
    <Screen scroll keyboard>
      <ScreenHeader
        title="Nueva cuenta"
        subtitle="Organiza dónde manejas tu dinero"
        back
        onBack={() => router.back()}
      />
      <View style={styles.intro}>
        <Text style={typography.cardTitle}>Tu primera cuenta abre el camino</Text>
        <Text style={typography.bodySecondary}>
          Podrás registrar saldo, ingresos, gastos y transferencias con mayor claridad.
        </Text>
      </View>
      <View style={styles.form}>
        <Input
          label="Nombre"
          helperText="Ej. Bancolombia, Efectivo o Nequi"
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la cuenta"
        />
        <SelectField label="Tipo" value={selectedType.label} onPress={() => setSelectorOpen(true)} />
        <Text style={styles.helper}>{selectedType.helper}</Text>
        <Input label="Moneda" helperText="Moneda principal de esta cuenta" value="COP" editable={false} />
        <Button loading={mutation.isPending} disabled={mutation.isPending || !name.trim()} onPress={submit}>
          Crear cuenta
        </Button>
      </View>
      <ModalSelector
        visible={selectorOpen}
        label="Tipo de cuenta"
        selectedId={accountTypes.find((option) => option.value === type)?.id}
        options={accountTypes.map(({ id, label, helper }) => ({ id, label: `${label} · ${helper}` }))}
        onClose={() => setSelectorOpen(false)}
        onSelect={(id) => setType(accountTypes.find((option) => option.id === id)?.value ?? 'CASH')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.primarySoft,
  },
  form: { gap: spacing.lg, paddingTop: spacing.xl },
  helper: { ...typography.caption, marginTop: -spacing.md, color: colors.textSecondary },
});
