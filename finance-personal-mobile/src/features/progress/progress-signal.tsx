import { MotionPressable } from '@/ui/motion';
import { HomeCompanion } from '@/features/dashboard/home-brand';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, motion, radius, spacing, typography } from '@/theme';
import { Progress } from '@/ui/progress';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { financialProgress, type FinancialProgressSignal } from './financial-progress';
import { useCachedProgressCredits } from './use-cached-progress-credits';

export function ProgressSignal({
  signal,
  width = '100%',
}: {
  signal: FinancialProgressSignal;
  width?: number | '100%';
}) {
  const { hidden } = usePrivacy();
  const reducedMotion = useReducedMotion();
  const amount = signal.amount
    ? `${!hidden && signal.kind === 'flow' && signal.amount.value > 0 ? '+' : ''}${formatPrivateMoney(signal.amount.value, signal.amount.currency, hidden)}`
    : undefined;
  const label = `${signal.accessibility} ${signal.supporting}${signal.amount ? ` ${hidden ? 'Importe oculto.' : amount}` : ''}`;
  const content = (
    <LinearGradient colors={['#DDF6FC', '#E7FBF6']} style={styles.content}>
      <HomeCompanion size={58} />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{signal.eyebrow}</Text>
        <Text style={styles.title}>{signal.title}</Text>
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        {signal.percentage !== undefined ? (
          <Progress
            value={signal.percentage}
            color={colors.success}
            label={signal.accessibility}
            animated={!reducedMotion}
          />
        ) : null}
        {!amount ? <Text style={styles.supporting}>{signal.supporting}</Text> : null}
        {signal.destination ? (
          <Text style={styles.link}>{signal.kind === 'flow' ? 'Ver movimientos →' : 'Ver detalle →'}</Text>
        ) : null}
      </View>
    </LinearGradient>
  );
  const style = [styles.card, { width }];
  return signal.destination ? (
    <MotionPressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre el detalle de esta señal"
      style={({ pressed }) => [style, pressed && { opacity: 0.8 }]}
      onPress={() => router.push(signal.destination!)}
    >
      {content}
    </MotionPressable>
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
  const reducedMotion = useReducedMotion();
  const signals = financialProgress({ dashboard, period, cachedCredits });
  const entrance = useRef(new Animated.Value(0)).current;
  const appeared = useRef(false);
  const visible = signals.length > 0;
  useEffect(() => {
    if (!visible || appeared.current) return;
    appeared.current = true;
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
      entrance.setValue(1);
    };
  }, [visible, entrance, reducedMotion]);
  if (!visible) return null;
  return (
    <Animated.View
      style={{
        gap: spacing.sm,
        marginTop: spacing.xl,
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      <Text accessibilityRole="header" style={styles.heading}>
        Para ti
      </Text>
      <ProgressSignal signal={signals[0]!} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.large, overflow: 'hidden' },
  heading: { ...typography.sectionTitle, fontSize: 17, lineHeight: 23 },
  content: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.caption, fontSize: 10, lineHeight: 14, color: colors.success, fontWeight: '700' },
  title: { ...typography.label, color: colors.primaryStrong, fontSize: 13, lineHeight: 18 },
  amount: { ...typography.moneySmall, color: colors.success, fontSize: 16, lineHeight: 21 },
  supporting: { ...typography.caption, color: colors.textPrimary, lineHeight: 17 },
  link: { ...typography.caption, color: colors.success, fontWeight: '700', paddingTop: spacing.xs },
});
