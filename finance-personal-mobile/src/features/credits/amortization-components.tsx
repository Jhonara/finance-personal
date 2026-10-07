import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatLocalDate } from '@/utils/local-date';
import { MotionPressable } from '@/ui/motion';
import { Card } from '@/ui/primitives';
import { ModalSelector } from '@/ui/modal-selector';
import { colors, radius, spacing, typography } from '@/theme';
import { creditMoney } from './credit-presentation';
import type { AmortizationRow, RecordedCreditPayment } from './amortization-api';

function Amount({
  value,
  currency,
  hidden,
}: {
  value: number | undefined;
  currency: string;
  hidden: boolean;
}) {
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.amount}>
      {creditMoney(value, currency, hidden)}
    </Text>
  );
}

function Metric({
  label,
  value,
  currency,
  hidden,
}: {
  label: string;
  value: number | undefined;
  currency: string;
  hidden: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={typography.caption}>{label}</Text>
      <Amount value={value} currency={currency} hidden={hidden} />
    </View>
  );
}

export function AmortizationSchedule({
  rows,
  currency,
  hidden,
  selectedInstallment,
  onSelect,
}: {
  rows: AmortizationRow[];
  currency: string;
  hidden: boolean;
  selectedInstallment?: number;
  onSelect?: (installment: number) => void;
}) {
  const [visible, setVisible] = useState(5);
  const [extrasOnly, setExtrasOnly] = useState(false);
  const [year, setYear] = useState(0);
  const [yearOpen, setYearOpen] = useState(false);
  const years = [...new Set(rows.map((row) => Number(row.date?.slice(0, 4))).filter(Boolean))];
  const filtered = rows.filter(
    (row) =>
      (!extrasOnly || (row.extraPayment ?? 0) > 0) && (!year || Number(row.date?.slice(0, 4)) === year),
  );
  const extraCount = rows.filter((row) => (row.extraPayment ?? 0) > 0).length;
  return (
    <View style={styles.list}>
      <View style={styles.filters}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Mostrar todas las cuotas"
          accessibilityState={{ selected: !extrasOnly }}
          style={[styles.filter, !extrasOnly && styles.activeFilter]}
          onPress={() => {
            setExtrasOnly(false);
            setVisible(5);
          }}
        >
          <Text style={[typography.label, !extrasOnly && styles.selectedNumber]}>Todas</Text>
        </MotionPressable>
        {extraCount > 0 ? (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Mostrar cuotas con abono extra"
            accessibilityState={{ selected: extrasOnly }}
            style={[styles.filter, extrasOnly && styles.activeFilter]}
            onPress={() => {
              setExtrasOnly(true);
              setVisible(5);
            }}
          >
            <Text style={[typography.label, extrasOnly && styles.selectedNumber]}>
              Con abono · {extraCount}
            </Text>
          </MotionPressable>
        ) : null}
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Filtrar cuotas por año"
          style={styles.filter}
          onPress={() => setYearOpen(true)}
        >
          <Text style={typography.label}>{year || 'Por año'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </MotionPressable>
      </View>
      <Text style={typography.caption}>
        {filtered.length} cuotas en esta vista · {currency}
      </Text>
      {filtered.length === 0 ? (
        <Text style={typography.bodySecondary}>No hay cuotas con estos filtros.</Text>
      ) : null}
      {filtered.slice(0, visible).map((row, index) => {
        const canChoose = Boolean(onSelect && row.installment !== undefined && (row.endingBalance ?? 0) > 0);
        const selected = selectedInstallment === row.installment && canChoose;
        return (
          <MotionPressable
            key={`${row.installment ?? index}-${row.date ?? ''}`}
            accessibilityRole={canChoose ? 'button' : undefined}
            accessibilityLabel={canChoose ? `Elegir cuota ${row.installment} para el abono` : undefined}
            accessibilityState={canChoose ? { selected } : undefined}
            disabled={!canChoose}
            onPress={() => row.installment !== undefined && onSelect?.(row.installment)}
          >
            <Card
              style={[
                styles.rowCard,
                row.endingBalance === 0 && styles.finalCard,
                selected && styles.selectedCard,
              ]}
            >
              <View style={styles.rowTop}>
                <View style={[styles.numberBadge, selected && styles.selectedBadge]}>
                  <Text style={[styles.number, selected && styles.selectedNumber]}>
                    {row.installment ?? '—'}
                  </Text>
                </View>
                <View style={styles.grow}>
                  <Text style={typography.cardTitle}>
                    Cuota {row.installment ?? '—'}
                    {row.endingBalance === 0 ? ' · Final' : ''}
                  </Text>
                  <Text style={typography.caption}>{formatLocalDate(row.date, 'compact')}</Text>
                </View>
                {canChoose ? (
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={23}
                    color={selected ? colors.success : colors.primary}
                  />
                ) : null}
              </View>
              <View style={styles.balanceStrip}>
                <Metric
                  label="Saldo inicial"
                  value={row.openingBalance}
                  currency={currency}
                  hidden={hidden}
                />
                <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                <Metric label="Saldo final" value={row.endingBalance} currency={currency} hidden={hidden} />
              </View>
              <View style={styles.amountStrip}>
                <Metric label="Interés" value={row.interest} currency={currency} hidden={hidden} />
                <Metric label="A capital" value={row.principalPayment} currency={currency} hidden={hidden} />
              </View>
              {row.extraPayment !== undefined && row.extraPayment > 0 ? (
                <View style={styles.extraStrip}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.success} />
                  <Text style={[typography.label, styles.grow]}>Abono extra a capital</Text>
                  <Amount value={row.extraPayment} currency={currency} hidden={hidden} />
                </View>
              ) : null}
              {selected ? <Text style={styles.selectedHint}>Cuota elegida para probar un abono</Text> : null}
              {row.endingBalance === 0 ? (
                <Text style={styles.selectedHint}>Fin del crédito en esta proyección</Text>
              ) : null}
            </Card>
          </MotionPressable>
        );
      })}
      {visible < filtered.length ? (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Ver más cuotas de amortización"
          onPress={() => setVisible((count) => count + 8)}
          style={styles.more}
        >
          <Text style={styles.moreText}>Ver más cuotas ({filtered.length - visible} por mostrar)</Text>
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </MotionPressable>
      ) : null}
      <ModalSelector
        visible={yearOpen}
        label="Filtrar por año"
        selectedId={year}
        onClose={() => setYearOpen(false)}
        onSelect={(value) => {
          setYear(value);
          setVisible(5);
        }}
        options={[
          { id: 0, label: 'Todos los años', icon: 'calendar-outline' },
          ...years.map((value) => ({ id: value, label: String(value), icon: 'calendar-outline' as const })),
        ]}
      />
    </View>
  );
}

