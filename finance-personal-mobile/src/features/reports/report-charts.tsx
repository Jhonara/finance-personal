import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/theme';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { GrowingBar, useChartReveal } from '@/ui/chart-motion';
import { formatDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { shortReportMonth, type TrendPoint } from './report-model';
import { reportStyles as s, ReportNotice } from './report-ui';
import { reportBarScale, ringSegmentAtPoint, ringSegmentPath, ringSegments } from './chart-geometry';

export { chartColors, reportPalette } from './chart-palette';
export type RingPart = { key?: string; name: string; value: number; color: string };

export type ReportBarItem = {
  key: string;
  name: string;
  value: number;
  color: string;
  reference?: number;
  caption?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

function RingSector({
  path,
  color,
  progress,
}: {
  path: string;
  color: string;
  progress: SharedValue<number>;
}) {
  // Fade complete sectors: rotating/growing dashed circles changes hit areas
  // during reveal, which can make a tap select a different category.
  const animatedProps = useAnimatedProps(() => ({ opacity: progress.value }));
  return <AnimatedPath d={path} fill={color} animatedProps={animatedProps} />;
}

function HorizontalBar({
  zero,
  target,
  y,
  color,
  progress,
}: {
  zero: number;
  target: number;
  y: number;
  color: string;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    x: zero + Math.min(0, target - zero) * progress.value,
    width: Math.abs(target - zero) * progress.value,
  }));
  return <AnimatedRect animatedProps={animatedProps} y={y} height={8} rx={4} fill={color} />;
}

/** One common, signed scale: refunds never become positive expense slices. */
export function ReportAmountBars({
  items,
  currency,
  hidden,
  referenceLabel,
  valueLabel,
  scale,
}: {
  items: ReportBarItem[];
  currency: string;
  hidden: boolean;
  referenceLabel?: string;
  valueLabel?: string;
  scale?: 'shared' | 'individual';
}) {
  const progress = useChartReveal(
    items.map((item) => `${item.key}:${item.value}:${item.reference}`).join('|'),
    !hidden,
  );
  const money = (value: number) => formatPrivateMoney(value, currency, hidden);
  return (
    <View style={s.stack}>
      {referenceLabel ? (
        <View style={s.chips}>
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: colors.info }]} />
            <Text style={s.caption}>{referenceLabel}</Text>
          </View>
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: colors.expense }]} />
            <Text style={s.caption}>{valueLabel ?? 'Gastado'}</Text>
          </View>
        </View>
      ) : null}
      {hidden ? <ReportNotice>Gráfica oculta mientras ocultas tus importes.</ReportNotice> : null}
      {items.map((item) => {
        const { min, x } = reportBarScale(items, item, scale ?? (referenceLabel ? 'individual' : 'shared'));
        const zero = x(0);
        return (
          <MotionPressable
            key={item.key}
            accessibilityRole={item.onPress ? 'button' : undefined}
            accessibilityLabel={item.accessibilityLabel}
            onPress={item.onPress}
            disabled={!item.onPress}
            style={[s.item, { paddingVertical: spacing.sm }]}
          >
            <View style={s.between}>
              <View style={[s.row, { flex: 1, minWidth: 120 }]}>
                {item.icon ?? <View style={[s.dot, { backgroundColor: item.color }]} />}
                <Text style={[s.label, { flex: 1 }]}>{item.name}</Text>
              </View>
              <Text style={s.label}>{money(item.value)}</Text>
            </View>
            {item.reference !== undefined ? (
              <View style={s.between}>
                <Text style={s.caption}>{referenceLabel ?? 'Presupuesto'}</Text>
                <Text style={s.caption}>{money(item.reference)}</Text>
              </View>
            ) : null}
            {!hidden ? (
              <Svg
                width="100%"
                height={item.reference === undefined ? 14 : 28}
                viewBox={`0 0 300 ${item.reference === undefined ? 14 : 28}`}
                preserveAspectRatio="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Rect
                  x={0}
                  y={item.reference === undefined ? 3 : 17}
                  width={300}
                  height={8}
                  rx={4}
                  fill={colors.surfaceSecondary}
                />
                {item.reference !== undefined ? (
                  <HorizontalBar
                    zero={zero}
                    target={x(item.reference)}
                    y={3}
                    color={colors.info}
                    progress={progress}
                  />
                ) : null}
                <HorizontalBar
                  zero={zero}
                  target={x(item.value)}
                  y={item.reference === undefined ? 3 : 17}
                  color={item.color}
                  progress={progress}
                />
                {min < 0 ? <Line x1={zero} x2={zero} y1={0} y2={28} stroke={colors.textMuted} /> : null}
              </Svg>
            ) : null}
            {item.caption ? <Text style={s.caption}>{item.caption}</Text> : null}
            {item.footer}
          </MotionPressable>
        );
      })}
    </View>
  );
}

