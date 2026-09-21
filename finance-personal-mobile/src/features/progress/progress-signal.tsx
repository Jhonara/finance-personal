import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, spacing, typography } from '@/theme';
import { Progress } from '@/ui/progress';
import { financialProgress, type FinancialProgressSignal } from './financial-progress';
import { useCachedProgressCredits } from './use-cached-progress-credits';

const tones = {
  flow: colors.primarySoft,
  budget: colors.warningSoft,
  savings: colors.lavenderSoft,
  credit: colors.accentSoft,
};

export function ProgressSignal({ signal, width }: { signal: FinancialProgressSignal; width: number }) {
  const { hidden } = usePrivacy();
  const amount = signal.amount
    ? formatPrivateMoney(signal.amount.value, signal.amount.currency, hidden)
    : undefined;
  const label = `${signal.accessibility} ${signal.supporting}${signal.amount ? ` ${hidden ? 'Importe oculto.' : amount}` : ''}`;
  const content = (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
      <Text style={styles.eyebrow}>{signal.eyebrow}</Text>
      <Text style={typography.cardTitle}>{signal.title}</Text>
      {amount ? <Text style={typography.moneySmall}>{amount}</Text> : null}
      {signal.percentage !== undefined ? (
        <Progress value={signal.percentage} color={colors.primary} label={signal.accessibility} />
      ) : null}
      <Text style={styles.supporting}>{signal.supporting}</Text>
      {signal.destination ? <Text style={styles.link}>Ver detalle →</Text> : null}
    </View>
  );
  const style = [styles.card, { width, backgroundColor: tones[signal.kind] }];
  return signal.destination ? (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre el detalle de esta señal"
      style={style}
      onPress={() => router.push(signal.destination!)}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={label} style={style}>
      {content}
    </View>
  );
}

export function FinancialProgressSection({
  dashboard,
  period,
}: {
  dashboard: DashboardMonth;
  period: DashboardPeriod;
}) {
  const cachedCredits = useCachedProgressCredits();
  const signals = financialProgress({ dashboard, period, cachedCredits });
  const { width } = useWindowDimensions();
  const entrance = useRef(new Animated.Value(0)).current;
  const appeared = useRef(false);
  const visible = signals.length > 0;
  useEffect(() => {
    if (!visible || appeared.current) return;
    appeared.current = true;
    const animation = Animated.timing(entrance, { toValue: 1, duration: 220, useNativeDriver: true });
    animation.start();
    return () => {
      animation.stop();
      entrance.setValue(1);
    };
  }, [visible, entrance]);
  if (!visible) return null;
  const cardWidth = Math.max(
    160,
    Math.min(signals.length === 1 ? 340 : 270, width - 2 * spacing.xl - (signals.length > 1 ? 24 : 0)),
  );
  return (
    <Animated.View
      style={{
        gap: spacing.md,
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Tu progreso
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {signals.map((signal) => (
          <ProgressSignal key={signal.kind} signal={signal} width={cardWidth} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md },
  card: { borderRadius: radius.large, padding: spacing.lg },
  content: { gap: spacing.sm, flex: 1 },
  eyebrow: { ...typography.caption, color: colors.primaryStrong },
  supporting: { ...typography.caption, color: colors.textPrimary, lineHeight: 18 },
  link: { ...typography.caption, color: colors.primaryStrong, marginTop: 'auto', paddingTop: spacing.xs },
});