export function RecordedPayments({
  payments,
  currency,
  hidden,
}: {
  payments: RecordedCreditPayment[];
  currency: string;
  hidden: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? [...payments].reverse() : [...payments].reverse().slice(0, 3);
  return (
    <View style={styles.list}>
      {payments.length === 0 ? (
        <Card style={styles.empty}>
          <Ionicons name="receipt-outline" size={24} color={colors.credit} />
          <Text style={typography.bodySecondary}>Aún no hay pagos registrados para este crédito.</Text>
        </Card>
      ) : (
        rows.map((payment) => (
          <Card key={payment.paymentId} style={styles.paymentCard}>
            <View style={styles.rowTop}>
              <View style={[styles.numberBadge, styles.paymentBadge]}>
                <Ionicons name="checkmark" size={18} color={colors.success} />
              </View>
              <View style={styles.grow}>
                <Text style={typography.cardTitle}>Pago registrado</Text>
                <Text style={typography.caption}>{formatLocalDate(payment.date, 'compact')}</Text>
              </View>
              <Amount value={payment.totalAmount} currency={currency} hidden={hidden} />
            </View>
            <View style={styles.amountStrip}>
              <Metric label="A capital" value={payment.principalAmount} currency={currency} hidden={hidden} />
              <Metric label="Intereses" value={payment.interestAmount} currency={currency} hidden={hidden} />
            </View>
            {payment.extraPrincipalAmount > 0 ? (
              <View style={styles.extraStrip}>
                <Ionicons name="sparkles-outline" size={18} color={colors.success} />
                <Text style={[typography.label, styles.grow]}>Abono extra registrado</Text>
                <Amount value={payment.extraPrincipalAmount} currency={currency} hidden={hidden} />
              </View>
            ) : null}
            <Text style={typography.caption}>
              Saldo después del pago: {creditMoney(payment.balanceAfter, currency, hidden)}
            </Text>
          </Card>
        ))
      )}
      {payments.length > 3 ? (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Ver menos pagos' : 'Ver todos los pagos del crédito'}
          onPress={() => setExpanded((value) => !value)}
          style={styles.more}
        >
          <Text style={styles.moreText}>
            {expanded ? 'Ver menos pagos' : `Ver todos (${payments.length})`}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </MotionPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  grow: { flex: 1, minWidth: 0 },
  rowCard: { gap: spacing.md, padding: spacing.lg },
  finalCard: { backgroundColor: colors.successSoft, borderColor: colors.success },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  activeFilter: { backgroundColor: colors.primaryStrong },
  selectedCard: { borderColor: colors.success, backgroundColor: '#F2FCF8' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numberBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    backgroundColor: colors.creditSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: { backgroundColor: colors.success },
  number: { ...typography.label, color: colors.credit },
  selectedNumber: { color: colors.surface },
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
    padding: spacing.md,
  },
  amountStrip: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, minWidth: 0, gap: spacing.xxs },
  amount: { ...typography.label, color: colors.primaryStrong, flexShrink: 1 },
  extraStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.medium,
    backgroundColor: colors.successSoft,
  },
  selectedHint: { ...typography.caption, color: colors.success },
  more: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  moreText: { ...typography.label, color: colors.primary },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  paymentCard: { gap: spacing.md, padding: spacing.lg },
  paymentBadge: { backgroundColor: colors.successSoft },
});
