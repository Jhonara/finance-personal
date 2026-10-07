import { openForm } from '@/features/forms/form-session';
import { TourTarget } from '@/ui/tour-target';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useCredits } from '@/features/secondary/use-secondary';
import { creditGroups, creditMoney, creditSummary } from '@/features/credits/credit-presentation';
import { CreditCard } from '@/features/credits/credit-components';
import { PlanTabs } from '@/features/budgets/plan-tabs';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Screen } from '@/ui/primitives';
import { BrandMascot, BrandMark } from '@/ui/brand-media';
import { MotionPressable } from '@/ui/motion';
import { ErrorState, Skeleton } from '@/ui/states';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export default function CreditsScreen() {
  const query = useCredits();
  const { width, fontScale } = useWindowDimensions();
  const compactHeader = width <= 360 || fontScale >= 1.2;
  const { hidden } = usePrivacy();
  const add = () => openForm('/(app)/credit-form');
  return (
    <Screen
      entry
      scroll
      style={styles.screen}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <View style={styles.header}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={21} color={colors.primaryStrong} />
        </MotionPressable>
        {!compactHeader ? <BrandMark size={32} /> : null}
        <View style={styles.headerCopy}>
          {!compactHeader ? <Text style={styles.eyebrow}>TU PLAN</Text> : null}
          <Text accessibilityRole="header" style={styles.title}>
            Créditos
          </Text>
        </View>
        {query.data?.length ? (
          <TourTarget id="add-credit">
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Agregar crédito"
              onPress={add}
              style={styles.add}
            >
              <Text style={styles.addText}>+ Nuevo</Text>
            </MotionPressable>
          </TourTarget>
        ) : null}
      </View>
      <PlanTabs selected="credits" />
      {query.isPending ? (
        <Skeleton height={160} />
      ) : !query.data ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <View style={styles.empty}>
          <BrandMascot size={78} />
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Tus deudas, bajo control
          </Text>
          <Text style={styles.emptyText}>
            Registra un crédito para seguir el saldo pendiente, las cuotas y tus pagos.
          </Text>
          <TourTarget id="add-credit">
            <Button onPress={add}>Agregar crédito</Button>
          </TourTarget>
        </View>
      ) : (
        <>
          {query.isError ? (
            <Text style={typography.caption}>
              No pudimos actualizar. Estos son los últimos datos disponibles.
            </Text>
          ) : null}
          <LinearGradient colors={[colors.heroStart, '#164E62']} style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>PANORAMA DE CRÉDITOS</Text>
                <Text style={styles.heroTitle}>Cada pago cuenta</Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="card-outline" size={25} color={colors.mint} />
              </View>
            </View>
            <Text style={styles.heroHint}>Saldos pendientes reales, separados por moneda.</Text>
            {creditSummary(query.data).map((summary) => (
              <View
                key={summary.currency ?? 'unknown'}
                style={[styles.summaryRow, compactHeader && styles.summaryRowCompact]}
              >
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryCurrency}>{summary.currency ?? 'Moneda no disponible'}</Text>
                  <Text style={styles.summaryCount}>
                    {summary.active}{' '}
                    {summary.active === 1 ? 'crédito por completar' : 'créditos por completar'}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={styles.summaryAmount}
                >
                  {creditMoney(summary.total, summary.currency, hidden)}
                </Text>
              </View>
            ))}
          </LinearGradient>
          <TourTarget id="credit-list">
            <View style={{ gap: spacing.lg }}>
              {creditGroups(query.data).map((group) => (
                <View key={group.title} style={styles.group}>
                  <View style={styles.groupHeading}>
                    <Text accessibilityRole="header" style={typography.sectionTitle}>
                      {group.title}
                    </Text>
                    <Text style={typography.caption}>{group.credits.length}</Text>
                  </View>
                  {group.credits.map((credit, index) => (
                    <CreditCard
                      key={credit.id ?? index}
                      credit={credit}
                      hidden={hidden}
                      onPress={() =>
                        router.push({ pathname: '/(app)/credit-detail', params: { id: credit.id } })
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          </TourTarget>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: 39,
    height: 39,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    ...typography.caption,
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: { ...typography.sectionTitle, color: colors.primaryStrong },
  add: {
    minHeight: 41,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { ...typography.caption, color: colors.surface, fontWeight: '700' },
  hero: { gap: spacing.md, padding: spacing.lg, borderRadius: 25, ...shadows.card },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.xs },
  heroEyebrow: {
    ...typography.caption,
    color: '#A7E7D9',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: { ...typography.sectionTitle, color: colors.surface },
  heroIcon: {
    width: 45,
    height: 45,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHint: { ...typography.caption, color: '#C3E5E4' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: '#FFFFFF1C',
  },
  summaryRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  summaryCopy: { flex: 1, gap: spacing.xxs },
  summaryCurrency: { ...typography.label, color: colors.surface },
  summaryCount: { ...typography.caption, color: '#C3E5E4' },
  summaryAmount: { ...typography.moneySmall, color: colors.surface, flexShrink: 1 },
  group: { gap: spacing.md },
  groupHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: {
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.large,
    backgroundColor: colors.infoSoft,
  },
  emptyText: { ...typography.bodySecondary, textAlign: 'center' },
});
