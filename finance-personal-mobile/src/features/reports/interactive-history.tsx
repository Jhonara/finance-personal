import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '@/theme';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { MotionPressable } from '@/ui/motion';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { shortReportMonth, type TrendPoint } from './report-model';
import { ReportTrend } from './report-charts';
import { ReportChoice, ReportNotice, reportStyles as s } from './report-ui';

export function historyScale(points: TrendPoint[]) {
  const values = points.flatMap((point) => [point.income, point.expense]);
  const complete =
    values.length > 0 && values.every((value) => value !== undefined && Number.isFinite(value));
  const known = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  const largest = Math.max(1, ...known.map(Math.abs));
  const magnitude = 10 ** Math.floor(Math.log10(largest));
  const step = (Math.ceil(largest / magnitude) * magnitude) / 4;
  return { complete, step, max: step * 4, below: known.some((value) => value < 0) ? 4 : 0 };
}

export function InteractiveHistory({
  points,
  currency,
  hidden,
}: {
  points: TrendPoint[];
  currency: string;
  hidden: boolean;
}) {
  const [mode, setMode] = useState<'bars' | 'lines'>('bars');
  const pointKey = (point: TrendPoint | undefined) => point && `${point.year}-${point.month}`;
  const [selectedMonth, setSelectedMonth] = useState(() => pointKey(points.at(-1)));
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const scale = historyScale(points);
  const matchingIndex = points.findIndex((point) => pointKey(point) === selectedMonth);
  const active = matchingIndex >= 0 ? matchingIndex : Math.max(0, points.length - 1);
  const point = points[active];
  const activeMonth = pointKey(point);
  useEffect(() => {
    if (matchingIndex < 0) setSelectedMonth(activeMonth);
  }, [matchingIndex, activeMonth]);
  const selectMonth = (index: number) => {
    const entry = points[index];
    if (entry) setSelectedMonth(pointKey(entry));
  };
  const money = (value?: number) =>
    value == null ? 'No disponible' : formatPrivateMoney(value, currency, hidden);
  const lineMode = mode === 'lines' && scale.complete;
  return (
    <View style={s.stack}>
      <ReportChoice
        label="Gráfica del historial"
        choices={[
          { value: 'bars', label: 'Comparar meses' },
          { value: 'lines', label: 'Ver tendencia' },
        ]}
        selected={mode}
        onSelect={setMode}
      />
      {mode === 'lines' && !scale.complete && !hidden ? (
        <ReportNotice>
          Faltan datos del historial. Las columnas muestran los meses disponibles sin unirlos con datos que no
          cargaron.
        </ReportNotice>
      ) : null}
      {hidden ? (
        <ReportNotice>Gráfica oculta mientras ocultas tus importes.</ReportNotice>
      ) : lineMode ? (
        <>
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
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ marginLeft: -8 }}
          >
            <LineChart
              key={`${currency}-${points[0]?.year}-${points[0]?.month}-${points.length}`}
              data={points.map((entry, index) => ({
                value: entry.income!,
                label: shortReportMonth(entry),
                onPress: () => selectMonth(index),
              }))}
              data2={points.map((entry, index) => ({
                value: entry.expense!,
                onPress: () => selectMonth(index),
              }))}
              width={Math.max(200, width - 118)}
              height={176}
              spacing={Math.max(46, (width - 145) / Math.max(1, points.length - 1))}
              initialSpacing={12}
              endSpacing={18}
              showScrollIndicator={points.length > 6}
              color={colors.success}
              color2={colors.info}
              dataPointsColor={colors.success}
              dataPointsColor2={colors.info}
              thickness={3}
              thickness2={3}
              dataPointsRadius={5}
              dataPointsRadius2={5}
              maxValue={scale.max}
              noOfSections={4}
              stepValue={scale.step}
              noOfSectionsBelowXAxis={scale.below}
              mostNegativeValue={scale.below ? -scale.max : undefined}
              yAxisLabelWidth={42}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.border}
              rulesColor={colors.border}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
              formatYLabel={(label) =>
                new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(
                  Number(label),
                )
              }
              isAnimated={!reduced}
              animationDuration={500}
              animateTogether
              renderDataPointsAfterAnimationEnds
              focusEnabled
              focusTogether
              showStripOnFocus
              stripColor={colors.textMuted}
              stripOpacity={0.18}
              onFocus={(_item: unknown, index: number) => selectMonth(index)}
            />
          </View>
          <Text style={s.caption}>
            Toca un punto o elige un mes. Las líneas muestran los registros de cada mes; no son una
            proyección.
          </Text>
          <View style={s.chips}>
            {points.map((entry, index) => (
              <MotionPressable
                key={`${entry.year}-${entry.month}`}
                accessibilityRole="button"
                accessibilityLabel={`Consultar ${formatDashboardPeriod(entry)}`}
                accessibilityState={{ selected: index === active }}
                onPress={() => selectMonth(index)}
                style={[s.chip, index === active && s.selectedChip]}
              >
                <Text style={index === active ? s.selectedText : s.caption}>
                  {shortReportMonth(entry)} {String(entry.year).slice(-2)}
                </Text>
              </MotionPressable>
            ))}
          </View>
          {point ? (
            <View style={s.note}>
              <Text style={s.label}>{formatDashboardPeriod(point)}</Text>
              <View style={s.between}>
                <Text style={s.caption}>Ingresos</Text>
                <Text style={s.label}>{money(point.income)}</Text>
              </View>
              <View style={s.between}>
                <Text style={s.caption}>Gastos</Text>
                <Text style={s.label}>{money(point.expense)}</Text>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <ReportTrend
          points={points}
          currency={currency}
          hidden={hidden}
          selectedMonth={activeMonth}
          onSelectMonth={setSelectedMonth}
        />
      )}
    </View>
  );
}
