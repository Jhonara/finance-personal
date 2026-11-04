import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { api } from '@/auth/auth-provider';
import type { operations } from '@/api/generated/schema';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatLocalDate } from '@/utils/local-date';
import { Button } from '@/ui/primitives';
import { colors } from '@/theme';
import { ReportPeriodPicker } from './report-period-picker';
import { reportStyles as s } from './report-ui';

type History = operations['getAccountBalanceHistory']['responses'][200]['content']['*/*'];
type Point = { date: string; balance: number; movement: number };

export function AccountBalanceHistory({ accountId, hidden }: { accountId: number; hidden: boolean }) {
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const [selected, setSelected] = useState<string>();
  const query = useQuery({
    queryKey: ['reports', 'account-history', accountId, period.year, period.month],
    enabled: !hidden,
    queryFn: async ({ signal }) =>
      (await api.get<History>(`/reports/accounts/${accountId}/history`, { params: period, signal })).data,
  });
  const points = (query.data?.points ?? []).filter(
    (entry): entry is Point =>
      typeof entry.date === 'string' &&
      typeof entry.balance === 'number' &&
      typeof entry.movement === 'number',
  );
  const found = points.findIndex((point) => point.date === selected);
  const index = found < 0 ? points.length - 1 : found;
  const point = points[index];
  const money = (amount: number) => formatPrivateMoney(amount, query.data?.currency ?? '', hidden);
  const min = Math.min(...points.map((entry) => entry.balance));
  const max = Math.max(...points.map((entry) => entry.balance));
  const x = (entry: Point) => 10 + ((Number(entry.date.slice(-2)) - 1) / 30) * 300;
  const y = (entry: Point) => (min === max ? 60 : 110 - ((entry.balance - min) / (max - min)) * 100);
  if (hidden) return <Text style={s.caption}>Evolución oculta mientras ocultas tus importes.</Text>;
  return (
    <View style={s.stack}>
      <ReportPeriodPicker
        period={period}
        onChange={(next) => {
          setPeriod(next);
          setSelected(undefined);
        }}
      />
      {query.isPending ? (
        <Text style={s.caption}>Consultando asientos…</Text>
      ) : query.isError ? (
        <Button variant="secondary" onPress={() => void query.refetch()}>
          Reintentar evolución
        </Button>
      ) : (
        <>
          {query.data.openingBalance != null && (
            <Text style={s.caption}>Saldo antes del mes · {money(query.data.openingBalance)}</Text>
          )}
          {!point ? (
            <Text style={s.caption}>No hay días con movimientos registrados en este período.</Text>
          ) : (
            <>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ backgroundColor: colors.heroStart, borderRadius: 18, padding: 12 }}
              >
                <Svg width="100%" height={156} viewBox="0 0 320 120">
                  <Line x1={x(point)} x2={x(point)} y1={8} y2={112} stroke="#91B7AC" />
                  <Polyline
                    points={points
                      .flatMap((entry, index) =>
                        index === 0
                          ? [[x(entry), y(entry)]]
                          : [
                              [x(entry), y(points[index - 1]!)],
                              [x(entry), y(entry)],
                            ],
                      )
                      .join(' ')}
                    fill="none"
                    stroke="#94E2C6"
                    strokeWidth={3}
                  />
                  <Circle cx={x(point)} cy={y(point)} r={5} fill="#D9F3BB" />
                  {points.map((entry) => (
                    <Circle
                      key={entry.date}
                      cx={x(entry)}
                      cy={y(entry)}
                      r={12}
                      fill="transparent"
                      onPress={() => setSelected(entry.date)}
                    />
                  ))}
                </Svg>
              </View>
              <Text style={s.caption}>Saldo al cierre de cada día con movimientos. Escala del período.</Text>
              <View accessibilityLiveRegion="polite">
                <Text style={s.label}>
                  {formatLocalDate(point.date)} · {money(point.balance)}
                </Text>
                <Text style={s.caption}>Variación del día · {money(point.movement)}</Text>
              </View>
              <View style={s.chips}>
                <Button
                  variant="secondary"
                  disabled={index <= 0}
                  onPress={() => setSelected(points[index - 1]?.date)}
                >
                  Día anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={index >= points.length - 1}
                  onPress={() => setSelected(points[index + 1]?.date)}
                >
                  Día siguiente
                </Button>
              </View>
              <Button
                variant="ghost"
                onPress={() =>
                  router.push({
                    pathname: '/(app)/transactions',
                    params: { from: point.date, to: point.date, accountId },
                  })
                }
              >
                Ver movimientos de la cuenta ese día
              </Button>
            </>
          )}
        </>
      )}
    </View>
  );
}
