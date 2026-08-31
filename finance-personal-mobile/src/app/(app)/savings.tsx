import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useSavings } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
export default function SavingsScreen() {
  const q = useSavings();
  const { hidden } = usePrivacy();
  if (q.isPending)
    return (
      <Screen>
        <ScreenHeader title="Ahorros" />
        <SkeletonRow />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <ScreenHeader title="Ahorros" />
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  return (
    <Screen scroll refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ScreenHeader title="Ahorros" back onBack={() => router.back()} />
      {q.data.length ? (
        q.data.map((x) => (
          <Pressable
            key={x.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/(app)/saving-detail', params: { id: String(x.id) } })}
          >
            <Card>
              <Text>{x.name ?? 'Meta de ahorro'}</Text>
              <Text>
                {formatPrivateMoney(x.currentAmount ?? 0, 'COP', hidden)} de{' '}
                {formatPrivateMoney(x.targetAmount ?? 0, 'COP', hidden)}
              </Text>
              <Text>
                {Math.round(x.progress ?? 0)}% · {x.completed ? 'Completada' : 'En progreso'}
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="Aún no tienes metas de ahorro"
          description="Crea una meta para organizar tus objetivos."
          actionLabel="Crear meta"
          onAction={() => router.push('/(app)/saving-form')}
        />
      )}
      <Button onPress={() => router.push('/(app)/saving-form')}>Crear meta</Button>
    </Screen>
  );
}
