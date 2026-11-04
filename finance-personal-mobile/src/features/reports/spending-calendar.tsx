import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { Button } from '@/ui/primitives';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { ReportPanel, reportStyles as s } from './report-ui';

const weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function SpendingCalendar({
  period,
  days,
  currency,
  hidden,
}: {
  period: DashboardPeriod;
  days: Record<string, number>;
  currency: string;
  hidden: boolean;
}) {
  const [selected, select] = useState<number>();
  const prefix = `${period.year}-${String(period.month).padStart(2, '0')}-`;
  const dateKey = (day: number) => prefix + String(day).padStart(2, '0');
  const count = new Date(period.year, period.month, 0).getDate();
  const offset = (new Date(period.year, period.month - 1, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((count + offset) / 7) * 7 }, (_, i) => i - offset + 1);
  const peak = Math.max(0, ...Object.values(days));
  const money = (amount: number) => formatPrivateMoney(amount, currency, hidden);
  const hasRecords = Object.keys(days).length > 0;
  return (
    <ReportPanel
      title="Calendario de gastos"
      subtitle="Selecciona un día para explicar su gasto neto."
      icon="calendar-outline"
    >
      {hidden ? (
        <Text style={s.caption}>Calendario oculto mientras ocultas tus importes.</Text>
      ) : !hasRecords ? (
        <Text style={s.caption}>No hay gastos ni reversos de gasto en esta moneda durante el mes.</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            {weekdays.map((label) => (
              <Text key={label} style={[s.caption, { flex: 1, textAlign: 'center' }]}>
                {label}
              </Text>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row', gap: 3 }}>
              {cells.slice(row * 7, row * 7 + 7).map((day) => {
                if (day < 1 || day > count) return <View key={day} style={{ flex: 1 }} />;
                const value = days[dateKey(day)];
                const active = selected === day;
                const intensity = value && value > 0 ? Math.ceil((value / peak) * 4) : 0;
                return (
                  <MotionPressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Día ${day}: ${value === undefined ? 'sin registros' : money(value)}`}
                    onPress={() => select(day)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: radius.small,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? colors.primary : colors.divider,
                      backgroundColor:
                        value !== undefined && value < 0 ? colors.infoSoft : colors.surfaceSecondary,
                    }}
                  >
                    {intensity > 0 && (
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: radius.small,
                          backgroundColor: colors.expense,
                          opacity: intensity * 0.085,
                        }}
                      />
                    )}
                    <Text style={s.caption}>{day}</Text>
                    <View
                      style={{ height: 3, width: `${intensity * 20}%`, backgroundColor: colors.expense }}
                    />
                  </MotionPressable>
                );
              })}
            </View>
          ))}
          <Text style={s.caption}>
            Más intensidad y una marca más larga indican mayor gasto. Azul: los reversos superan los gastos
            del día.
          </Text>
          {selected !== undefined && (
            <>
              <Text accessibilityLiveRegion="polite" style={s.label}>
                Día {selected} ·{' '}
                {days[dateKey(selected)] === undefined ? 'Sin registros' : money(days[dateKey(selected)]!)}
              </Text>
              {days[dateKey(selected)] !== undefined && (
                <Button
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/report-transactions',
                      params: { ...period, currency, type: 'EXPENSE', day: selected },
                    })
                  }
                >
                  Ver movimientos del día
                </Button>
              )}
            </>
          )}
        </>
      )}
    </ReportPanel>
  );
}
