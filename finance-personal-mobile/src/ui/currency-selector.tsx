import { useState } from 'react';
import { Text, View } from 'react-native';
import { ModalSelector } from './modal-selector';
import { SelectField } from './primitives';
import { colors, spacing, typography } from '@/theme';

const currencies = [
  { code: 'COP', name: 'Peso colombiano' },
  { code: 'USD', name: 'Dólar estadounidense' },
  { code: 'EUR', name: 'Euro' },
];

export function CurrencySelector({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = currencies.findIndex((item) => item.code === value);
  return (
    <View style={{ gap: spacing.sm }}>
      <SelectField
        label="Moneda"
        value={selected >= 0 ? `${value} · ${currencies[selected]!.name}` : value}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <Text style={typography.caption}>
        Cada moneda mantiene sus propios importes. No se hace conversión automática.
      </Text>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <ModalSelector
        visible={open}
        label="Elige la moneda"
        selectedId={selected}
        onClose={() => setOpen(false)}
        onSelect={(id) => {
          const item = currencies[id];
          if (item) onChange(item.code);
        }}
        options={currencies.map((item, id) => ({
          id,
          label: `${item.code} · ${item.name}`,
          icon: 'cash-outline',
        }))}
      />
    </View>
  );
}
