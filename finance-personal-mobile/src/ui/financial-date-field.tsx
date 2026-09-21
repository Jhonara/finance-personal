import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nativeFromLocalDate, localDateFromNative, formatLocalDate } from '@/utils/local-date';
import { colors, radius, sizes, spacing, typography } from '@/theme';
export function FinancialDateField({
  label,
  value,
  onChange,
  error,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  error?: string;
  maximumDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const pickerValue = value || localDateFromNative(new Date());
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <Text style={[typography.body, !value && styles.placeholder]}>
          {value ? formatLocalDate(value) : 'Selecciona una fecha'}
        </Text>
        <Ionicons name="calendar-outline" size={sizes.icon} color={colors.primary} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={nativeFromLocalDate(pickerValue)}
          mode="date"
          maximumDate={maximumDate ? nativeFromLocalDate(maximumDate) : undefined}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(localDateFromNative(date));
          }}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  control: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  placeholder: { color: colors.textMuted },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  error: { ...typography.caption, color: colors.danger },
});
