import { themedStyleSheet } from '@/theme/themed-styles';
import { MotionPressable, ScreenEntry } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import { TourScrollContext, useTour } from '@/features/onboarding/tour-context';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ScrollViewInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/theme-provider';
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
  entry = false,
  scrollRef: externalScrollRef,
}: PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  entry?: boolean;
  scrollRef?: RefObject<ScrollViewInstance | null>;
}>) {
  const tour = useTour();
  const { palette } = useAppTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const scrollContext = useMemo(() => ({ ref: scrollRef, offset }), []);
  const ScrollContainer = keyboard ? KeyboardAwareScrollView : ScrollView;
  const content = scroll ? (
    <ScrollContainer
      ref={(instance) => {
        scrollRef.current = instance;
        if (externalScrollRef) externalScrollRef.current = instance;
      }}
      {...(keyboard ? { bottomOffset: 24 } : {})}
      onScroll={(event) => {
        offset.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      contentContainerStyle={[
        styles.scroll,
        padded && styles.padding,
        style,
        tour?.active && { paddingBottom: 400 },
      ]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {entry ? (
        <ScreenEntry style={{ gap: style?.gap ?? spacing.lg, rowGap: style?.rowGap }}>{children}</ScreenEntry>
      ) : (
        children
      )}
    </ScrollContainer>
  ) : (
    <View style={[styles.fill, padded && styles.padding, style]}>
      {entry ? <ScreenEntry>{children}</ScreenEntry> : children}
    </View>
  );
  return (
    <TourScrollContext.Provider value={scrollContext}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safe, { backgroundColor: palette.background }]}
      >
        {content}
      </SafeAreaView>
    </TourScrollContext.Provider>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'regular',
  tone = 'primary',
  loading = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  style,
}: PropsWithChildren<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'regular' | 'compact';
  tone?: 'primary' | 'warning' | 'info' | 'success' | 'danger' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  const blocked = isButtonDisabled(disabled, loading);
  const { palette } = useAppTheme();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        variant === 'primary' && { backgroundColor: palette.primaryStrong },
        variant === 'secondary' && { backgroundColor: palette.primarySoft },
        variant === 'outline' && { backgroundColor: palette.surface, borderColor: palette.border },
        variant === 'secondary' && secondaryToneStyles[tone],
        variant === 'outline' && tone === 'danger' && { borderColor: colors.danger },
        size === 'compact' && styles.buttonCompact,
        style,
        (pressed || blocked) && styles.buttonPressed,
        blocked && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : palette.primary}
        />
      ) : (
        <Text
          style={[
            typography.button,
            styles.buttonCopy,
            styles[`buttonText_${variant}`],
            { color: variant === 'primary' || variant === 'danger' ? '#FFFFFF' : palette.primary },
            variant === 'secondary' && secondaryToneTextStyles[tone],
            (variant === 'outline' || variant === 'ghost') && secondaryToneTextStyles[tone],
          ]}
        >
          {children}
        </Text>
      )}
    </MotionPressable>
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
  const { palette } = useAppTheme();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'primary' && styles.iconPrimary,
        tone === 'primary' && { backgroundColor: palette.primarySoft },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={name}
        size={sizes.icon}
        color={tone === 'primary' ? palette.primary : palette.textPrimary}
      />
    </MotionPressable>
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
  const [focused, setFocused] = useState(false);
  const { palette } = useAppTheme();
  const isPassword = Boolean(secureTextEntry);
  return (
    <View style={styles.field}>
      {label ? <Text style={[typography.label, { color: palette.textSecondary }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputShell,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          disabled && styles.disabled,
          {
            backgroundColor: focused ? palette.primarySoft : palette.surface,
            borderColor: error ? palette.danger : focused ? palette.primary : palette.border,
          },
        ]}
      >
        {icon && <Ionicons name={icon} size={sizes.icon} color={palette.textMuted} />}
        <TextInput
          editable={!disabled}
          placeholderTextColor={palette.textMuted}
          style={[typography.body, styles.input, { color: palette.textPrimary }, style]}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          secureTextEntry={isPassword && !passwordVisible}
        />
        {isPassword && (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setPasswordVisible((visible) => !visible)}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={sizes.icon}
              color={palette.textSecondary}
            />
          </MotionPressable>
        )}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[typography.caption, { color: palette.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

export function MoneyInput({
  value,
  onChangeText,
  currency = 'COP',
  label = 'Monto',
  error,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Input>, 'onChangeText' | 'value'> & {
  value: string;
  onChangeText(value: string): void;
  currency?: string;
}) {
  const [focused, setFocused] = useState(false);
  const { palette } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[typography.label, { color: palette.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.moneyShell,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          disabled && styles.disabled,
          {
            backgroundColor: focused ? palette.primarySoft : palette.surface,
            borderColor: error ? palette.danger : focused ? palette.primary : palette.border,
          },
        ]}
      >
        <Text style={[styles.currency, { color: palette.primary }]}>{currency}</Text>
        <TextInput
          accessibilityLabel={label}
          editable={!disabled}
          keyboardType="decimal-pad"
          value={formatMoneyInput(value)}
          onChangeText={(next) => onChangeText(preserveMoneyInput(next))}
          placeholderTextColor={palette.textMuted}
          style={[typography.moneyLarge, styles.moneyInput, { color: palette.textPrimary }]}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : props.helperText ? (
        <Text style={[typography.caption, { color: palette.textMuted }]}>{props.helperText}</Text>
      ) : null}
    </View>
  );
}

export function SelectField({
  label,
  value,
  placeholder = 'Seleccionar',
  onPress,
  disabled = false,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[typography.label, { color: palette.textSecondary }]}>{label}</Text>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.inputShell,
          styles.select,
          disabled && styles.disabled,
          pressed && styles.pressed,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text
          style={[
            typography.body,
            styles.selectCopy,
            { color: value ? palette.textPrimary : palette.textMuted },
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={sizes.icon} color={palette.textSecondary} />
      </MotionPressable>
    </View>
  );
}

export function DateField({ value, onPress }: { value: string; onPress?: () => void }) {
  return <SelectField label="Fecha" value={value} onPress={onPress} />;
}

export function Card({
  children,
  style,
  tone = 'default',
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'tonal' | 'success' | 'expense' | 'warning' | 'info' | 'accent';
}>) {
  const { palette } = useAppTheme();
  const toneColor =
    tone === 'default'
      ? palette.surface
      : tone === 'tonal'
        ? palette.surfaceSecondary
        : palette[`${tone}Soft`];
  return (
    <View
      style={[
        styles.card,
        cardToneStyles[tone],
        { backgroundColor: toneColor, borderColor: palette.divider },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = themedStyleSheet(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, gap: spacing.lg, paddingBottom: spacing.huge },
  padding: { paddingHorizontal: spacing.lg },
  button: {
    minHeight: sizes.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: { backgroundColor: colors.primaryStrong, borderRadius: radius.pill },
  buttonCopy: { textAlign: 'center', flexShrink: 1 },
  selectCopy: { flex: 1, minWidth: 0 },
  button_secondary: { backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  button_outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: colors.dangerSolid, borderRadius: radius.pill },
  buttonCompact: { minHeight: 44, paddingHorizontal: spacing.lg },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.48 },
  buttonText_primary: { color: '#FFFFFF' },
  buttonText_secondary: { color: colors.primary },
  buttonText_outline: { color: colors.primary },
  buttonText_ghost: { color: colors.primary },
  buttonText_danger: { color: '#FFFFFF' },
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
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
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
  select: { justifyContent: 'space-between', paddingVertical: spacing.sm },
  placeholder: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.card,
  },
}));

const secondaryToneStyles = themedStyleSheet(() => ({
  primary: { backgroundColor: colors.primarySoft },
  warning: { backgroundColor: colors.warningSoft },
  info: { backgroundColor: colors.infoSoft },
  success: { backgroundColor: colors.successSoft },
  danger: { backgroundColor: colors.dangerSoft },
  accent: { backgroundColor: colors.accentSoft },
}));

const secondaryToneTextStyles = themedStyleSheet(() => ({
  primary: { color: colors.primary },
  warning: { color: colors.warning },
  info: { color: colors.info },
  success: { color: colors.success },
  danger: { color: colors.danger },
  accent: { color: colors.accent },
}));

const cardToneStyles = themedStyleSheet(() => ({
  default: {},
  tonal: { backgroundColor: colors.surfaceSecondary },
  success: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  expense: { backgroundColor: colors.expenseSoft, borderColor: colors.expenseSoft },
  warning: { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  info: { backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
  accent: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
}));
