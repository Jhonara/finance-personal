import { useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/theme';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { GrowingArc, GrowingBar, useChartReveal } from '@/ui/chart-motion';
import { formatDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { shortReportMonth, type TrendPoint } from './report-model';
import { reportStyles as s, ReportNotice } from './report-ui';

export const chartColors = () => [
  colors.success,
  colors.info,
  colors.lavender,
  colors.warning,
  colors.expense,
  colors.textMuted,
];
export type RingPart = { name: string; value: number; color: string };

export function ReportRing({
  parts,
  hidden,
  title,
  value,
  selected,
  onSelect,
}: {
  parts: RingPart[];
  hidden: boolean;
  title: string;
  value: string;
  selected?: number;
  onSelect?: (index: number) => void;
}) {
  const progress = useChartReveal(parts.map((part) => `${part.name}:${part.value}`).join('|'), !hidden);
  if (hidden) return <ReportNotice>Gráfica oculta mientras ocultas tus importes.</ReportNotice>;
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  const circumference = 2 * Math.PI * 70;
  let offset = 0;
  return (
    <MotionEntry>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 184, height: 184 }}>
          <Svg
            width={184}
            height={184}
            viewBox="0 0 184 184"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Circle cx={92} cy={92} r={70} fill="none" stroke={colors.surfaceSecondary} strokeWidth={21} />
            <G rotation={-90} origin="92,92">
              {total > 0
                ? parts.map((part, index) => {
                    const length = (Math.max(0, part.value) / total) * circumference;
                    const start = offset;
                    offset += length;
                    return (
                      <GrowingArc
                        key={part.name}
                        cx={92}
                        cy={92}
                        r={70}
                        fill="none"
                        stroke={part.color}
                        strokeWidth={selected === index ? 27 : 21}
                        opacity={selected === undefined || selected === index ? 1 : 0.4}
                        progress={progress}
                        length={Math.max(0, length - (parts.length > 1 ? 3 : 0))}
                        circumference={circumference}
                        start={start}
                        onPress={() => onSelect?.(index)}
                      />
                    );
                  })
                : null}
            </G>
          </Svg>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 33,
              right: 33,
              top: 57,
              bottom: 48,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={[s.caption, { textAlign: 'center' }]}>{title}</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={2}
              style={[s.amount, { textAlign: 'center' }]}
            >
              {value}
            </Text>
          </View>
        </View>
      </View>
    </MotionEntry>
  );
}

export function ReportTrend({
  points,
  currency,
  hidden,
}: {
  points: TrendPoint[];
  currency: string;
  hidden: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState(points.length - 1);
  const activeIndex = Math.max(0, Math.min(selectedIndex, points.length - 1));
  const selected = points[activeIndex];
  const progress = useChartReveal(
    points.map((point) => `${point.year}-${point.month}:${point.income}:${point.expense}`).join('|'),
    !hidden,
  );
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 74, points.length * 48 + 42);
  const plotWidth = chartWidth - 42;
  const columnWidth = plotWidth / Math.max(1, points.length);
  const values = points
    .flatMap((point) => [point.income, point.expense])
    .filter((value): value is number => value !== undefined && Number.isFinite(value));
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const top = 12,
    bottom = 158;
  const y = (value: number) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const zero = y(0);
  const money = (value?: number) =>
    value === undefined ? 'No disponible' : formatPrivateMoney(value, currency, hidden);
  if (hidden) return <ReportNotice>Gráfica oculta mientras ocultas tus importes.</ReportNotice>;
  return (
    <View style={s.stack}>
      <View style={s.chips}>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: colors.success }]} />
          <Text style={s.caption}>Ingresos</Text>
        </View>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: colors.info }]} />
          <Text style={s.caption}>Gastos</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={points.length > 6}>
        <View style={{ width: chartWidth, height: 202 }}>
          <Svg
            width={chartWidth}
            height={178}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {[max, ...(min < 0 ? [0, min] : [max / 2, 0])].map((tick, index) => (
              <G key={index}>
                <Line
                  x1={40}
                  x2={chartWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={colors.border}
                  strokeDasharray={tick === 0 ? undefined : '3 4'}
                />
                <SvgText x={36} y={y(tick) + 4} fontSize={9} textAnchor="end" fill={colors.textMuted}>
                  {new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(
                    tick,
                  )}
                </SvgText>
              </G>
            ))}
            {points.map((point, index) => (
              <G key={`${point.year}-${point.month}`}>
                {index === activeIndex ? (
                  <Rect
                    x={42 + index * columnWidth + 2}
                    y={top - 3}
                    width={columnWidth - 4}
                    height={bottom - top + 6}
                    rx={8}
                    fill={colors.primarySoft}
                  />
                ) : null}
                {([point.income, point.expense] as const).map((value, series) =>
                  value !== undefined && Number.isFinite(value) ? (
                    <GrowingBar
                      key={series}
                      x={42 + index * columnWidth + columnWidth / 2 - 13 + series * 15}
                      progress={progress}
                      zero={zero}
                      targetY={Math.min(zero, y(value))}
                      width={11}
                      targetHeight={Math.abs(zero - y(value))}
                      rx={3}
                      fill={series === 0 ? colors.success : colors.info}
                    />
                  ) : null,
                )}
              </G>
            ))}
          </Svg>
          <View style={{ position: 'absolute', left: 42, top: 0, bottom: 0, right: 0, flexDirection: 'row' }}>
            {points.map((point, index) => (
              <MotionPressable
                key={`${point.year}-${point.month}`}
                accessibilityRole="button"
                accessibilityLabel={`${formatDashboardPeriod(point)}. Ingresos ${money(point.income)}. Gastos ${money(point.expense)}`}
                accessibilityState={{ selected: index === activeIndex }}
                onPress={() => setSelectedIndex(index)}
                style={{
                  width: columnWidth,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: 1,
                }}
              >
                <Text style={s.caption}>{shortReportMonth(point)}</Text>
                <Text style={[s.caption, { fontSize: 9 }]}>{String(point.year).slice(-2)}</Text>
              </MotionPressable>
            ))}
          </View>
        </View>
      </ScrollView>
      {selected ? (
        <View style={s.note}>
          <Text style={s.label}>{formatDashboardPeriod(selected)}</Text>
          <View style={s.between}>
            <Text style={s.caption}>Ingresos</Text>
            <Text style={s.label}>{money(selected.income)}</Text>
          </View>
          <View style={s.between}>
            <Text style={s.caption}>Gastos</Text>
            <Text style={s.label}>{money(selected.expense)}</Text>
          </View>
        </View>
      ) : null}
      <Text style={s.caption}>
        Toca un mes para ver sus importes. Los meses sin registros muestran cero; un dato que no cargó aparece
        como no disponible.
      </Text>
    </View>
  );
}
