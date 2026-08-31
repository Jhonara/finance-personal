import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useCredits } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
const label: Record<string, string> = { ACTIVE: 'Al día', PAID: 'Pagado', LATE: 'Atrasado' };
export default function CreditsScreen() {
  const q = useCredits();
  const { hidden } = usePrivacy();
  if (q.isPending)
    return (
      <Screen>
        <ScreenHeader title="Créditos" />
        <SkeletonRow />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <ScreenHeader title="Créditos" />
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  return (
    <Screen scroll refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ScreenHeader title="Créditos" back onBack={() => router.back()} />
      {q.data.length ? (
        q.data.map((x) => (
          <Pressable
            key={x.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/(app)/credit-detail', params: { id: String(x.id) } })}
          >
            <Card>
              <Text>{x.name ?? 'Crédito'}</Text>
              <Text>{formatPrivateMoney(x.remainingBalance ?? 0, x.currency ?? 'COP', hidden)}</Text>
              <Text>
                {label[x.status ?? ''] ?? 'Estado pendiente'} · Tasa efectiva anual (EA) {x.annualRate ?? 0}%
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="Aún no tienes créditos"
          description="Registra tus créditos para tener una visión completa."
          actionLabel="Crear crédito"
          onAction={() => router.push('/(app)/credit-form')}
        />
      )}
      <Button onPress={() => router.push('/(app)/credit-form')}>Crear crédito</Button>
    </Screen>
  );
}
