import { Text, View, Switch } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useHomeUpcoming } from './use-home-upcoming';
import { getUpcomingRecurringEntries } from '@/features/recurrences/recurrence-api';
import { deviceTimeZone } from '@/features/recurrences/recurrence-presentation';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatLocalDate } from '@/utils/local-date';
import { Card, Button } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';
import { SettingsRow } from '@/ui/settings-row';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, spacing, typography } from '@/theme';

export function HomeUpcoming({ userId }: { userId?: number }) {
  const preference = useHomeUpcoming(userId);
  const { hidden } = usePrivacy();
  const zone = deviceTimeZone();
  const query = useQuery({
    queryKey: ['recurrences', 'upcoming', userId, zone],
    queryFn: () => getUpcomingRecurringEntries(zone),
    enabled: preference.ready && preference.visible,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
  if (!preference.ready || !preference.visible || (query.isSuccess && query.data.total === 0)) return null;
  const openAgenda = (date: string) =>
    router.push({
      pathname: '/(app)/recurrences',
      params: {
        agendaYear: date.slice(0, 4),
        agendaMonth: String(Number(date.slice(5, 7))),
        agendaEntry: String(Date.now()),
      },
    });
  return (
    <Card style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text style={typography.cardTitle}>Próximos 7 días</Text>
      <Text style={typography.caption}>
        Ingresos y gastos fijos previstos. Aún no forman parte del saldo registrado.
      </Text>
      {query.isPending ? (
        <Text style={typography.caption}>Consultando tus fechas…</Text>
      ) : query.isError && !query.data ? (
        <Button size="compact" variant="ghost" onPress={() => void query.refetch()}>
          No pudimos consultar. Reintentar
        </Button>
      ) : query.data ? (
        <>
          {query.isError && (
            <Text style={typography.caption}>Pendiente de actualizar. Toca la agenda para revisar.</Text>
          )}
          {query.data.entries.map((entry) => (
            <MotionPressable
              key={`${entry.ruleId}-${entry.dueDate}`}
              accessibilityRole="button"
              accessibilityLabel={`${entry.name}, ${formatLocalDate(entry.dueDate)}. Abrir agenda`}
              onPress={() => openAgenda(entry.dueDate)}
              style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', minHeight: 52 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={typography.label}>{entry.name}</Text>
                <Text style={typography.caption}>
                  {formatLocalDate(entry.dueDate, 'compact')} ·{' '}
                  {entry.kind === 'INCOME' ? 'Ingreso' : 'Gasto'}
                  {entry.status === 'PENDING' ? ' · Por revisar' : ''}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.label,
                  maxWidth: '48%',
                  color: entry.kind === 'INCOME' ? colors.success : colors.textPrimary,
                }}
              >
                {formatPrivateMoney(entry.amount, entry.currency, hidden)}
              </Text>
            </MotionPressable>
          ))}
          <Button size="compact" variant="ghost" onPress={() => openAgenda(query.data.from)}>
            Ver agenda{query.data.total > 3 ? ` · ${query.data.total} previstos` : ''}
          </Button>
        </>
      ) : null}
    </Card>
  );
}

export function HomeUpcomingSettings({ userId }: { userId?: number }) {
  const preference = useHomeUpcoming(userId);
  const feedback = useFeedback();
  return (
    <SettingsRow
      icon="calendar-outline"
      title="Próximos pagos en Inicio"
      subtitle="Muestra hasta tres ingresos o gastos fijos de los próximos siete días."
      control={
        preference.error ? (
          <Button size="compact" variant="ghost" onPress={() => void preference.retry()}>
            Reintentar
          </Button>
        ) : (
          <Switch
            accessibilityLabel="Mostrar próximos pagos en Inicio"
            value={preference.visible}
            disabled={!preference.ready || preference.saving}
            trackColor={{ false: colors.border, true: colors.primaryStrong }}
            thumbColor={preference.visible ? colors.primary : colors.textMuted}
            onValueChange={(visible) =>
              void preference
                .change(visible)
                .catch(() => feedback.show('No pudimos guardar tu preferencia. Inténtalo de nuevo.', 'error'))
            }
          />
        )
      }
    />
  );
}
