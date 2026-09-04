import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { formatMoneyInput, isButtonDisabled, preserveMoneyInput } from './presentation';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboard = false,
  style,
  refreshing,
  onRefresh,
}: PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}>) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, padded && styles.padding, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padding, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.select({ ios: 'padding', default: undefined })}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: PropsWithChildren<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}>) {
  const blocked = isButtonDisabled(disabled, loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (pressed || blocked) && styles.buttonPressed,
        blocked && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.surface : colors.primary}
        />
      ) : (
        <Text style={[typography.button, styles[`buttonText_${variant}`]]}>{children}</Text>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  tone = 'default',
}: {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  tone?: 'default' | 'primary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'primary' && styles.iconPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={name}
        size={sizes.icon}
        color={tone === 'primary' ? colors.primary : colors.textPrimary}
      />
    </Pressable>
  );
}

export function Input({
  label,
  error,
  helperText,
  disabled,
  icon,
  style,
  secureTextEntry,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  icon?: IconName;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      <View style={[styles.inputShell, Boolean(error) && styles.inputError, disabled && styles.disabled]}>
        {icon && <Ionicons name={icon} size={sizes.icon} color={colors.textMuted} />}
        <TextInput
          editable={!disabled}
          placeholderTextColor={colors.textMuted}
          style={[typography.body, styles.input, style]}
          {...props}
          secureTextEntry={isPassword && !passwordVisible}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setPasswordVisible((visible) => !visible)}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={sizes.icon}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={typography.caption}>{helperText}</Text>
      ) : null}
    </View>
  );
}

export function MoneyInput({
  value,
  onChangeText,
  currency = 'COP',
  ...props
}: Omit<ComponentProps<typeof Input>, 'onChangeText' | 'value'> & {
  value: string;
  onChangeText(value: string): void;
  currency?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{props.label ?? 'Monto'}</Text>
      <View style={styles.moneyShell}>
        <Text style={styles.currency}>{currency}</Text>
        <TextInput
          accessibilityLabel={props.label ?? 'Monto'}
          keyboardType="decimal-pad"
          value={formatMoneyInput(value)}
          onChangeText={(next) => onChangeText(preserveMoneyInput(next))}
          placeholderTextColor={colors.textMuted}
          style={[typography.moneyLarge, styles.moneyInput]}
          {...props}
        />
      </View>
    </View>
  );
}

export function SelectField({
  label,
  value,
  placeholder = 'Seleccionar',
  onPress,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.inputShell, styles.select, pressed && styles.pressed]}
      >
        <Text style={[typography.body, !value && styles.placeholder]}>{value ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={sizes.icon} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export function DateField({ value, onPress }: { value: string; onPress?: () => void }) {
  return <SelectField label="Fecha" value={value} onPress={onPress} />;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.huge },
  padding: { paddingHorizontal: spacing.lg },
  button: {
    minHeight: sizes.button,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.84 },
  buttonDisabled: { opacity: 0.48 },
  buttonText_primary: { color: colors.surface },
  buttonText_secondary: { color: colors.primary },
  buttonText_ghost: { color: colors.primary },
  buttonText_danger: { color: colors.surface },
  iconButton: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  iconPrimary: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  field: { gap: spacing.sm },
  inputShell: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, minHeight: sizes.input, color: colors.textPrimary },
  inputError: { borderColor: colors.danger },
  disabled: { backgroundColor: colors.surfaceSecondary },
  errorText: { ...typography.caption, color: colors.danger },
  moneyShell: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  currency: { ...typography.label, color: colors.primary },
  moneyInput: { flex: 1, minHeight: 72, color: colors.textPrimary },
  select: { justifyContent: 'space-between' },
  placeholder: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