export function ReportRing({
  parts,
  hidden,
  title,
  value,
  selected,
  onSelect,
  selectedKey,
  onSelectKey,
  showLegend = true,
}: {
  parts: RingPart[];
  hidden: boolean;
  title: string;
  value: string;
  selected?: number;
  onSelect?: (index: number) => void;
  selectedKey?: string;
  onSelectKey?: (key: string) => void;
  showLegend?: boolean;
}) {
  const progress = useChartReveal(
    parts.map((part) => `${part.key ?? part.name}:${part.value}`).join('|'),
    !hidden,
  );
  if (hidden) return <ReportNotice>Gráfica oculta mientras ocultas tus importes.</ReportNotice>;
  const segments = ringSegments(
    parts.map((part, index) => ({ key: part.key ?? `${index}:${part.name}`, value: part.value })),
  );
  const interactive = Boolean(onSelectKey || onSelect);
  const select = (key: string, index: number) => (onSelectKey ? onSelectKey(key) : onSelect?.(index));
  const percent = (fraction: number) =>
    fraction > 0 && fraction < 0.001
      ? '<0,1%'
      : `${(fraction * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  return (
    <MotionEntry>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <MotionPressable
          accessible={false}
          feedback={false}
          disabled={!interactive}
          testID="report-ring-hit-surface"
          onPress={(event) => {
            const { locationX, locationY } = event.nativeEvent;
            const segment = ringSegmentAtPoint(segments, locationX, locationY);
            if (segment) select(segment.key, segment.index);
          }}
          style={{ width: 208, height: 208 }}
        >
          <Svg
            width={208}
            height={208}
            viewBox="0 0 208 208"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Circle cx={104} cy={104} r={84} fill="none" stroke={colors.surfaceSecondary} strokeWidth={24} />
            {segments.map((segment) => (
              <RingSector
                key={segment.key}
                path={ringSegmentPath(
                  segment.startAngle,
                  segment.endAngle,
                  104,
                  104,
                  72,
                  selectedKey === segment.key || selected === segment.index ? 100 : 96,
                )}
                color={parts[segment.index]!.color}
                progress={progress}
              />
            ))}
          </Svg>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 39,
              right: 39,
              top: 62,
              bottom: 62,
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
        </MotionPressable>
        {interactive && showLegend ? (
          <View style={[s.chips, { justifyContent: 'center', alignSelf: 'stretch' }]}>
            {segments.map((segment) => (
              <MotionPressable
                key={segment.key}
                accessibilityRole="button"
                accessibilityLabel={`${parts[segment.index]!.name}: ${percent(segment.fraction)}. Ver detalle`}
                onPress={() => select(segment.key, segment.index)}
                style={[s.row, { minHeight: 48, paddingHorizontal: spacing.sm }]}
              >
                <View style={[s.dot, { backgroundColor: parts[segment.index]!.color }]} />
                <Text style={s.caption}>
                  {parts[segment.index]!.name} · {percent(segment.fraction)}
                </Text>
              </MotionPressable>
            ))}
          </View>
        ) : null}
      </View>
    </MotionEntry>
  );
}

export function ReportTrend({
  points,
  currency,
  hidden,
  selectedMonth: controlledMonth,
  onSelectMonth,
}: {
  points: TrendPoint[];
  currency: string;
  hidden: boolean;
  selectedMonth?: string;
  onSelectMonth?: (month: string | undefined) => void;
}) {
  const pointKey = (point: TrendPoint | undefined) => point && `${point.year}-${point.month}`;
  const [localMonth, setLocalMonth] = useState(() => pointKey(points.at(-1)));
  const selectedMonth = onSelectMonth ? controlledMonth : localMonth;
  const matchingIndex = points.findIndex((point) => pointKey(point) === selectedMonth);
  const activeIndex = matchingIndex >= 0 ? matchingIndex : Math.max(0, points.length - 1);
  const activeMonth = pointKey(points[activeIndex]);
  useEffect(() => {
    if (matchingIndex < 0) {
      if (onSelectMonth) onSelectMonth(activeMonth);
      else setLocalMonth(activeMonth);
    }
  }, [matchingIndex, activeMonth, onSelectMonth]);
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
          <View style={[s.dot, { backgroundColor: colors.expense }]} />
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
                      fill={series === 0 ? colors.income : colors.expense}
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
                onPress={() => {
                  const month = pointKey(point);
                  if (onSelectMonth) onSelectMonth(month);
                  else setLocalMonth(month);
                }}
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
