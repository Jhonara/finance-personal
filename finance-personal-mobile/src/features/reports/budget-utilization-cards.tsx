import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, spacing } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import type { ReportBarItem } from './report-charts';
import { ReportNotice, reportStyles as s } from './report-ui';

export type BudgetUtilizationItem = ReportBarItem & { percentageUsed?: number | null };
const arcLength = Math.PI * 56;

/** Each gauge uses its own budget, never the largest sibling's amount. */
export function BudgetUtilizationCards({
  items,
  currency,
  hidden,
}: {
  items: BudgetUtilizationItem[];
  currency: string;
  hidden: boolean;
}) {
  const money = (value: number) => formatPrivateMoney(value, currency, hidden);
  return (
    <View style={s.stack}>
      {hidden ? <ReportNotice>Gráfica oculta mientras ocultas tus importes.</ReportNotice> : null}
      {items.map((item) => {
        const percent = item.percentageUsed;
        const validPercent = percent != null && Number.isFinite(percent);
        const used = validPercent ? Math.min(1, Math.max(0, percent / 100)) : 0;
        const percentText = validPercent
          ? `${percent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
          : '—';
        return (
          <MotionPressable
            key={item.key}
            accessibilityRole={item.onPress ? 'button' : undefined}
            accessibilityLabel={item.accessibilityLabel}
            onPress={item.onPress}
            disabled={!item.onPress}
            style={{
              padding: spacing.md,
              borderRadius: radius.medium,
              backgroundColor: colors.surfaceSecondary,
              gap: spacing.md,
            }}
          >
            <View style={s.row}>
              {item.icon}
              <Text style={[s.label, { flex: 1 }]}>{item.name}</Text>
            </View>
            <View style={[s.row, { alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg }]}>
              {!hidden && item.reference !== undefined ? (
                <View style={{ width: 126, height: 88, alignItems: 'center' }}>
                  <Svg
                    width={126}
                    height={86}
                    viewBox="0 0 140 96"
                    accessibilityRole="image"
                    accessibilityLabel={
                      validPercent
                        ? `${item.name}: ${percentText} de su presupuesto utilizado`
                        : `${item.name}: sin porcentaje con un límite cero`
                    }
                  >
                    <Path
                      d="M 14 80 A 56 56 0 0 1 126 80"
                      stroke={colors.border}
                      strokeWidth={12}
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Path
                      testID={`budget-gauge-${item.key}`}
                      d="M 14 80 A 56 56 0 0 1 126 80"
                      stroke={item.color}
                      strokeWidth={12}
                      strokeLinecap={used === 0 ? 'butt' : 'round'}
                      fill="none"
                      strokeDasharray={[arcLength * used, arcLength + 1]}
                    />
                  </Svg>
                  <View style={{ position: 'absolute', top: 47, alignItems: 'center' }}>
                    <Text style={[s.amount, { fontSize: 20, color: item.color }]}>{percentText}</Text>
                    <Text style={[s.caption, { fontSize: 10 }]}>de su límite</Text>
                  </View>
                </View>
              ) : null}
              <View style={{ flex: 1, minWidth: 120, gap: spacing.sm }}>
                <View>
                  <Text style={s.caption}>Gastado</Text>
                  <Text style={s.amount}>{money(item.value)}</Text>
                </View>
                {item.reference !== undefined ? (
                  <View>
                    <Text style={s.caption}>Presupuestado</Text>
                    <Text style={s.label}>{money(item.reference)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {item.caption ? <Text style={s.caption}>{item.caption}</Text> : null}
            {item.footer}
          </MotionPressable>
        );
      })}
    </View>
  );
}
