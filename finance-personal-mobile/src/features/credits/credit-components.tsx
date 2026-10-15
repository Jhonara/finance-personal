import { themedStyleSheet } from '@/theme/themed-styles';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { formatLocalDate } from '@/utils/local-date';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Credit, CreditPlan, CreditSimulation } from '@/features/secondary/secondary-api';
import { Card } from '@/ui/primitives';
import { BrandSurface } from '@/ui/brand-surface';
import { Progress } from '@/ui/progress';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import {
  creditLabel,
  creditMoney,
  creditProgress,
  creditStatus,
  planRows,
  simulationRows,
} from './credit-presentation';

export const creditPanel = { padding: spacing.lg, gap: spacing.md };
export function CreditStatus({ status }: { status: Credit['status'] }) {
  const color = status === 'PAID' ? colors.success : status === 'LATE' ? colors.expense : colors.primary;
  return <Text style={[typography.label, { color }]}>{creditStatus(status)}</Text>;
}
export function CreditProgress({ credit, dark = false }: { credit: Credit; dark?: boolean }) {
  const percent = creditProgress(credit);
  return percent === undefined ? null : (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.caption, dark && { color: '#C3E5E4' }]}>
        {percent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del capital original reducido
      </Text>
      <Progress
        value={percent}
        label="Capital original reducido"
        color={dark ? colors.mint : colors.success}
      />
    </View>
  );
}
export function CreditValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.cardTitle}>{value}</Text>
    </View>
  );
}
export function CreditCard({
  credit,
  hidden,
  onPress,
}: {
  credit: Credit;
  hidden: boolean;
  onPress(): void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={creditLabel(credit, hidden)}
      onPress={onPress}
      disabled={credit.id === undefined}
    >
      <MotionEntry
        revision={`${credit.id}-${credit.remainingBalance}`}
        style={[styles.creditCard, credit.status === 'LATE' && styles.creditLate]}
      >
        <View style={styles.creditHeading}>
          <View
            style={[
              styles.creditIcon,
              credit.status === 'LATE' && { backgroundColor: colors.dangerSoft },
              credit.status === 'PAID' && { backgroundColor: colors.successSoft },
            ]}
          >
            <Ionicons
              name={credit.status === 'PAID' ? 'checkmark-circle-outline' : 'card-outline'}
              size={22}
              color={
                credit.status === 'LATE'
                  ? colors.danger
                  : credit.status === 'PAID'
                    ? colors.success
                    : colors.credit
              }
            />
          </View>
          <View style={styles.creditName}>
            <Text numberOfLines={2} style={typography.cardTitle}>
              {credit.name ?? 'Crédito'}
            </Text>
            <CreditStatus status={credit.status} />
          </View>
          <View style={styles.chevron}>
            <Ionicons name="arrow-forward" size={19} color={colors.primary} />
          </View>
        </View>
        <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.creditBalance}>
          <View style={styles.balanceHeading}>
            <Text style={[typography.caption, { color: '#C3E5E4' }]}>
              SALDO PENDIENTE · {credit.currency ?? 'MONEDA NO DISPONIBLE'}
            </Text>
            <Ionicons name="layers-outline" size={20} color={colors.mint} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[typography.moneyMedium, { color: '#FFFFFF' }]}
          >
            {creditMoney(credit.remainingBalance, credit.currency, hidden)}
          </Text>
        </LinearGradient>
        {credit.status !== 'PAID' && (
          <View style={styles.creditMeta}>
            {credit.annualRate !== undefined && (
              <View style={styles.metaPill}>
                <Text
                  accessibilityLabel={`Tasa efectiva anual ${credit.annualRate} por ciento`}
                  style={typography.caption}
                >
                  EA · {credit.annualRate}%
                </Text>
              </View>
            )}
            {credit.nextPaymentDate && (
              <View style={styles.metaPill}>
                <Text style={typography.caption}>
                  {credit.status === 'LATE' ? 'Cuota por revisar' : 'Próximo pago'} ·{' '}
                  {formatLocalDate(credit.nextPaymentDate, 'compact')}
                </Text>
              </View>
            )}
            {credit.expectedPaymentAmount !== undefined && (
              <View style={styles.metaPill}>
                <Text style={typography.caption}>
                  Cuota · {creditMoney(credit.expectedPaymentAmount, credit.currency, hidden)}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.progressPanel}>
          <CreditProgress credit={credit} />
        </View>
        {credit.status === 'LATE' && (
          <Text style={typography.caption}>Revisa las cuotas pendientes y tus pagos registrados.</Text>
        )}
        {credit.status === 'PAID' && <Text style={typography.caption}>Esta deuda ya está completada.</Text>}
      </MotionEntry>
    </MotionPressable>
  );
}
const styles = themedStyleSheet(() => ({
  creditCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 25,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.creditSoft,
    ...shadows.card,
  },
  creditLate: { borderColor: colors.dangerSoft },
  creditHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  creditIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creditSoft,
  },
  creditName: { flex: 1, gap: spacing.xxs },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  creditBalance: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.primaryStrong,
  },
  balanceHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressPanel: { paddingHorizontal: spacing.xs },
  creditMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metaPill: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  heroHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroEyebrow: { ...typography.caption, color: colors.mint, fontWeight: '700', flex: 1 },
  heroStatus: { ...typography.bodySecondary, color: '#C3E5E4' },
}));
export function CreditHero({ credit, hidden }: { credit: Credit; hidden: boolean }) {
  return (
    <BrandSurface tone="panorama" style={creditPanel}>
      <View style={styles.heroHeading}>
        <Ionicons
          name={credit.status === 'PAID' ? 'checkmark-circle-outline' : 'card-outline'}
          size={28}
          color={colors.mint}
        />
        <Text style={styles.heroEyebrow}>
          {credit.status === 'PAID' ? 'CRÉDITO PAGADO' : 'SALDO PENDIENTE'} ·{' '}
          {credit.currency ?? 'MONEDA NO DISPONIBLE'}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[typography.moneyLarge, { color: '#FFFFFF' }]}
      >
        {creditMoney(credit.remainingBalance, credit.currency, hidden)}
      </Text>
      <Text style={styles.heroStatus}>{creditStatus(credit.status)}</Text>
      <CreditProgress credit={credit} dark />
      {credit.status === 'PAID' && <Text style={styles.heroStatus}>Esta deuda ya está completada.</Text>}
    </BrandSurface>
  );
}
export function CreditPlanView({
  plan,
  currency,
  hidden,
  compact = false,
}: {
  plan: CreditPlan;
  currency?: string;
  hidden: boolean;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const rows = planRows(plan);
  const statusTone =
    plan.status === 'ATRASADO'
      ? { color: colors.danger, background: colors.dangerSoft, icon: 'alert-circle-outline' as const }
      : plan.status === 'ADELANTADO'
        ? { color: colors.success, background: colors.successSoft, icon: 'trending-up-outline' as const }
        : {
            color: colors.primary,
            background: colors.primarySoft,
            icon: 'checkmark-circle-outline' as const,
          };
  return (
    <View style={planStyles.content}>
      {plan.status && (
        <View style={[planStyles.status, { backgroundColor: statusTone.background }]}>
          <Ionicons name={statusTone.icon} size={20} color={statusTone.color} />
          <Text style={[typography.label, { color: statusTone.color, flex: 1 }]}>
            {
              {
                AL_DIA: 'Vas al día con el plan',
                ATRASADO: 'Hay pagos por revisar',
                ADELANTADO: 'Vas adelante del plan',
              }[plan.status]
            }
          </Text>
        </View>
      )}
      {rows.slice(0, expanded ? rows.length : 1).map((row) => (
        <View key={row.label} style={planStyles.row}>
          <Text style={[typography.label, { color: colors.textPrimary }]}>{row.label}</Text>
          <View style={planStyles.columns}>
            <View style={planStyles.column}>
              <Text style={typography.caption}>Plan estimado</Text>
              <Text style={planStyles.value} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>
                {row.money
                  ? creditMoney(row.planned, currency, hidden)
                  : String(row.planned ?? 'No disponible')}
              </Text>
            </View>
            <View style={[planStyles.column, planStyles.realColumn]}>
              <Text style={typography.caption}>Anotado</Text>
              <Text style={planStyles.value} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>
                {row.money ? creditMoney(row.real, currency, hidden) : String(row.real ?? 'No disponible')}
              </Text>
            </View>
          </View>
        </View>
      ))}
      {compact && rows.length > 1 && (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Ocultar comparación completa' : 'Ver comparación completa'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={planStyles.moreRows}
        >
          <Text style={[typography.label, { color: colors.primary }]}>
            {expanded ? 'Mostrar menos' : 'Ver comparación completa'}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </MotionPressable>
      )}
      {plan.realCurrentBalance !== undefined && (
        <View style={planStyles.balance}>
          <Text style={typography.label}>Saldo actual registrado</Text>
          <Text style={typography.moneyMedium}>{creditMoney(plan.realCurrentBalance, currency, hidden)}</Text>
        </View>
      )}
      {plan.status && (
        <Text style={typography.bodySecondary}>
          {
            {
              AL_DIA: 'Los pagos anotados cubren las cuotas vencidas del plan estimado.',
              ATRASADO:
                'Los pagos anotados no cubren todo lo previsto hasta hoy. Si pagaste antes de usar la app, actualiza el saldo con tu extracto.',
              ADELANTADO: 'Los pagos ordinarios anotados superan lo previsto hasta hoy.',
            }[plan.status]
          }
        </Text>
      )}
      <Text style={typography.caption}>
        Los abonos extra reducen capital; este estado revisa si las cuotas ordinarias vencidas están
        cubiertas.
      </Text>
    </View>
  );
}
export function CreditSimulationView({
  result,
  currency,
  hidden,
}: {
  result: CreditSimulation;
  currency?: string;
  hidden: boolean;
}) {
  const [visibleRows, setVisibleRows] = useState(4);
  const schedule = result.schedule ?? [];
  return (
    <View style={planStyles.content}>
      <Card style={[creditPanel, { backgroundColor: colors.accentSoft }]}>
        <View style={planStyles.heading}>
          <Ionicons name="sparkles-outline" size={22} color={colors.accent} />
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Escenario simulado
          </Text>
        </View>
        <Text style={typography.bodySecondary}>Proyección para comparar opciones. No registra un pago.</Text>
        {result.installmentValue !== undefined && (
          <View style={planStyles.installment}>
            <Text style={[typography.caption, { color: '#C3E5E4' }]}>CUOTA ESTIMADA</Text>
            <Text style={[typography.moneyMedium, { color: '#FFFFFF' }]}>
              {creditMoney(result.installmentValue, currency, hidden)}
            </Text>
          </View>
        )}
        {simulationRows(result)
          .filter((row) => row.label !== 'Cuota estimada')
          .map((row) => (
            <View key={row.label} style={planStyles.simulationRow}>
              <Text style={[typography.bodySecondary, { flex: 1 }]}>{row.label}</Text>
              <Text style={typography.label}>
                {row.money ? creditMoney(row.value, currency, hidden) : String(row.value)}
              </Text>
            </View>
          ))}
      </Card>
      {schedule.length > 0 && (
        <Card style={creditPanel}>
          <View style={planStyles.heading}>
            <View style={planStyles.scheduleIcon}>
              <Ionicons name="calendar-outline" size={21} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Tabla de amortización
              </Text>
              <Text style={typography.caption}>{schedule.length} cuotas proyectadas</Text>
            </View>
          </View>
          <Text style={typography.bodySecondary}>
            Cada cuota muestra cuánto iría a capital, intereses y saldo restante.
          </Text>
          {schedule.slice(0, visibleRows).map((row, index) => (
            <View key={`${row.installment ?? index}-${row.date ?? ''}`} style={planStyles.scheduleRow}>
              <View style={planStyles.scheduleTop}>
                <Text style={typography.cardTitle}>Cuota {row.installment ?? index + 1}</Text>
                {row.date && <Text style={typography.caption}>{formatLocalDate(row.date)}</Text>}
              </View>
              <View style={planStyles.simulationRow}>
                <Text style={typography.bodySecondary}>A capital</Text>
                <Text style={typography.label}>{creditMoney(row.principalPayment, currency, hidden)}</Text>
              </View>
              <View style={planStyles.simulationRow}>
                <Text style={typography.bodySecondary}>Intereses</Text>
                <Text style={typography.label}>{creditMoney(row.interest, currency, hidden)}</Text>
              </View>
              {row.extraPayment !== undefined && row.extraPayment > 0 && (
                <View style={planStyles.simulationRow}>
                  <Text style={[typography.bodySecondary, { color: colors.success }]}>Abono extra</Text>
                  <Text style={[typography.label, { color: colors.success }]}>
                    {creditMoney(row.extraPayment, currency, hidden)}
                  </Text>
                </View>
              )}
              <View style={planStyles.simulationRow}>
                <Text style={typography.bodySecondary}>Saldo después</Text>
                <Text style={typography.cardTitle}>{creditMoney(row.endingBalance, currency, hidden)}</Text>
              </View>
            </View>
          ))}
          {visibleRows < schedule.length && (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Ver más cuotas de la tabla de amortización"
              onPress={() => setVisibleRows((count) => Math.min(count + 8, schedule.length))}
              style={planStyles.moreRows}
            >
              <Text style={[typography.label, { color: colors.primary }]}>Ver más cuotas</Text>
              <Ionicons name="chevron-down" size={18} color={colors.primary} />
            </MotionPressable>
          )}
        </Card>
      )}
    </View>
  );
}

const planStyles = themedStyleSheet(() => ({
  content: { gap: spacing.md },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
  },
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  columns: { flexDirection: 'row', gap: spacing.sm },
  column: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceSecondary,
  },
  realColumn: { backgroundColor: colors.infoSoft },
  value: { ...typography.moneySmall, fontSize: 14 },
  balance: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  installment: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.primaryStrong,
  },
  simulationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scheduleIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  scheduleRow: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.background,
  },
  scheduleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  moreRows: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
}));
