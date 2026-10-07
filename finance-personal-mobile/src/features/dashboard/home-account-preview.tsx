import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { DashboardMonth } from '@/api/dashboard-api';
import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';

type Account = NonNullable<DashboardMonth['accounts']>[number];
type IconName = keyof typeof Ionicons.glyphMap;

const appearances: Record<
  NonNullable<Account['type']>,
  {
    icon: IconName;
    start: string;
    end: string;
    ink: string;
    badge: string;
  }
> = {
  BANK: {
    icon: 'business-outline',
    start: colors.primaryStrong,
    end: colors.primary,
    ink: colors.surface,
    badge: colors.heroSoft,
  },
  CASH: {
    icon: 'cash-outline',
    start: colors.warningSoft,
    end: colors.surface,
    ink: colors.primaryStrong,
    badge: colors.warningSoft,
  },
  DIGITAL_WALLET: {
    icon: 'phone-portrait-outline',
    start: colors.infoSoft,
    end: colors.surface,
    ink: colors.primaryStrong,
    badge: colors.infoSoft,
  },
  SAVINGS: {
    icon: 'leaf-outline',
    start: colors.secondarySoft,
    end: colors.surface,
    ink: colors.primaryStrong,
    badge: colors.secondarySoft,
  },
  INVESTMENT: {
    icon: 'trending-up-outline',
    start: colors.lavenderSoft,
    end: colors.surface,
    ink: colors.primaryStrong,
    badge: colors.lavenderSoft,
  },
  OTHER: {
    icon: 'wallet-outline',
    start: colors.surfaceSecondary,
    end: colors.surface,
    ink: colors.primaryStrong,
    badge: colors.primarySoft,
  },
};

export function HomeAccountPreview({
  account,
  privacyHidden,
  compact,
  onPress,
}: {
  account: Account;
  privacyHidden: boolean;
  compact: boolean;
  onPress?: () => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = compact ? width - spacing.lg * 2 : (width - spacing.lg * 2 - spacing.sm) / 2;
  const appearance = appearances[account.type ?? 'OTHER'];
  const label = accountTypeLabel(account.type);
  const shortLabel = account.type === 'DIGITAL_WALLET' ? 'BILLETERA' : label.toUpperCase();
  const amount =
    typeof account.balance === 'number' && Number.isFinite(account.balance) && account.currency
      ? formatPrivateMoney(account.balance, account.currency, privacyHidden)
      : 'Saldo no disponible';
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${account.name ?? 'Cuenta'}, ${label}, ${amount}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { width: cardWidth, flexBasis: cardWidth },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[appearance.start, appearance.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.orb, { backgroundColor: appearance.badge }]} pointerEvents="none" />
        <View style={styles.top}>
          <Text numberOfLines={1} style={[styles.type, { color: appearance.ink }]}>
            {shortLabel}
            {account.currency ? ` · ${account.currency}` : ''}
          </Text>
          <Ionicons name={appearance.icon} size={19} color={appearance.ink} />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.name, { color: appearance.ink }]}>
            {account.name ?? 'Cuenta'}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.amount, { color: appearance.ink }]}
          >
            {amount}
          </Text>
        </View>
      </LinearGradient>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flexGrow: 0, minWidth: 0, borderRadius: radius.large, ...shadows.card },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  card: {
    minHeight: 120,
    overflow: 'hidden',
    borderRadius: radius.large,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  orb: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    right: -48,
    top: -48,
    opacity: 0.42,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  copy: { gap: spacing.xxs },
  type: {
    ...typography.caption,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.2,
    fontWeight: '700',
    flex: 1,
  },
  name: { ...typography.caption, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  amount: { ...typography.moneySmall, fontSize: 18, lineHeight: 23 },
});
