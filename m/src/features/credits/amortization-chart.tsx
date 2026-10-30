import { Text, View } from 'react-native';
import Svg, { G, Line, Text as SvgText } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';
import { Card } from '@/ui/primitives';
import { DrawingLine, useChartReveal } from '@/ui/chart-motion';
import type { AmortizationRow } from './amortization-api';
import { amortizationPlot } from './amortization-chart-model';

type Props = {
  currentBalance: number;
  baseline: AmortizationRow[];
  scenario?: AmortizationRow[];
  currency: string;
  hidden: boolean;
};
export function AmortizationChart(props: Props) {
  if (props.hidden) return null;
  return <VisibleAmortizationChart {...props} />;
}
function VisibleAmortizationChart({ currentBalance, baseline, scenario = [], currency }: Props) {
  const plot = amortizationPlot(currentBalance, baseline, scenario);
  const revision = JSON.stringify([currentBalance, baseline, scenario]);
  const progress = useChartReveal(revision);
  if (!plot) return null;
  const compact = (value: number) =>
    new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  return (
    <Card style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text accessibilityRole="header" style={typography.cardTitle}>
        Cómo bajaría tu deuda
      </Text>
      <Text style={typography.caption}>Saldo pendiente · {currency}</Text>
      <Svg
        width="100%"
        height={196}
        viewBox="0 0 320 196"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {[plot.maximum, plot.maximum / 2, 0].map((tick) => (
          <G key={tick}>
            <Line
              x1={52}
              x2={310}
              y1={plot.y(tick)}
              y2={plot.y(tick)}
              stroke={colors.border}
              strokeDasharray="3 4"
            />
            <SvgText x={47} y={plot.y(tick) + 4} fill={colors.textMuted} fontSize={10} textAnchor="end">
              {compact(tick)}
            </SvgText>
          </G>
        ))}
        {plot.baseline.map((segment, index) => (
          <DrawingLine
            key={`base-${index}`}
            {...segment}
            progress={progress}
            fill="none"
            stroke={colors.info}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {plot.scenario.map((segment, index) => (
          <DrawingLine
            key={`extra-${index}`}
            {...segment}
            progress={progress}
            fill="none"
            stroke={colors.success}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <SvgText x={52} y={184} fill={colors.textMuted} fontSize={11}>
          Ahora
        </SvgText>
        <SvgText x={310} y={184} fill={colors.textMuted} fontSize={11} textAnchor="end">
          {`Cuota ${plot.last}`}
        </SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <Legend color={colors.info} label="Sin nuevos abonos" />
        {scenario.length ? <Legend color={colors.success} label="Con tus abonos" /> : null}
      </View>
      <Text style={typography.caption}>
        Es una proyección, no tu historial de pagos. Consulta los importes de cada cuota en el detalle.
      </Text>
    </Card>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ width: 20, height: 3, backgroundColor: color, borderRadius: 2 }} />
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}
