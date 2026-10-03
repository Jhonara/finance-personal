import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

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
  const appearance = appearances[account.type ?? 'OTHER'];
  const label = accountTypeLabel(account.type);
  const amount =
    typeof account.balance === 'number' && Number.isFinite(account.balance) && account.currency
      ? formatPrivateMoney(account.balance, account.currency, privacyHidden)
      : 'Saldo no disponible';
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${account.name ?? 'Cuenta'}, ${label}, ${amount}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, compact && styles.compact, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[appearance.start, appearance.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.orb, { backgroundColor: appearance.badge }]} pointerEvents="none" />
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: appearance.badge }]}>
            <Ionicons name={appearance.icon} size={20} color={appearance.ink} />
          </View>
          <Ionicons name="arrow-forward" size={17} color={appearance.ink} />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.type, { color: appearance.ink }]}>
            {label.toUpperCase()}
            {account.currency ? ` · ${account.currency}` : ''}
          </Text>
          <Text numberOfLines={2} style={[typography.cardTitle, { color: appearance.ink }]}>
            {account.name ?? 'Cuenta'}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[typography.moneySmall, { color: appearance.ink }]}
          >
            {amount}
          </Text>
        </View>
      </LinearGradient>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flexBasis: '47%', flexGrow: 1, minWidth: 0, borderRadius: radius.large, ...shadows.card },
  compact: { flexBasis: '100%' },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  card: {
    minHeight: 148,
    overflow: 'hidden',
    borderRadius: radius.large,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.md,
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
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.xs },
  type: { ...typography.caption, fontSize: 10, letterSpacing: 0.3 },
});
