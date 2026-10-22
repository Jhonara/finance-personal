import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { Card, Button } from '@/ui/primitives';
import { BrandSurface } from '@/ui/brand-surface';
import { MotionPressable } from '@/ui/motion';
import { Progress } from '@/ui/progress';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import {
  formatDashboardPeriod,
  shiftDashboardPeriod,
  type DashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { categoryRows, comparisonPercent, type CurrencyMonth, type TrendPoint } from './report-model';
import { chartColors, ReportRing, ReportTrend } from './report-charts';
import { reportStyles as s, ReportChoice, ReportEmpty, ReportNotice, ReportPanel } from './report-ui';

export function MonthlyOverview({
  current,
  previous,
  period,
  currency,
  hidden,
  points,
  count,
  onCount,
  onExpenses,
  historyIncomplete,
  onRetryHistory,
}: {
  current: CurrencyMonth;
  previous?: CurrencyMonth;
  period: DashboardPeriod;
  currency: string;
  hidden: boolean;
  points: TrendPoint[];
  count: number;
  onCount: (value: number) => void;
  onExpenses: () => void;
  historyIncomplete: boolean;
  onRetryHistory: () => void;
}) {
  const money = (value: number) => formatPrivateMoney(value, currency, hidden);
  const ratio =
    current.income > 0 && current.expense >= 0 ? (current.expense / current.income) * 100 : undefined;
  const largest = categoryRows(current)[0];
  return (
    <>
      <BrandSurface tone="panorama" style={{ gap: spacing.lg }}>
        <View style={s.row}>
          <Ionicons name="analytics-outline" size={22} color="#66E6BC" />
          <Text style={[s.eyebrow, { color: '#B7EDE0' }]}>TU MES EN {currency}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: '#B9D4D5' }}>Ingresos registrados</Text>
          <Text style={[s.value, { color: '#FFFFFF' }]}>{money(current.income)}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: '#B9D4D5' }}>Gastos registrados</Text>
          <Text style={[s.value, { color: '#FFFFFF' }]}>{money(current.expense)}</Text>
        </View>
        <Text style={[s.caption, { color: '#B9D4D5' }]}>
          Ingresos y gastos de {formatDashboardPeriod(period)}. Los traspasos, saldos iniciales y pagos de
          créditos se consultan aparte.
        </Text>
      </BrandSurface>
      {current.income === 0 && current.expense === 0 ? (
        <ReportNotice>
          Este mes aún no tiene ingresos ni gastos en {currency}. Puedes cambiar el período o revisar los
          movimientos que registraste.
        </ReportNotice>
      ) : null}
      <ReportPanel title="¿Cómo va este mes?" icon="pulse-outline">
        {ratio !== undefined ? (
          <>
            <Text style={s.label}>
              {hidden
                ? 'Relación entre gastos e ingresos'
                : `${ratio.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% de tus ingresos corresponde a gastos`}
            </Text>
            {!hidden ? (
              <Progress
                value={ratio}
                color={ratio > 100 ? colors.warning : colors.success}
                label="Gastos respecto a ingresos"
              />
            ) : null}
            <Text style={s.caption}>
              Compara solo ingresos y gastos. No indica dinero disponible ni cuánto ahorraste.
            </Text>
          </>
        ) : (
          <Text style={s.body}>
            {current.income <= 0
              ? 'No hay ingresos positivos con los que comparar tus gastos.'
              : 'Hay ajustes o reversiones en este mes. Revisa el detalle de tus movimientos.'}
          </Text>
        )}
        {largest && largest.amount > 0 ? (
          <MotionPressable accessibilityRole="button" onPress={onExpenses} style={s.note}>
            <Text style={s.label}>Tu categoría con mayor gasto: {largest.name}</Text>
            <Text style={s.caption}>{money(largest.amount)} · Ver desglose de gastos →</Text>
          </MotionPressable>
        ) : null}
      </ReportPanel>
      <ReportPanel
        title="Frente al mes anterior"
        subtitle={formatDashboardPeriod(shiftDashboardPeriod(period, -1))}
        icon="git-compare-outline"
      >
        <Comparison
          label="Ingresos"
          current={current.income}
          previous={previous?.income}
          currency={currency}
          hidden={hidden}
        />
        <Comparison
          label="Gastos"
          current={current.expense}
          previous={previous?.expense}
          currency={currency}
          hidden={hidden}
        />
        <Text style={s.caption}>
          Compara los registros de cada mes completo. Si estás viendo el mes en curso, todavía faltan días; la
          diferencia no es una proyección.
        </Text>
      </ReportPanel>
      <ReportPanel
        title="Ingresos y gastos en el tiempo"
        subtitle="Una misma escala para comparar tus meses."
        icon="bar-chart-outline"
      >
        <ReportChoice
          label="Historial"
          choices={[
            { value: 3, label: '3 meses' },
            { value: 6, label: '6 meses' },
            { value: 12, label: '12 meses' },
          ]}
          selected={count}
          onSelect={onCount}
        />
        {historyIncomplete ? (
          <>
            <ReportNotice>Faltan meses por cargar. Los datos disponibles siguen visibles.</ReportNotice>
            <Button variant="ghost" size="compact" onPress={onRetryHistory}>
              Reintentar historial
            </Button>
          </>
        ) : null}
        <ReportTrend
          key={`${currency}-${period.year}-${period.month}-${count}`}
          points={points}
          currency={currency}
          hidden={hidden}
        />
      </ReportPanel>
      <Button
        variant="secondary"
        onPress={() => router.push({ pathname: '/(app)/transactions', params: period })}
      >
        Ver movimientos de este mes
      </Button>
    </>
  );
}

