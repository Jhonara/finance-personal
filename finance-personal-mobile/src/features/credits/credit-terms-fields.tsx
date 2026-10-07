import { Text, View } from 'react-native';
import { Input, MoneyInput } from '@/ui/primitives';
import { FinancialDateField } from '@/ui/financial-date-field';
import { spacing, typography } from '@/theme';

export type TermValues = {
  principal: string;
  annualRate: string;
  termMonths: string;
  paymentDay: string;
  disbursementDate: string;
};
export function CreditTermsFields({
  values,
  onChange,
  errors,
  currency,
  busy,
  hidden,
}: {
  values: TermValues;
  onChange(key: keyof TermValues, value: string): void;
  errors: Partial<Record<keyof TermValues, { message?: string }>>;
  currency?: string;
  busy: boolean;
  hidden: boolean;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MoneyInput
        label="Principal original"
        helperText="Monto que te prestaron al comienzo, antes de cualquier pago."
        placeholder="0"
        currency={currency ?? ''}
        value={values.principal}
        onChangeText={(v) => onChange('principal', v)}
        error={errors.principal?.message}
        disabled={busy}
        secureTextEntry={hidden}
      />
      <Input
        label="Tasa efectiva anual (EA)"
        accessibilityLabel="Tasa efectiva anual (EA)"
        helperText="Copia la tasa EA del extracto. Si dice 8,4 %, escribe 8,4; no la tasa mensual."
        keyboardType="decimal-pad"
        value={values.annualRate}
        onChangeText={(v) => onChange('annualRate', v)}
        error={errors.annualRate?.message}
        disabled={busy}
      />
      <Input
        label="Plazo en meses"
        helperText="Duración original del préstamo. Por ejemplo, 20 años son 240 meses."
        accessibilityLabel="Plazo en meses"
        keyboardType="number-pad"
        value={values.termMonths}
        onChangeText={(v) => onChange('termMonths', v)}
        error={errors.termMonths?.message}
        disabled={busy}
      />
      <FinancialDateField
        label="Fecha de desembolso"
        value={values.disbursementDate}
        onChange={(v) => {
          if (!busy) onChange('disbursementDate', v);
        }}
        error={errors.disbursementDate?.message}
      />
      <Text style={typography.caption}>Día en que recibiste el préstamo, aunque haya sido hace años.</Text>
      <Input
        label="Día de pago"
        helperText="Día habitual de cada mes, del 1 al 31. Por ejemplo, 5 si pagas el día 5."
        accessibilityLabel="Día de pago"
        keyboardType="number-pad"
        value={values.paymentDay}
        onChangeText={(v) => onChange('paymentDay', v)}
        error={errors.paymentDay?.message}
        disabled={busy}
      />
    </View>
  );
}
