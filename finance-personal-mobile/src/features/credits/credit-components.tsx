import { formatLocalDate } from '@/utils/local-date';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import type { Credit, CreditPlan, CreditSimulation } from '@/features/secondary/secondary-api';
import { Card } from '@/ui/primitives';
import { BrandSurface } from '@/ui/brand-surface';
import { Progress } from '@/ui/progress';
import { colors, spacing, typography } from '@/theme';
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
export function CreditProgress({ credit }: { credit: Credit }) {
  const percent = creditProgress(credit);
  return percent === undefined ? null : (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.caption}>
        {percent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del capital pagado
      </Text>
      <Progress value={percent} label="Capital pagado" color={colors.accent} />
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={creditLabel(credit, hidden)}
      onPress={onPress}
      disabled={credit.id === undefined}
    >
      <Card style={creditPanel}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>{credit.name ?? 'Crédito'}</Text>
            <CreditStatus status={credit.status} />
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </View>
        <CreditValue
          label="Saldo pendiente"
          value={creditMoney(credit.remainingBalance, credit.currency, hidden)}
        />
        {credit.status !== 'PAID' && (
          <>
            {credit.principal !== undefined && (
              <CreditValue
                label="Principal original"
                value={creditMoney(credit.principal, credit.currency, hidden)}
              />
            )}
            {credit.annualRate !== undefined && (
              <Text
                accessibilityLabel={`Tasa efectiva anual ${credit.annualRate} por ciento`}
                style={typography.bodySecondary}
              >
                EA · {credit.annualRate}%
              </Text>
            )}
            {credit.nextPaymentDate && (
              <Text style={typography.bodySecondary}>
                Próximo pago · {formatLocalDate(credit.nextPaymentDate)}
              </Text>
            )}
            {credit.expectedPaymentAmount !== undefined && (
              <Text style={typography.bodySecondary}>
                Cuota · {creditMoney(credit.expectedPaymentAmount, credit.currency, hidden)}
              </Text>
            )}
          </>
        )}
        <CreditProgress credit={credit} />
        {credit.status === 'PAID' && <Text style={typography.caption}>Esta deuda ya está completada.</Text>}
      </Card>
    </Pressable>
  );
}
export function CreditHero({ credit, hidden }: { credit: Credit; hidden: boolean }) {
  return (
    <BrandSurface tone="credit" style={creditPanel}>
      <Ionicons
        name={credit.status === 'PAID' ? 'checkmark-circle-outline' : 'document-text-outline'}
        size={32}
        color={credit.status === 'PAID' ? colors.success : colors.accent}
      />
      <Text style={typography.label}>{credit.status === 'PAID' ? 'Crédito pagado' : 'Saldo pendiente'}</Text>
      <Text style={typography.moneyLarge}>
        {creditMoney(credit.remainingBalance, credit.currency, hidden)}
      </Text>
      <CreditStatus status={credit.status} />
      <CreditProgress credit={credit} />
      {credit.status === 'PAID' && (
        <Text style={typography.bodySecondary}>Esta deuda ya está completada.</Text>
      )}
    </BrandSurface>
  );
}
export function CreditPlanView({
  plan,
  currency,
  hidden,
}: {
  plan: CreditPlan;
  currency?: string;
  hidden: boolean;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      {planRows(plan).map((row) => (
        <View key={row.label} style={{ gap: spacing.sm }}>
          <Text style={typography.label}>{row.label}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <CreditValue
                label="Planeado"
                value={
                  row.money
                    ? creditMoney(row.planned, currency, hidden)
                    : String(row.planned ?? 'No disponible')
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <CreditValue
                label="Real"
                value={
                  row.money ? creditMoney(row.real, currency, hidden) : String(row.real ?? 'No disponible')
                }
              />
            </View>
          </View>
        </View>
      ))}
      {plan.realCurrentBalance !== undefined && (
        <CreditValue
          label="Saldo real actual"
          value={creditMoney(plan.realCurrentBalance, currency, hidden)}
        />
      )}
      {plan.status && (
        <Text style={typography.bodySecondary}>
          {
            {
              AL_DIA: 'Cantidad de pagos conforme al plan.',
              ATRASADO: 'Hay menos pagos registrados que cuotas previstas.',
              ADELANTADO: 'Hay más pagos registrados que cuotas previstas.',
            }[plan.status]
          }
        </Text>
      )}
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
  return (
    <Card style={[creditPanel, { backgroundColor: colors.accentSoft }]}>
      <Text style={[typography.label, { color: colors.accent }]}>Simulación</Text>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Escenario simulado
      </Text>
      <Text style={typography.bodySecondary}>Esto no modifica tu crédito.</Text>
      {simulationRows(result).map((row) => (
        <CreditValue
          key={row.label}
          label={row.label}
          value={row.money ? creditMoney(row.value, currency, hidden) : String(row.value)}
        />
      ))}
    </Card>
  );
}