function Comparison({
  label,
  current,
  previous,
  currency,
  hidden,
}: {
  label: string;
  current: number;
  previous?: number;
  currency: string;
  hidden: boolean;
}) {
  const change = comparisonPercent(current, previous);
  const description =
    previous === undefined
      ? 'Mes anterior no disponible'
      : hidden
        ? 'Comparación oculta'
        : change === undefined
          ? previous === 0
            ? 'Sin base de comparación: el mes anterior fue cero'
            : 'Hay ajustes; compara los importes'
          : change === 0
            ? 'Sin cambios'
            : `${Math.abs(change).toLocaleString('es-CO', { maximumFractionDigits: 1 })}% ${change > 0 ? 'más' : 'menos'} que el mes anterior`;
  return (
    <View style={s.item}>
      <View style={s.between}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.label}>{formatPrivateMoney(current, currency, hidden)}</Text>
      </View>
      <Text style={s.caption}>{description}</Text>
      {previous !== undefined ? (
        <Text style={s.caption}>Antes: {formatPrivateMoney(previous, currency, hidden)}</Text>
      ) : null}
    </View>
  );
}

export function ExpenseBreakdown({
  current,
  previous,
  currency,
  hidden,
}: {
  current: CurrencyMonth;
  previous?: CurrencyMonth;
  currency: string;
  hidden: boolean;
}) {
  const [mode, setMode] = useState<'amount' | 'percentage'>('amount');
  const [selected, setSelected] = useState<string>();
  const [all, setAll] = useState(false);
  const rows = categoryRows(current, previous);
  const hasAdjustments = rows.some((row) => row.amount < 0);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const reconciles = Math.abs(total - current.expense) < 0.02;
  const safeShares = !hasAdjustments && reconciles && current.expense > 0;
  const palette = chartColors();
  const top = rows.filter((row) => row.amount > 0).slice(0, 5);
  const remainder = rows
    .filter((row) => row.amount > 0)
    .slice(5)
    .reduce((sum, row) => sum + row.amount, 0);
  const parts = [
    ...top.map((row, i) => ({ name: row.name, value: row.amount, color: palette[i]! })),
    ...(remainder > 0 ? [{ name: 'Otras categorías', value: remainder, color: palette[5]! }] : []),
  ];
  const selectedPart = parts.findIndex((part) => part.name === selected);
  const detail = rows.find((row) => row.name === selected);
  const money = (value: number) => formatPrivateMoney(value, currency, hidden);
  return (
    <>
      <ReportPanel
        title="¿En qué gastaste?"
        subtitle="Cada categoría tiene su lugar. Toca una para comparar."
        icon="pie-chart-outline"
      >
        {rows.length ? (
          <>
            {safeShares ? (
              <ReportRing
                parts={parts}
                hidden={hidden}
                title={selectedPart >= 0 ? parts[selectedPart]!.name : 'Total de gastos'}
                value={money(selectedPart >= 0 ? parts[selectedPart]!.value : current.expense)}
                selected={selectedPart >= 0 ? selectedPart : undefined}
                onSelect={(index) => {
                  setSelected(parts[index]!.name === selected ? undefined : parts[index]!.name);
                  if (index === 5) setAll(true);
                }}
              />
            ) : (
              <>
                <Text style={s.value}>{money(current.expense)}</Text>
                <ReportNotice>
                  {hasAdjustments
                    ? 'Hay reversiones o ajustes que reducen gastos. Los mostramos con su signo; no se representan como porciones de una torta.'
                    : 'El desglose no coincide con el total informado. Mostramos los importes sin calcular porcentajes.'}
                </ReportNotice>
              </>
            )}
            {safeShares ? (
              <ReportChoice
                label="Mostrar categorías en"
                choices={[
                  { value: 'amount' as const, label: 'Importes' },
                  { value: 'percentage' as const, label: 'Porcentajes' },
                ]}
                selected={mode}
                onSelect={setMode}
              />
            ) : null}
            {(all ? rows : rows.slice(0, 5)).map((row, index) => (
              <MotionPressable
                key={row.name}
                accessibilityRole="button"
                accessibilityLabel={`Comparar categoría ${row.name}`}
                accessibilityState={{ selected: selected === row.name }}
                onPress={() => setSelected(selected === row.name ? undefined : row.name)}
                style={s.item}
              >
                <View style={s.between}>
                  <View style={[s.row, { flex: 1 }]}>
                    <View style={[s.dot, { backgroundColor: palette[Math.min(index, 5)] }]} />
                    <Text style={[s.label, { flex: 1 }]}>{row.name}</Text>
                  </View>
                  <Text style={s.label}>
                    {mode === 'percentage' && safeShares
                      ? hidden
                        ? '•••'
                        : `${row.percentage?.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
                      : money(row.amount)}
                  </Text>
                </View>
                {safeShares && !hidden ? (
                  <Progress
                    value={row.percentage ?? 0}
                    label={row.name}
                    color={palette[Math.min(index, 5)]}
                  />
                ) : null}
                {selected === row.name ? (
                  <View style={s.note}>
                    <Text style={s.caption}>
                      Mes anterior: {row.previous === undefined ? 'No disponible' : money(row.previous)}
                    </Text>
                    <Text style={s.caption}>
                      {money(row.amount)} en este mes.{' '}
                      {row.previous === 0 ? 'Esta categoría no tenía gastos en el mes anterior.' : ''}
                    </Text>
                  </View>
                ) : null}
              </MotionPressable>
            ))}
            {rows.length > 5 ? (
              <Button variant="ghost" size="compact" onPress={() => setAll(!all)}>
                {all ? 'Mostrar principales' : `Ver las ${rows.length} categorías`}
              </Button>
            ) : null}
            {selectedPart >= 0 && !detail ? (
              <Text style={s.caption}>
                Otras categorías reúne las que siguen a las cinco principales. Abajo puedes revisar cada una.
              </Text>
            ) : null}
            <View style={s.between}>
              <Text style={s.label}>Total del mes</Text>
              <Text style={s.amount}>{money(current.expense)}</Text>
            </View>
          </>
        ) : (
          <ReportEmpty title="Sin gastos en este mes">
            Cuando registres un gasto en {currency}, verás aquí su categoría y cuánto representa.
          </ReportEmpty>
        )}
      </ReportPanel>
      <Card style={s.panel}>
        <Text style={s.label}>¿Por qué puede aparecer un ajuste?</Text>
        <Text style={s.caption}>
          Si reviertes un gasto de otro mes, la corrección cuenta en la fecha de la reversión. Por eso un
          importe puede ser negativo.
        </Text>
      </Card>
    </>
  );
}
