import { View } from 'react-native';
import { Input, MoneyInput } from '@/ui/primitives';
import { FinancialDateField } from '@/ui/financial-date-field';
import { spacing } from '@/theme';

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
        helperText="Es la tasa anual usada por el crédito."
        keyboardType="decimal-pad"
        value={values.annualRate}
        onChangeText={(v) => onChange('annualRate', v)}
        error={errors.annualRate?.message}
        disabled={busy}
      />
      <Input
        label="Plazo en meses"
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
      <Input
        label="Día de pago"
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
